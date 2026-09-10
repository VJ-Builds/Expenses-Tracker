import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { createUser, getUserByEmail } from '../db/queries';
import { useAuth } from '../context/AuthContext';
import { hashPassword } from '../utils/authHelpers';

// ─── Field component (defined OUTSIDE to prevent re-mounts) ────────────────
const Field = ({ label, icon, value, onChangeText, errorKey, errors, setErrors, inputRef, onSubmitEditing, returnKeyType, ...rest }) => (
  <View>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrap, errors[errorKey] && styles.inputError]}>
      <Text style={styles.inputIcon}>{icon}</Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={(t) => { onChangeText(t); setErrors((e) => ({ ...e, [errorKey]: '' })); }}
        returnKeyType={returnKeyType || 'next'}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
        autoFocus={false}
        {...rest}
      />
    </View>
    {errors[errorKey] ? <Text style={styles.errorText}>{errors[errorKey]}</Text> : null}
  </View>
);

// ─── Screen ────────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState({});

  const emailRef    = useRef(null);
  const passRef     = useRef(null);
  const confirmRef  = useRef(null);

  const validate = () => {
    const e = {};
    if (!username.trim())  e.username = 'Name is required';
    if (!email.trim())     e.email    = 'Email is required';
    if (email && !/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password)         e.password = 'Password is required';
    if (password.length < 6) e.password = 'Minimum 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await register(email.toLowerCase().trim(), password, username.trim());
      // AuthContext will handle local SQLite creation/linking via onAuthStateChange IF it logs in immediately.
      // But if email confirmation is required, session will be null.
      if (!data?.session) {
        Alert.alert(
          'Registration Successful! 🎉', 
          'Please check your email to verify your account before logging in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login', { email: email.toLowerCase().trim() }) }]
        );
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('already registered')) {
        setErrors({ email: 'This email is already registered online. Please log in.' });
      } else {
        Alert.alert('Registration Failed', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0F0F1A', '#1A0A2E', '#0F0F1A']} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>💸</Text>
            <Text style={styles.logoTitle}>ExpenseIQ</Text>
            <Text style={styles.logoSub}>Track every rupee, every day</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSub}>Start tracking your expenses today</Text>

            {/* Full Name */}
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrap, errors.username && styles.inputError]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                autoFocus={false}
                returnKeyType="next"
                blurOnSubmit={false}
                value={username}
                onChangeText={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: '' })); }}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrap, errors.email && styles.inputError]}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                ref={emailRef}
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
                placeholder="Min. 6 characters"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPass}
                autoFocus={false}
                returnKeyType="next"
                blurOnSubmit={false}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={styles.showPassIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrap, errors.confirm && styles.inputError]}>
              <Text style={styles.inputIcon}>🔑</Text>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPass}
                autoFocus={false}
                returnKeyType="done"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setErrors((e) => ({ ...e, confirm: '' })); }}
                onSubmitEditing={handleRegister}
              />
            </View>
            {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}

            <TouchableOpacity
              style={styles.btn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={COLORS.gradientPrimary}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Create Account</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign in</Text>
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
  logoEmoji:  { fontSize: 52 },
  logoTitle:  { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxl, color: COLORS.textPrimary, marginTop: SPACING.sm },
  logoSub:    { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardTitle:  { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xl, color: COLORS.textPrimary },
  cardSub:    { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.md, marginTop: 4 },
  label:      { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: 6, marginTop: SPACING.sm },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm, height: 52,
  },
  inputError:    { borderColor: COLORS.danger },
  inputIcon:     { fontSize: 16, marginRight: SPACING.sm },
  input:         { flex: 1, color: COLORS.textPrimary, fontFamily: FONTS.regular, fontSize: FONTS.sizes.md },
  showPassIcon:  { fontSize: 18, paddingHorizontal: 4 },
  errorText:     { color: COLORS.danger, fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, marginTop: 4 },
  btn:           { marginTop: SPACING.lg, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.button },
  btnGradient:   { height: 54, alignItems: 'center', justifyContent: 'center' },
  btnText:       { color: '#fff', fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg },
  loginRow:      { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  loginText:     { color: COLORS.textSecondary, fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm },
  loginLink:     { color: COLORS.primaryLight, fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm },
});
