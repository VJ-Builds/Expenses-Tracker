import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Dimensions, RefreshControl, LayoutAnimation, Platform, Animated as RNAnimated, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Receipt, ChevronDown, Check } from 'lucide-react-native';

import { FONTS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getExpenses, getMonthlyTotal, getCategoryTotals, getMonthlyBudget } from '../db/queries';
import ExpenseCard from '../components/ExpenseCard';
import AnimatedBackground from '../components/AnimatedBackground';
import AnimatedNumber from '../components/AnimatedNumber';
import SkeletonLoader from '../components/SkeletonLoader';
import { syncUp } from '../utils/syncManager';

const BRAND_PURPLE = '#FF6B6B'; // Sunset Horizon Primary
const BG_WHITE = '#FFFFFF';
const TEXT_DARK = '#1C1C28';
const TEXT_MUTED = '#8F92A1';

// Generate last 6 months for the dropdown
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ label, value: key });
  }
  return options;
};

export default function DashboardScreen({ navigation }) {
  const { user, resendVerification, checkVerificationStatus } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyingPass, setVerifyingPass] = useState(false);

  const handleResendPendingVerification = async () => {
    if (resending || !user?.email) return;
    setResending(true);
    try {
      await resendVerification(user.email);
      Alert.alert('Verification Sent! ✉️', `A confirmation link has been sent to ${user.email}.`);
    } catch (e) {
      Alert.alert('Notice', e.message || 'Could not resend email.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await checkVerificationStatus(true);
      if (res.verified) {
        Alert.alert('Email Verified! 🎉', 'Your account is verified and data has been synced to cloud!');
        loadData();
      } else if (res.needsPassword) {
        setVerifyModalVisible(true);
      } else if (res.pending) {
        Alert.alert(
          'Verification Pending ✉️',
          `We checked Supabase, but the link in your email (${user?.email}) has not been clicked yet.\n\nPlease open Gmail, tap "Confirm email address", and then tap Check again.`
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

  const handleConfirmPasswordVerification = async () => {
    if (!verifyPassword.trim()) {
      setVerifyError('Please enter your password.');
      return;
    }
    setVerifyingPass(true);
    setVerifyError('');
    try {
      const res = await checkVerificationStatus(true, verifyPassword);
      if (res.verified) {
        setVerifyModalVisible(false);
        setVerifyPassword('');
        Alert.alert('Success! 🎉', 'Your email is verified and your data has been saved to Supabase!');
        loadData();
      } else if (res.pending) {
        setVerifyError('Email not clicked yet in Gmail. Please click the link first.');
      } else {
        setVerifyError(res.error || 'Incorrect password or verification failed.');
      }
    } catch (err) {
      setVerifyError(err.message || 'Verification error.');
    } finally {
      setVerifyingPass(false);
    }
  };

  // Data state
  const [selectedMonth, setSelectedMonth] = useState(generateMonthOptions()[0].value);
  const [monthTotal, setMonthTotal] = useState(0);
  const [monthBudget, setMonthBudget] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Advanced breathing animation for FAB
  const fabScale = useSharedValue(1);

  useEffect(() => {
    fabScale.value = withRepeat(
      withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true // reverse (pulse)
    );
  }, []);

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  // Dropdown state & positioning
  const [monthDropOpen, setMonthDropOpen] = useState(false);
  const [monthItems, setMonthItems] = useState(generateMonthOptions());
  const pillRef = useRef(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 140, right: 44, width: 130 });

  const updateDropdownCoords = useCallback(() => {
    if (pillRef.current) {
      pillRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          const windowWidth = Dimensions.get('window').width;
          const calculatedRight = Math.max(windowWidth - (x + width), 16);
          const calculatedTop = y + height + 4;
          setDropdownCoords({
            top: calculatedTop,
            right: calculatedRight,
            width: Math.max(width, 130),
          });
        }
      });
    }
  }, []);

  const onPillLayout = useCallback(() => {
    updateDropdownCoords();
  }, [updateDropdownCoords]);

  const toggleDropdown = useCallback(() => {
    if (monthDropOpen) {
      setMonthDropOpen(false);
      return;
    }
    if (pillRef.current) {
      pillRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          const windowWidth = Dimensions.get('window').width;
          const calculatedRight = Math.max(windowWidth - (x + width), 16);
          const calculatedTop = y + height + 4;
          setDropdownCoords({
            top: calculatedTop,
            right: calculatedRight,
            width: Math.max(width, 130),
          });
        }
        setMonthDropOpen(true);
      });
    } else {
      setMonthDropOpen(true);
    }
  }, [monthDropOpen]);

  // Progress Bar Animation
  const progressAnim = useRef(new RNAnimated.Value(0)).current;

  const loadData = useCallback(() => {
    if (!user) return;
    
    try {
      // 1. Get total
      const total = getMonthlyTotal(user.id, selectedMonth);
      setMonthTotal(total);

      // 2. Get recent expenses (just get all for the month and take top 5)
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      const data = getExpenses({ userId: user.id, startDate, endDate });
      setRecentExpenses(data.slice(0, 5));

      // 3. Get category totals
      const catTotals = getCategoryTotals(user.id, startDate, endDate);

      // Calculate pie data
      let formattedPie = catTotals.map(c => ({
        value: Math.round(c.total),
        color: c.color || BRAND_PURPLE,
        label: c.name,
        icon: c.icon || '📦',
      }));

      // If empty, put a placeholder so it doesn't look completely empty
      if (formattedPie.length === 0) {
        formattedPie = [{ value: 100, color: '#E4E7ED', label: 'No Data', icon: '⚪' }];
      }
      setPieData(formattedPie);

      // 4. Animate progress bar (budget logic)
      const b = getMonthlyBudget(user.id, selectedMonth);
      setMonthBudget(b);
      const actualPct = b > 0 ? Math.round((total / b) * 100) : 0;

      if (b > 0) {
        RNAnimated.timing(progressAnim, {
          toValue: Math.min(actualPct, 100),
          duration: 1500,
          useNativeDriver: false,
        }).start();
      }

    } catch (err) {
      console.error('loadData error', err);
    }
  }, [user, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [selectedMonth, loadData]);

  // Close dropdown if open when blurring
  useEffect(() => {
    if (!navigation) return;
    const unsubscribe = navigation.addListener('blur', () => {
      setMonthDropOpen(false);
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setMonthDropOpen(false);
      if (typeof requestIdleCallback !== 'undefined') {
        const id = requestIdleCallback(() => {
          loadData();
        });
        return () => {
          if (typeof cancelIdleCallback !== 'undefined') {
            cancelIdleCallback(id);
          }
        };
      }
      const timer = setTimeout(() => loadData(), 0);
      return () => clearTimeout(timer);
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (user && !user.is_verified) {
        const res = await checkVerificationStatus(false);
        if (res.verified) {
          Alert.alert('Email Verified! 🎉', 'Your email is confirmed and data has been saved to Supabase!');
        } else if (res.needsPassword) {
          setVerifyModalVisible(true);
        }
      }
      if (user) await syncUp(user);
    } catch (e) {
      console.log('Refresh sync error:', e);
    } finally {
      loadData();
      setRefreshing(false);
    }
  };

  const actualPct = monthBudget > 0 ? Math.round((monthTotal / monthBudget) * 100) : 0;

  // Progress bar color
  let progressColor = '#10B981'; // Green
  if (actualPct >= 90) progressColor = '#EF4444'; // Red
  else if (actualPct >= 70) progressColor = '#F59E0B'; // Orange

  return (
    <View style={styles.safeArea}>
      <AnimatedBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        onScrollBeginDrag={() => setMonthDropOpen(false)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Verification Pending Banner */}
        {user && !user.is_verified ? (
          <View style={styles.verificationBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.verificationBannerTitle}>✉️ Email Verification Pending</Text>
              <Text style={styles.verificationBannerSub}>
                Confirm your email ({user.email}) to enable cloud sync.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <TouchableOpacity 
                style={styles.verificationCheckBtn}
                onPress={handleCheckVerification}
                disabled={checking}
              >
                <Text style={styles.verificationCheckText}>{checking ? '...' : 'Check'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.verificationResendBtn}
                onPress={handleResendPendingVerification}
                disabled={resending}
              >
                <Text style={styles.verificationResendText}>{resending ? '...' : 'Resend'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* 2. Total Expenses Card */}
        <View style={{ marginHorizontal: 20 }}>
          <LinearGradient
            colors={[BRAND_PURPLE, '#8862F8']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.totalCard}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.totalCardLabel}>Total Expenses</Text>

              {/* Month Pill Button */}
              <View ref={pillRef} collapsable={false} onLayout={onPillLayout}>
                <TouchableOpacity
                  style={styles.monthPillButton}
                  onPress={toggleDropdown}
                  activeOpacity={0.75}
                >
                  <Text style={styles.monthPillText} numberOfLines={1}>
                    {monthItems.find(m => m.value === selectedMonth)?.label || 'Month'}
                  </Text>
                  <ChevronDown
                    stroke="#FFFFFF"
                    size={14}
                    style={{ transform: [{ rotate: monthDropOpen ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <AnimatedNumber value={monthTotal} duration={1200} style={styles.totalCardAmount} />
            <Text style={styles.totalCardTrend}>Updated for {monthItems.find(m => m.value === selectedMonth)?.label}</Text>
          </LinearGradient>
        </View>

        {/* 3. Monthly Budget Card (Only show if budget > 0) */}
        {monthBudget > 0 && (
          <View style={styles.budgetCard}>
            <View style={[styles.rowBetween, { marginBottom: 12 }]}>
              <Text style={styles.budgetLabel}>Monthly Budget</Text>
              <Text style={styles.budgetSubLabel}>of ₹ {monthBudget.toLocaleString('en-IN')}.00</Text>
            </View>

            <View style={[styles.rowBetween, { marginBottom: 8, alignItems: 'flex-end' }]}>
              <Text style={styles.budgetAmount}>₹ {monthBudget.toLocaleString('en-IN')}.00</Text>
              <Text style={styles.budgetPercent}>{actualPct}%</Text>
            </View>

            <View style={styles.progressBg}>
              <RNAnimated.View style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  }),
                  backgroundColor: progressColor
                }
              ]} />
            </View>
          </View>
        )}

        {/* 4. Expenses Overview */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Expenses Overview</Text>

          <View style={styles.overviewCard}>
            <View style={styles.pieWrap}>
              <PieChart
                data={pieData}
                donut
                radius={65}
                innerRadius={45}
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterAmount}>₹ {monthTotal > 1000 ? (monthTotal / 1000).toFixed(1) + 'k' : monthTotal}</Text>
                    <Text style={styles.pieCenterSub}>This Month</Text>
                  </View>
                )}
                strokeColor={BG_WHITE}
                strokeWidth={3}
                isAnimated
              />
            </View>

            <View style={styles.legendWrap}>
              {pieData.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.legendRow}>
                  <View style={styles.legendLabelGroup}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabelText} numberOfLines={1}>{item.label}</Text>
                  </View>
                  <Text style={styles.legendValueText}>
                    {monthTotal > 0 ? Math.round((item.value / monthTotal) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 5. Recent Transactions */}
        <View style={styles.sectionWrap}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionList}>
            {recentExpenses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconWrap}>
                  <Receipt stroke={BRAND_PURPLE} size={28} opacity={0.6} />
                </View>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySub}>When you add expenses, they'll show up here.</Text>
              </View>
            ) : (
              recentExpenses.slice(0, 5).map((t) => (
                <ExpenseCard
                  key={t.id}
                  expense={t}
                  onEdit={() => navigation.navigate('AddExpense', { expense: t })}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Month Dropdown Modal */}
      <Modal
        visible={monthDropOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setMonthDropOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableWithoutFeedback onPress={() => setMonthDropOpen(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.monthDropdownMenu,
            {
              top: dropdownCoords.top,
              right: dropdownCoords.right,
              width: dropdownCoords.width,
            },
          ]}
        >
          <LinearGradient
            colors={[BRAND_PURPLE, '#8862F8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.monthDropdownGradient}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={true}
              overScrollMode="always"
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 2 }}
            >
              {monthItems.map((item, index) => {
                const isSelected = item.value === selectedMonth;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.monthDropdownItem,
                      isSelected && styles.monthDropdownItemSelected,
                      index > 0 && styles.monthDropdownItemBorder,
                    ]}
                    onPress={() => {
                      setSelectedMonth(item.value);
                      setMonthDropOpen(false);
                    }}
                    activeOpacity={0.65}
                  >
                    <Text
                      style={[
                        styles.monthDropdownItemText,
                        isSelected && styles.monthDropdownItemTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Check stroke="#FFFFFF" size={13} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>

      {/* Quick Password Verification Modal (only needed if no cached password exists) */}
      <Modal
        visible={verifyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVerifyModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Connect Cloud Sync 🔐</Text>
                <Text style={styles.modalSub}>
                  Email verified in Gmail? Enter your password once to connect cloud backup for {user?.email}.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#8F92A1"
                  secureTextEntry={true}
                  value={verifyPassword}
                  onChangeText={setVerifyPassword}
                  autoCapitalize="none"
                />
                {verifyError ? <Text style={styles.modalErrorText}>{verifyError}</Text> : null}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => { setVerifyModalVisible(false); setVerifyError(''); }}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={handleConfirmPasswordVerification}
                    disabled={verifyingPass}
                  >
                    <Text style={styles.modalConfirmText}>{verifyingPass ? 'Verifying...' : 'Verify & Sync'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// Minimal, soft shadow helper
const softShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: TEXT_DARK },
  iconBtn: { padding: 4 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  verificationBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...softShadow,
  },
  verificationBannerTitle: { fontFamily: FONTS.bold, fontSize: 13, color: '#B45309' },
  verificationBannerSub: { fontFamily: FONTS.regular, fontSize: 11, color: '#92400E', marginTop: 2 },
  verificationCheckBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  verificationCheckText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFF' },
  verificationResendBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  verificationResendText: { fontFamily: FONTS.bold, fontSize: 12, color: '#FFF' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 24, ...softShadow,
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: TEXT_DARK, marginBottom: 8 },
  modalSub: { fontFamily: FONTS.regular, fontSize: 13, color: TEXT_MUTED, lineHeight: 18, marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    fontFamily: FONTS.medium, color: TEXT_DARK, backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  modalErrorText: { fontFamily: FONTS.medium, fontSize: 12, color: '#EF4444', marginBottom: 10 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  modalCancelText: { fontFamily: FONTS.medium, fontSize: 14, color: TEXT_MUTED },
  modalConfirmBtn: { backgroundColor: BRAND_PURPLE, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  modalConfirmText: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF' },

  // Total Expenses Card
  totalCard: {
    marginTop: 16, marginBottom: 20,
    padding: 24, borderRadius: 24,
    ...softShadow, shadowColor: BRAND_PURPLE, shadowOpacity: 0.25,
  },
  totalCardLabel: { fontFamily: FONTS.medium, fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  monthPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.22)',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    minWidth: 124,
  },
  monthPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
    marginRight: 6,
  },
  monthDropdownMenu: {
    position: 'absolute',
    height: 104,
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  monthDropdownGradient: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  monthDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    paddingHorizontal: 12,
  },
  monthDropdownItemSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  monthDropdownItemBorder: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  monthDropdownItemText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  monthDropdownItemTextSelected: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  totalCardAmount: { fontFamily: FONTS.bold, fontSize: 32, color: '#fff', marginTop: 16, marginBottom: 8 },
  totalCardTrend: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.9)' },

  // Budget Card
  budgetCard: {
    backgroundColor: BG_WHITE, marginHorizontal: 20, padding: 20,
    borderRadius: 20, marginBottom: 24,
    ...softShadow,
  },
  budgetLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: TEXT_DARK },
  budgetSubLabel: { fontFamily: FONTS.medium, fontSize: 12, color: TEXT_MUTED },
  budgetAmount: { fontFamily: FONTS.bold, fontSize: 22, color: TEXT_DARK },
  budgetPercent: { fontFamily: FONTS.bold, fontSize: 16, color: TEXT_DARK },
  progressBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  // Sections
  sectionWrap: { marginHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: TEXT_DARK, marginBottom: 16 },

  // Overview Card (Donut)
  overviewCard: {
    backgroundColor: BG_WHITE, borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...softShadow,
  },
  pieWrap: { flex: 0.45, alignItems: 'center', justifyContent: 'center' },
  pieCenter: { alignItems: 'center', justifyContent: 'center' },
  pieCenterAmount: { fontFamily: FONTS.bold, fontSize: 16, color: TEXT_DARK },
  pieCenterSub: { fontFamily: FONTS.medium, fontSize: 10, color: TEXT_MUTED, marginTop: 2 },

  legendWrap: { flex: 0.55, gap: 10, paddingLeft: 12 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLabelGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabelText: { fontFamily: FONTS.semiBold, fontSize: 12, color: TEXT_MUTED, flexShrink: 1 },
  legendValueText: { fontFamily: FONTS.bold, fontSize: 12, color: TEXT_DARK, marginLeft: 8 },

  // Recent Transactions
  seeAllText: { fontFamily: FONTS.bold, fontSize: 14, color: BRAND_PURPLE },
  transactionList: { gap: 12 },
  txCard: {
    backgroundColor: BG_WHITE, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    ...softShadow,
  },
  txIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  txInfo: { flex: 1 },
  txCategory: { fontFamily: FONTS.bold, fontSize: 15, color: TEXT_DARK, marginBottom: 2 },
  txMerchant: { fontFamily: FONTS.medium, fontSize: 13, color: TEXT_MUTED },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontFamily: FONTS.bold, fontSize: 15, color: TEXT_DARK, marginBottom: 2 },
  txDate: { fontFamily: FONTS.medium, fontSize: 12, color: TEXT_MUTED },

  // Empty State
  emptyWrap: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: BRAND_PURPLE + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md, color: TEXT_DARK },
  emptySub: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginTop: 4, textAlign: 'center', lineHeight: 20 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 64, height: 64, borderRadius: 32,
    ...softShadow, shadowColor: BRAND_PURPLE, shadowOpacity: 0.3, shadowRadius: 12,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 32 },
});
