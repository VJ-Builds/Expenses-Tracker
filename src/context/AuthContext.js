import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Linking, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { syncDown, syncUp } from '../utils/syncManager';
import { getDb } from '../db/schema';
import { getUserByEmail, setUserVerified } from '../db/queries';

const AuthContext = createContext(null);
const AUTH_KEY = '@expenses_user_local'; // keep local profile cached
const LAST_SYNC_KEY = '@expenses_last_sync_at';
const PENDING_AUTH_KEY = '@expenses_pending_auth';

const sanitizeUserData = (data) => {
  if (!data) return null;
  return {
    id: Number(data.id),
    email: String(data.email || ''),
    username: String(data.username || ''),
    is_verified: data.is_verified ? 1 : 0,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, email, username, is_verified }
  const [loading, setLoading] = useState(true);
  // Track when login() is handling the flow so the auth listener doesn't race
  const loginInProgress = useRef(false);

  // Initialize Auth
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Try to load local cached user for fast offline startup
        const storedUser = await AsyncStorage.getItem(AUTH_KEY);
        if (storedUser) {
          setUser(sanitizeUserData(JSON.parse(storedUser)));
        }

        // 2. Check Supabase session (handles token refresh automatically)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          const localUser = await ensureLocalUser(session.user);
          if (localUser) {
            setUser(localUser);
          }
        } else if (!session && mounted) {
          // If there was no stored user either, reset
          if (!storedUser) {
            setUser(null);
            await AsyncStorage.removeItem(AUTH_KEY);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for Auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip if login() is handling the flow to avoid race conditions
      if (loginInProgress.current) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        const localUser = await ensureLocalUser(session.user);
        if (localUser) {
          setUser(localUser);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        await AsyncStorage.removeItem(AUTH_KEY);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Listen for verification deep links (e.g. from GitHub Pages confirmation)
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event?.url;
      if (!url) return;

      try {
        const hashIdx = url.indexOf('#');
        const queryIdx = url.indexOf('?');
        const tokenString = hashIdx !== -1 ? url.substring(hashIdx + 1) : (queryIdx !== -1 ? url.substring(queryIdx + 1) : '');

        if (tokenString) {
          const params = new URLSearchParams(tokenString);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (data?.session?.user) {
              await markUserVerified(data.session.user.email);
              Alert.alert('Email Verified! 🎉', 'Your email is confirmed and cloud sync is now active!');
            }
          }
        }
      } catch (e) {
        console.log('Error handling deep link in AuthContext:', e);
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => { if (url) handleDeepLink({ url }); });

    return () => {
      sub?.remove();
    };
  }, [user]);

  // Helper to ensure Supabase user exists in local SQLite (does NOT call setUser)
  const ensureLocalUser = async (supabaseUser) => {
    try {
      const email = supabaseUser.email.toLowerCase().trim();
      let localUser = getUserByEmail(email);
      const isConfirmed = Boolean(supabaseUser.email_confirmed_at);
      const db = getDb();

      if (!localUser) {
        // Check if there is an existing single offline user who has data
        const existingUsers = db.getAllSync('SELECT * FROM users ORDER BY id ASC');
        if (existingUsers.length === 1 && existingUsers[0].password_hash !== 'supabase_auth') {
          const offlineUser = existingUsers[0];
          db.runSync(
            'UPDATE users SET email = ?, password_hash = ?, is_verified = ? WHERE id = ?',
            [email, 'supabase_auth', isConfirmed ? 1 : 0, offlineUser.id]
          );
          localUser = {
            id: offlineUser.id,
            email,
            username: offlineUser.username || supabaseUser.user_metadata?.username || email.split('@')[0],
            is_verified: isConfirmed ? 1 : 0,
          };
        } else {
          // First time logging in on this device. Create local user shell.
          const username = supabaseUser.user_metadata?.username || email.split('@')[0];
          const result = db.runSync(
            'INSERT INTO users (email, username, password_hash, is_verified) VALUES (?, ?, ?, ?)',
            [email, username, 'supabase_auth', isConfirmed ? 1 : 0]
          );
          localUser = { id: result.lastInsertRowId, email, username, is_verified: isConfirmed ? 1 : 0 };
        }
      } else if (isConfirmed && !localUser.is_verified) {
        db.runSync('UPDATE users SET is_verified = 1 WHERE id = ?', [localUser.id]);
        localUser.is_verified = 1;
      }

      const cleanUser = sanitizeUserData(localUser);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(cleanUser));
      return cleanUser;
    } catch (err) {
      console.error('Error ensuring local user:', err);
      return null;
    }
  };

  const login = async (email, password) => {
    loginInProgress.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // 1. Ensure local SQLite user exists
      const localUser = await ensureLocalUser(data.session.user);
      
      if (localUser) {
        // 2. Clear the last-sync timestamp to force a fresh pull from cloud
        await AsyncStorage.removeItem(LAST_SYNC_KEY);
        
        // 3. Pull the latest cloud data into SQLite BEFORE setting user state
        const downRes = await syncDown(localUser).catch(err => console.log('Sync-down on login failed:', err));
        
        // If cloud had no data yet, push local data immediately
        if (downRes?.message === 'No cloud data to sync') {
          await syncUp(localUser).catch(err => console.log('Initial sync-up on login failed:', err));
        }

        // 4. Re-read the local user in case syncDown updated their budget
        const refreshedUser = getUserByEmail(localUser.email);
        const finalUser = sanitizeUserData(refreshedUser || localUser);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(finalUser));
        
        // 5. NOW set user state → Dashboard mounts → reads fresh SQLite data
        setUser(finalUser);
      }
      
      return data;
    } finally {
      loginInProgress.current = false;
    }
  };

  const loginLocally = async (localUser) => {
    const cleanUser = sanitizeUserData(localUser);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(cleanUser));
    setUser(cleanUser);
    return cleanUser;
  };

  // Listen for app coming to foreground (e.g. user returns from Gmail)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active' && user && !user.is_verified) {
        await checkVerificationStatus(false);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [user]);

  const checkVerificationStatus = async (manual = false, promptPassword = null) => {
    if (!user) return { verified: false };
    if (user.is_verified) return { verified: true };

    try {
      // 1. Check if Supabase already has an active session for this user
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        await AsyncStorage.removeItem(PENDING_AUTH_KEY);
        await ensureLocalUser(session.user);
        await markUserVerified(session.user.email);
        return { verified: true };
      }

      // 2. Try signing in with cached pending credentials or provided password
      let passwordToTry = promptPassword;

      if (!passwordToTry) {
        const pendingRaw = await AsyncStorage.getItem(PENDING_AUTH_KEY);
        if (pendingRaw) {
          try {
            const creds = JSON.parse(pendingRaw);
            if (creds.email.toLowerCase().trim() === user.email.toLowerCase().trim()) {
              passwordToTry = creds.password;
            }
          } catch (e) {}
        }
      }

      if (passwordToTry) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: passwordToTry,
        });

        if (!error && data?.session?.user) {
          await AsyncStorage.removeItem(PENDING_AUTH_KEY);
          await ensureLocalUser(data.session.user);
          await markUserVerified(user.email);
          return { verified: true };
        }

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('not confirmed') || msg.includes('email not confirmed')) {
            return { verified: false, pending: true, message: 'Email has not been confirmed yet in Gmail.' };
          }
          return { verified: false, error: error.message };
        }
      } else {
        // No password cached and none passed (e.g. user registered prior to caching)
        return { verified: false, needsPassword: true };
      }
    } catch (err) {
      console.log('checkVerificationStatus exception:', err);
      return { verified: false, error: err?.message };
    }

    return { verified: false };
  };

  const register = async (email, password, username) => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    // Cache credentials for automatic silent verification check when user returns from Gmail
    await AsyncStorage.setItem(PENDING_AUTH_KEY, JSON.stringify({ email: cleanEmail, password }));

    // 1. Register with Supabase (sends confirmation email with verification link)
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { username: cleanUsername },
        emailRedirectTo: 'https://vijaypal-7.github.io/Expenses-Tracker/',
      }
    });
    if (error) throw error;

    const isConfirmed = Boolean(data?.session?.user?.email_confirmed_at);

    // 2. Create or ensure local SQLite user immediately so the user can start using the app without delay
    const db = getDb();
    let localUser = getUserByEmail(cleanEmail);

    if (!localUser) {
      const existingUsers = db.getAllSync('SELECT * FROM users ORDER BY id ASC');
      if (existingUsers.length === 1 && existingUsers[0].password_hash !== 'supabase_auth') {
        const offlineUser = existingUsers[0];
        db.runSync(
          'UPDATE users SET email = ?, username = ?, password_hash = ?, is_verified = ? WHERE id = ?',
          [cleanEmail, cleanUsername, 'supabase_auth', isConfirmed ? 1 : 0, offlineUser.id]
        );
        localUser = {
          id: offlineUser.id,
          email: cleanEmail,
          username: cleanUsername,
          is_verified: isConfirmed ? 1 : 0,
        };
      } else {
        const result = db.runSync(
          'INSERT INTO users (email, username, password_hash, is_verified) VALUES (?, ?, ?, ?)',
          [cleanEmail, cleanUsername, 'supabase_auth', isConfirmed ? 1 : 0]
        );
        localUser = {
          id: result.lastInsertRowId,
          email: cleanEmail,
          username: cleanUsername,
          is_verified: isConfirmed ? 1 : 0,
        };
      }
    } else {
      db.runSync(
        'UPDATE users SET username = ?, password_hash = ?, is_verified = ? WHERE id = ?',
        [cleanUsername, 'supabase_auth', isConfirmed ? 1 : 0, localUser.id]
      );
      localUser.username = cleanUsername;
      localUser.is_verified = isConfirmed ? 1 : 0;
    }

    const cleanUser = sanitizeUserData(localUser);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(cleanUser));

    // 3. Immediately log the user in locally so they land on Dashboard right away!
    setUser(cleanUser);

    return { ...data, localUser: cleanUser };
  };

  const markUserVerified = async (targetEmail) => {
    const emailToVerify = (targetEmail || user?.email || '').toLowerCase().trim();
    if (!emailToVerify) return;
    const db = getDb();
    let localUser = getUserByEmail(emailToVerify);
    if (localUser) {
      db.runSync('UPDATE users SET is_verified = 1 WHERE id = ?', [localUser.id]);
      localUser.is_verified = 1;
      const cleanUser = sanitizeUserData(localUser);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(cleanUser));
      setUser(cleanUser);
      syncUp(cleanUser).catch(e => console.log('Post-verify sync error:', e));
    }
  };

  const resendVerification = async (targetEmail) => {
    const emailToResend = (targetEmail || user?.email || '').toLowerCase().trim();
    if (!emailToResend) throw new Error('No email provided.');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailToResend,
      options: {
        emailRedirectTo: 'https://vijaypal-7.github.io/Expenses-Tracker/',
      },
    });
    if (error) throw error;
    return true;
  };

  const logout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Signout error:', error);
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    await AsyncStorage.removeItem(PENDING_AUTH_KEY);
    setLoading(false);
  };

  const updateBudget = async () => {};

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginLocally,
      register,
      logout,
      updateBudget,
      resendVerification,
      markUserVerified,
      checkVerificationStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
