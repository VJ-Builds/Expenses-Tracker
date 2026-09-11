import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  PieChart, BarChart2, Tag, CreditCard, HardDrive, Cloud,
  Download, Settings, HelpCircle, Info, LogOut, ChevronRight, Calendar, Bell
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { FONTS, SHADOWS, RADIUS } from '../constants/theme';
import { exportUserDataBackup, importUserDataBackup } from '../utils/backupHelpers';
import { syncUp, syncDown } from '../utils/syncManager';
import { getDb } from '../db/schema';
import { useFocusEffect } from '@react-navigation/native';
import { useState, useCallback } from 'react';

const BRAND_PURPLE = '#FF6B6B'; // Sunset Horizon Primary
const BG_APP = '#F7F8FA';
const TEXT_DARK = '#1C1C28';
const TEXT_MUTED = '#8F92A1';

const MenuRow = ({ icon: Icon, iconColor, label, onPress, rightElement }) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconWrap, { backgroundColor: iconColor + '18' }]}>
      <Icon stroke={iconColor} size={20} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    <View style={styles.menuRight}>
      {rightElement || <ChevronRight stroke={TEXT_MUTED} size={18} />}
    </View>
  </TouchableOpacity>
);

export default function MenuScreen() {
  const { user, logout, resendVerification, checkVerificationStatus } = useAuth();
  const navigation = useNavigation();
  const [syncing, setSyncing] = useState(false);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [expenseCount, setExpenseCount] = useState(0);

  const initials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : 'JD';

  const handleResendVerification = async () => {
    if (resending || !user?.email) return;
    setResending(true);
    try {
      await resendVerification(user.email);
      Alert.alert('Verification Email Sent! ✉️', `A fresh confirmation link has been sent to ${user.email}.`);
    } catch (e) {
      Alert.alert('Notice', e.message || 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await checkVerificationStatus(true);
      if (res.verified) {
        Alert.alert('Email Verified! 🎉', 'Your account is verified and data has been synced to cloud.');
      } else if (res.pending) {
        Alert.alert('Verification Pending ✉️', `The verification link sent to ${user?.email} has not been clicked yet. Please click the link in your email and tap Check again.`);
      } else if (res.needsPassword) {
        Alert.alert(
          'Connect Cloud Sync',
          'Please pull down to refresh on Dashboard to connect cloud backup with your password.'
        );
      } else if (res.error) {
        Alert.alert('Notice', res.error);
      }
    } catch (e) {
      Alert.alert('Notice', e.message);
    } finally {
      setChecking(false);
    }
  };

  const loadStats = () => {
    try {
      if (!user) return;
      const db = getDb();
      const res = db.getFirstSync(
        `SELECT COUNT(*) as count FROM expenses WHERE user_id = ?;`,
        [user.id]
      );
      if (res) setExpenseCount(res.count);
    } catch (e) {
      console.error('Failed to load menu stats', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [user])
  );

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const downResult = await syncDown(user);
      const upResult = await syncUp(user);
      
      if (upResult.success || downResult.success) {
        Alert.alert('Sync Successful', 'Your data is up to date with the cloud.');
        loadStats();
      } else {
        Alert.alert('Sync Notice', upResult.message || downResult.message || 'Could not sync.');
      }
    } catch (error) {
      Alert.alert('Sync Error', error.message || 'An unexpected error occurred.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.username || 'John Doe'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.badgeRow}>
              {user?.is_verified ? (
                <View style={[styles.statusBadge, styles.statusBadgeVerified]}>
                  <Text style={styles.statusBadgeTextVerified}>✓ Verified</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgePending]}>
                  <Text style={styles.statusBadgeTextPending}>⏳ Verification Pending</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Verification Pending Banner */}
        {!user?.is_verified && (
          <View style={styles.pendingCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingCardTitle}>Confirm Your Email ✉️</Text>
              <Text style={styles.pendingCardSub}>
                Tap the link sent to your inbox to enable full cloud backup.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.pendingCheckBtn}
                onPress={handleCheckStatus}
                disabled={checking}
              >
                <Text style={styles.pendingCheckBtnText}>{checking ? '...' : 'Check'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pendingResendBtn}
                onPress={handleResendVerification}
                disabled={resending}
              >
                <Text style={styles.pendingResendBtnText}>{resending ? '...' : 'Resend'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu Rows */}
        <View style={styles.section}>
          <MenuRow
            icon={PieChart} iconColor={BRAND_PURPLE} label="Budget"
            onPress={() => navigation.navigate('Main', { screen: 'Budget' })}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={Calendar} iconColor="#F59E0B" label="Calendar View"
            onPress={() => navigation.navigate('Calendar')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={BarChart2} iconColor="#10B981" label="Reports"
            onPress={() => navigation.navigate('Main', { screen: 'Reports' })}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={Bell} iconColor="#10B981" label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={Tag} iconColor="#F59E0B" label="Categories"
            onPress={() => navigation.navigate('Categories')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={CreditCard} iconColor="#3F8CFF" label="Payment Methods"
            onPress={() => navigation.navigate('PaymentMethods')}
          />

          <View style={styles.divider} />
          <MenuRow
            icon={HardDrive} iconColor="#6B7280" label="Backup & Restore"
            onPress={() => {
              Alert.alert('Backup & Restore', 'Choose an option to manage your data backup:', [
                {
                  text: 'Export Backup',
                  onPress: () => exportUserDataBackup(user),
                },
                {
                  text: 'Import Backup',
                  onPress: () => importUserDataBackup(user, () => navigation.navigate('Main', { screen: 'Dashboard' })),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={Cloud} iconColor="#3B82F6" label="Sync Data Now"
            onPress={handleManualSync}
            rightElement={syncing ? <Text style={{color: TEXT_MUTED}}>Syncing...</Text> : null}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={Download} iconColor="#8B5CF6" label="Export Data"
            onPress={() => exportUserDataBackup(user)}
          />
        </View>

        <View style={styles.section}>
          <MenuRow
            icon={HelpCircle} iconColor="#F59E0B" label="Help & Support"
            onPress={() => Alert.alert('Help', 'For help, visit our support page.')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={Info} iconColor="#3F8CFF" label="About App"
            onPress={() => Alert.alert('LocalBite AI Expense Tracker', 'Version 1.0.0\nBuilt with ❤️ using React Native & Expo')}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut stroke="#EF4444" size={20} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG_APP },
  content: { padding: 20, paddingBottom: 100 },

  profileCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    marginBottom: 24, gap: 16, ...SHADOWS.card,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: BRAND_PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xl, color: '#FFF' },
  profileName: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: TEXT_DARK },
  profileEmail: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginTop: 3 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadgeVerified: { backgroundColor: '#DCFCE7' },
  statusBadgeTextVerified: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#15803D' },
  statusBadgePending: { backgroundColor: '#FEF3C7' },
  statusBadgeTextPending: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#B45309' },

  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.card,
  },
  pendingCardTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.sm, color: '#B45309' },
  pendingCardSub: { fontFamily: FONTS.regular, fontSize: 11.5, color: '#92400E', marginTop: 2 },
  pendingCheckBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  pendingCheckBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFF' },
  pendingResendBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  pendingResendBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFF' },

  section: {
    backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    marginBottom: 16, overflow: 'hidden', ...SHADOWS.card,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: { flex: 1, fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md, color: TEXT_DARK },
  menuRight: { marginLeft: 8 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    paddingVertical: 16, gap: 10, ...SHADOWS.card,
  },
  logoutText: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md, color: '#EF4444' },
});
