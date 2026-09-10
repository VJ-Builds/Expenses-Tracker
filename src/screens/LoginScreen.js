import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getUserByEmail } from '../db/queries';
import { useAuth } from '../context/AuthContext';
import { verifyPassword } from '../utils/authHelpers';

import { supabase } from '../config/supabase';

export default function LoginScreen({ navigation, route }) {
  const { login, loginLocally, resendVerification } = useAuth();
  const [email, setEmail]       = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState({});

  const passRef = useRef(null);

  useEffect(() => {
    if (route?.params?.email) {
      setEmail(route.params.email);
    }
  }, [route?.params?.email]);

  const validate = () => {
    const e = {};
    if (!email.trim())    e.email    = 'Email is required';
    if (!password.trim()) e.password = 'Password is required';
    if (email && !/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.toLowerCase().trim(), password);
    } catch (err) {
      if (err.message && (err.message.toLowerCase().includes('email not confirmed') || err.message.toLowerCase().includes('not confirmed'))) {
        const cleanEmail = email.toLowerCase().trim();
        const localUser = getUserByEmail(cleanEmail);

        if (localUser) {
          Alert.alert(
            'Verification Pending ✉️',
            'Your email is not verified yet. Would you like to enter the app now with pending status, or resend the confirmation link?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Resend Link',
                onPress: async () => {
                  try {
                    await resendVerification(cleanEmail);
                    Alert.alert('Email Sent! ✉️', 'A fresh confirmation link has been sent to your email.');
                  } catch (resendErr) {
                    Alert.alert('Notice', resendErr.message || 'Could not resend email.');
                  }
                },
              },
              {
                text: 'Open App',
                onPress: async () => {
                  await loginLocally(localUser);
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Email Verification Required ✉️',
            'Please open your email inbox and tap the confirmation link to activate your account.\n\nNeed a new link?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Resend Link',
                onPress: async () => {
                  try {
                    await resendVerification(cleanEmail);
                    Alert.alert('Email Sent! ✉️', 'A fresh confirmation link has been sent to your email.');
                  } catch (resendErr) {
                    Alert.alert('Notice', resendErr.message || 'Could not resend email.');
                  }
                },
              },
            ]
          );
        }
      } else if (err.message.includes('Invalid login credentials')) {
        setErrors({ email: 'Invalid login credentials' });
      } else {
        Alert.alert('Login Failed', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0F0F1A', '#1A0A2E', '#0F0F1A']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>💸</Text>
            <Text style={styles.logoTitle}>ExpenseIQ</Text>
            <Text style={styles.logoSub}>Smart money, smarter you</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrap, errors.email && styles.inputError]}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus={false}
                returnKeyType="next"
                blurOnSubmit={false}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })); }}
                onSubmitEditing={() => passRef.current?.focus()}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, errors.password && styles.inputError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                ref={passRef}
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPass}
                autoFocus={false}
                returnKeyType="done"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={styles.showPassIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            {/* Login button */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradientPrimary}
                style={styles.loginBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Sign In</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Create one</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:   { flex: 1 },
  flex:       { flex: 1 },
  container:  { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  logoWrap:   { alignItems: 'center', marginBottom: SPACING.xl },
  logoEmoji:  { fontSize: 56 },
  logoTitle:  { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxxl, color: COLORS.textPrimary, marginTop: SPACING.sm },
  logoSub:    { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardTitle:  { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xl, color: COLORS.textPrimary },
  cardSub:    { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg, marginTop: 4 },
  label:      { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: 6, marginTop: SPACING.sm },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    height: 52,
  },
  inputError:    { borderColor: COLORS.danger },
  inputIcon:     { fontSize: 16, marginRight: SPACING.sm },
  input:         { flex: 1, color: COLORS.textPrimary, fontFamily: FONTS.regular, fontSize: FONTS.sizes.md },
  showPassIcon:  { fontSize: 18, paddingHorizontal: 4 },
  errorText:     { color: COLORS.danger, fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, marginTop: 4 },
  loginBtn:      { marginTop: SPACING.lg, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.button },
  loginBtnGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  loginBtnText:     { color: '#fff', fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg },
  registerRow:      { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  registerText:     { color: COLORS.textSecondary, fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm },
  registerLink:     { color: COLORS.primaryLight, fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm },
});
