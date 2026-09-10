import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { syncDown, syncUp } from '../utils/syncManager';
import { getDb } from '../db/schema';
import { getUserByEmail } from '../db/queries';

const AuthContext = createContext(null);
const AUTH_KEY = '@expenses_user_local'; // keep local profile cached
const LAST_SYNC_KEY = '@expenses_last_sync_at';

const sanitizeUserData = (data) => {
  if (!data) return null;
  return {
    id: Number(data.id),
    email: String(data.email || ''),
    username: String(data.username || ''),
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, email, username }
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
          setUser(null);
          await AsyncStorage.removeItem(AUTH_KEY);
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

  // Helper to ensure Supabase user exists in local SQLite (does NOT call setUser)
  const ensureLocalUser = async (supabaseUser) => {
    try {
      const email = supabaseUser.email.toLowerCase().trim();
      let localUser = getUserByEmail(email);

      if (!localUser) {
        const db = getDb();
        // Check if there is an existing single offline user who has data
        const existingUsers = db.getAllSync('SELECT * FROM users ORDER BY id ASC');
        if (existingUsers.length === 1 && existingUsers[0].password_hash !== 'supabase_auth') {
          const offlineUser = existingUsers[0];
          db.runSync(
            'UPDATE users SET email = ?, password_hash = ? WHERE id = ?',
            [email, 'supabase_auth', offlineUser.id]
          );
          localUser = {
            id: offlineUser.id,
            email,
            username: offlineUser.username || supabaseUser.user_metadata?.username || email.split('@')[0],
          };
        } else {
          // First time logging in on this device. Create local user shell.
          const username = supabaseUser.user_metadata?.username || email.split('@')[0];
          const result = db.runSync(
            'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
            [email, username, 'supabase_auth']
          );
          localUser = { id: result.lastInsertRowId, email, username };
        }
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
        //    This ensures Dashboard will mount with fresh data already in the DB
        const downRes = await syncDown(localUser).catch(err => console.log('Sync-down on login failed:', err));
        
        // If cloud had no data yet (brand new account / test wiped), push local data immediately
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

  const register = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: 'https://vijaypal-7.github.io/Expenses-Tracker/',
      }
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Signout error:', error);
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    setLoading(false);
  };

  const updateBudget = async () => {};

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateBudget }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
