import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TouchableWithoutFeedback, RefreshControl, Animated as RNAnimated, LayoutAnimation, Platform, Image, Modal, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSpring, interpolate } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Settings2, ChevronDown, Plus, PiggyBank } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getCategoryBudgets, getCategoryTotals, getCategoriesForUser, getMonthlyTotal, getMonthlyBudget } from '../db/queries';
import { formatINR, currentMonthStart, todayISO, currentMonthKey } from '../utils/dateHelpers';
import { syncUp } from '../utils/syncManager';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedBackground from '../components/AnimatedBackground';

const BRAND_PURPLE = '#FF6B6B'; // Sunset Horizon Primary
const BG_APP = '#F7F8FA';
const TEXT_DARK = '#1C1C28';
const TEXT_MUTED = '#8F92A1';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  // 6 months in the past to 6 months in the future
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ label, value: key });
  }
  return options;
}

function getMonthDisplay(key) {
  if (!key) return '';
  const [year, month] = key.split('-');
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`;
}

export default function BudgetOverviewScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [categories, setCategories] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [monthTotal, setMonthTotal] = useState(0);
  const [overallBudget, setOverallBudget] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  
  const [monthDropOpen, setMonthDropOpen] = useState(false);
  const [monthItems, setMonthItems] = useState(generateMonthOptions());
  const pillRef = useRef(null);
  const dropScrollRef = useRef(null);
  const DROPDOWN_ITEM_HEIGHT = 36;
  const [dropdownCoords, setDropdownCoords] = useState({ top: 140, right: 20, width: 130 });

  const scrollToSelectedMonth = useCallback(() => {
    const idx = monthItems.findIndex(m => m.value === selectedMonth);
    if (idx >= 0 && dropScrollRef.current) {
      const targetY = Math.max(0, 4 + (idx - 1) * DROPDOWN_ITEM_HEIGHT);
      dropScrollRef.current.scrollTo({ y: targetY, animated: false });
    }
  }, [monthItems, selectedMonth]);

  useEffect(() => {
    if (monthDropOpen) {
      const timer = setTimeout(() => {
        scrollToSelectedMonth();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [monthDropOpen, scrollToSelectedMonth]);

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

  const loadData = useCallback(() => {
    if (!user) return;
    const total = getMonthlyTotal(user.id, selectedMonth);
    setMonthTotal(total);

    const b = getMonthlyBudget(user.id, selectedMonth);
    setOverallBudget(b);

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;

    const allCats = getCategoriesForUser(user.id);
    const budgets = getCategoryBudgets(user.id, selectedMonth);
    const totals = getCategoryTotals(user.id, startDate, endDate);

    const totalsMap = {};
    totals.forEach(t => { totalsMap[t.id] = t.total; });
    setCategoryTotals(totalsMap);

    const merged = allCats.map(c => {
      const bdg = budgets.find(bItem => bItem.category_id === c.id);
      return { ...c, budget: bdg ? bdg.budget : 0 };
    });

    const relevant = merged.filter(c => c.budget > 0 || totalsMap[c.id] > 0);
    setCategories(relevant);
  }, [user, selectedMonth]);

  // FAB Breathing
  const fabScale = useSharedValue(1);
  useEffect(() => {
    fabScale.value = withRepeat(
      withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, []);
  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  // Flip Animation State
  const isFlipped = useSharedValue(0);

  // Load data whenever selectedMonth or user changes
  useEffect(() => {
    loadData();
    isFlipped.value = 0;
  }, [selectedMonth, user]);

  // Reset to current month only when screen is navigated TO (screen gained focus)
  useFocusEffect(
    useCallback(() => { 
      setMonthDropOpen(false);
      isFlipped.value = 0;
      const curMonth = currentMonthKey();
      let didChange = false;
      setSelectedMonth(prev => {
        if (prev !== curMonth) {
          didChange = true;
          return curMonth;
        }
        return prev;
      });
      const timer = setTimeout(() => {
        if (!didChange) {
          loadData();
        }
      }, 0);
      return () => {
        clearTimeout(timer);
        setMonthDropOpen(false);
      };
    }, [])
  );

  const isExceeded = overallBudget > 0 && monthTotal > overallBudget;
  const overAmount = isExceeded ? monthTotal - overallBudget : 0;
  const pct = overallBudget > 0 ? Math.min(Math.round((monthTotal / overallBudget) * 100), 100) : 0;

  // Progress bar color
  let barColor = '#10B981';
  if (pct >= 90) barColor = '#EF4444';
  else if (pct >= 70) barColor = '#F59E0B';

  const remaining = Math.max(overallBudget - monthTotal, 0);

  // Daily allowance calculation
  const [yearStr, monthStr] = selectedMonth.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  let daysPassed = 0;
  if (today.getFullYear() === y && (today.getMonth() + 1) === m) {
    daysPassed = today.getDate();
  } else if (new Date(y, m - 1, daysInMonth) < today) {
    daysPassed = daysInMonth; // past month
  } else {
    daysPassed = 0; // future month
  }
  const daysLeft = Math.max(daysInMonth - daysPassed, 1);
  const dailyAllowance = Math.floor(remaining / daysLeft) || 0;

  const handleFlip = () => {
    isFlipped.value = withSpring(isFlipped.value >= 0.5 ? 0 : 1, { damping: 15, stiffness: 120 });
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateVal = interpolate(isFlipped.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateVal}deg` }],
      opacity: isFlipped.value >= 0.5 ? 0 : 1,
      zIndex: isFlipped.value >= 0.5 ? 0 : 10,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateVal = interpolate(isFlipped.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateVal}deg` }],
      opacity: isFlipped.value >= 0.5 ? 1 : 0,
      zIndex: isFlipped.value >= 0.5 ? 10 : 0,
    };
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user) await syncUp(user);
    } catch (e) {
      console.log('Refresh sync error:', e);
    } finally {
      loadData();
      setRefreshing(false);
    }
  }, [user, loadData]);

  return (
    <View style={styles.safeArea}>
      <AnimatedBackground />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PURPLE} />}
        showsVerticalScrollIndicator={false}
      >

        {/* Budget Exceeded Alert Card */}
        {isExceeded && (
          <View style={styles.alertCard}>
            <View style={styles.alertLeft}>
              <Text style={styles.alertTitle}>⚠️  Budget Exceeded</Text>
              <Text style={styles.alertSub}>You have exceeded your monthly budget</Text>
              <Text style={styles.alertOverAmount}>{formatINR(overAmount)}</Text>
              <Text style={styles.alertOverLabel}>over-budget</Text>
            </View>
          </View>
        )}

        {/* Monthly Budget Card (Flippable) */}
        {overallBudget > 0 ? (
          <View style={{ zIndex: 1000 }}>
            {/* Front of Card */}
            <Animated.View style={[styles.budgetCard, frontAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
              <View style={styles.budgetRow}>
                <TouchableOpacity onPress={() => navigation.navigate('BudgetSettings', { selectedMonth })} activeOpacity={0.75}>
                  <Text style={styles.budgetLabel}>Monthly Budget ✏️</Text>
                  <Text style={styles.budgetOfLabel}>of {formatINR(overallBudget)}</Text>
                </TouchableOpacity>
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
                      stroke={TEXT_DARK}
                      size={14}
                      style={{ transform: [{ rotate: monthDropOpen ? '180deg' : '0deg' }] }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableWithoutFeedback onPress={handleFlip}>
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.budgetAmount}>{formatINR(monthTotal)}</Text>

                  {/* Progress bar */}
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                  </View>

                  <View style={styles.budgetFooter}>
                    <Text style={styles.budgetRemaining}>
                      {isExceeded
                        ? `${formatINR(overAmount)} over budget`
                        : `${formatINR(remaining)} left`}
                    </Text>
                    <Text style={[styles.budgetPct, { color: barColor }]}>{pct}%</Text>
                  </View>
                  
                  <Text style={styles.tapToFlipText}>Tap to flip for daily breakdown ↺</Text>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>

            {/* Back of Card */}
            <Animated.View
              style={[
                styles.budgetCard,
                backAnimatedStyle,
                {
                  backfaceVisibility: 'hidden',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 24,
                  overflow: 'hidden',
                  padding: 0,
                  backgroundColor: '#FF6B6B',
                },
              ]}
            >
              <LinearGradient
                colors={['#FF6B6B', '#8862F8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, width: '100%', height: '100%' }}
              >
                <TouchableWithoutFeedback onPress={handleFlip}>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Text style={styles.dailyAllowanceLabel}>
                      DAILY ALLOWANCE
                    </Text>
                    <Text style={styles.dailyAllowanceAmount}>
                      {formatINR(dailyAllowance)}
                    </Text>
                    
                    <View style={styles.daysRemainingBadge}>
                      <Text style={styles.daysRemainingText}>
                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining
                      </Text>
                    </View>

                    <Text style={styles.tapToFlipBackText}>
                      Tap to flip back ↺
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
              </LinearGradient>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.setBudgetCard}>
            <View style={{ width: '100%', marginBottom: 16 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginBottom: 8 }}>Select Month</Text>
              <View ref={pillRef} collapsable={false} onLayout={onPillLayout}>
                <TouchableOpacity
                  style={[styles.monthPillButton, { width: '100%', justifyContent: 'space-between', height: 42, borderRadius: RADIUS.md }]}
                  onPress={toggleDropdown}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.monthPillText, { fontSize: 14 }]} numberOfLines={1}>
                    {monthItems.find(m => m.value === selectedMonth)?.label || 'Month'}
                  </Text>
                  <ChevronDown
                    stroke={TEXT_DARK}
                    size={16}
                    style={{ transform: [{ rotate: monthDropOpen ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 14, backgroundColor: BRAND_PURPLE + '12', borderRadius: RADIUS.full }} 
              onPress={() => navigation.navigate('BudgetSettings', { selectedMonth })}
            >
              <Plus stroke={BRAND_PURPLE} size={22} />
              <Text style={styles.setBudgetText}>Set a Monthly Budget</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Category Budget Section */}
        {categories.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Category Budget</Text>
            {categories.map(cat => {
              const spent = categoryTotals[cat.id] || 0;
              const limit = cat.budget || 0;
              const hasLimit = limit > 0;
              const catPct = hasLimit ? Math.round((spent / limit) * 100) : 0;
              const catFill = hasLimit ? Math.min(catPct, 100) : 0;
              let catBarColor = '#10B981';
              if (catPct >= 100) catBarColor = '#EF4444';
              else if (catPct >= 70) catBarColor = '#F59E0B';

              return (
                <View key={cat.id} style={styles.catCard}>
                  <View style={styles.catRow}>
                    <View style={[styles.catIconWrap, { backgroundColor: (cat.color || BRAND_PURPLE) + '20' }]}>
                      <Text style={styles.catIcon}>{cat.icon || '📦'}</Text>
                    </View>
                    <View style={styles.catInfo}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      {hasLimit && (
                        <Text style={styles.catLimit}>{formatINR(limit)}</Text>
                      )}
                    </View>
                    <View style={styles.catRight}>
                      <Text style={styles.catSpent}>{formatINR(spent)}</Text>
                      {hasLimit && (
                        <Text style={[styles.catPct, { color: catBarColor }]}>{catPct}%</Text>
                      )}
                    </View>
                  </View>
                  {hasLimit && (
                    <View style={styles.catProgressBg}>
                      <View style={[styles.catProgressFill, { width: `${catFill}%`, backgroundColor: catBarColor }]} />
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {categories.length === 0 && overallBudget > 0 && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <PiggyBank stroke={BRAND_PURPLE} size={32} opacity={0.6} />
            </View>
            <Text style={styles.emptyTitle}>No spending yet</Text>
            <Text style={styles.emptySub}>You haven't recorded any expenses for this budget period.</Text>
          </View>
        )}

      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View style={[styles.fab, animatedFabStyle]}>
        <LinearGradient colors={['#FF6B6B', '#FF8E53']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={[{flex:1, alignItems:'center', justifyContent:'center'}]} onPress={() => navigation.navigate('BudgetSettings', { selectedMonth })}>
            <Settings2 stroke="#FFF" size={24} />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* Month Dropdown Modal matching Dashboard */}
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
          <View style={styles.monthDropdownContent}>
            <ScrollView
              ref={dropScrollRef}
              contentOffset={{
                x: 0,
                y: Math.max(0, 4 + (monthItems.findIndex(m => m.value === selectedMonth) - 1) * DROPDOWN_ITEM_HEIGHT),
              }}
              onContentSizeChange={scrollToSelectedMonth}
              showsVerticalScrollIndicator={false}
              bounces={true}
              overScrollMode="always"
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 4 }}
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
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 6,
    backgroundColor: 'transparent',
  },headerTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxl, color: TEXT_DARK },
  iconBtn: { padding: 6, borderRadius: RADIUS.md, backgroundColor: '#FFF', ...SHADOWS.card },

  monthSelector: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full, gap: 8, ...SHADOWS.card,
  },
  monthSelectorText: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm, color: TEXT_DARK },

  content: { paddingHorizontal: 20, paddingBottom: 100 },

  // Exceeded Alert Card
  alertCard: {
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.xl,
    padding: 20, marginBottom: 16,
    ...SHADOWS.strong,
  },
  alertLeft: {},
  alertTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: '#FFF' },
  alertSub: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  alertOverAmount: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxxl, color: '#FFF', marginTop: 12 },
  alertOverLabel: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.85)' },

  // Monthly Budget Card
  budgetCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    padding: 20, marginBottom: 24, ...SHADOWS.card,
  },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  budgetLabel: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md, color: TEXT_DARK },
  budgetOfLabel: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED },
  budgetAmount: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxxl, color: TEXT_DARK, marginBottom: 14 },
  progressBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 8, zIndex: -1 },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', zIndex: -1 },
  budgetRemaining: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED },
  budgetPct: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.sm },
  tapToFlipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 10,
  },

  dailyAllowanceLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dailyAllowanceAmount: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  daysRemainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  daysRemainingText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  tapToFlipBackText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 14,
  },

  monthPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    minWidth: 124,
  },
  monthPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: TEXT_DARK,
    marginRight: 6,
  },
  monthDropdownMenu: {
    position: 'absolute',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  monthDropdownContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  monthDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingHorizontal: 14,
  },
  monthDropdownItemSelected: {
    backgroundColor: BRAND_PURPLE + '14',
  },
  monthDropdownItemBorder: {
    borderTopWidth: 0.5,
    borderTopColor: '#F3F4F6',
  },
  monthDropdownItemText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: TEXT_DARK,
  },
  monthDropdownItemTextSelected: {
    color: BRAND_PURPLE,
    fontFamily: FONTS.bold,
  },

  setBudgetCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS.xl, padding: 20,
    alignItems: 'center', marginBottom: 24, ...SHADOWS.card,
    flexDirection: 'column',
  },
  setBudgetText: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md, color: BRAND_PURPLE },

  sectionTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: TEXT_DARK, marginBottom: 14 },

  // Category Cards
  catCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 10, ...SHADOWS.card,
  },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  catIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catIcon: { fontSize: 20 },
  catInfo: { flex: 1 },
  catName: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md, color: TEXT_DARK },
  catLimit: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginTop: 2 },
  catRight: { alignItems: 'flex-end' },
  catSpent: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md, color: TEXT_DARK },
  catPct: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm, marginTop: 2 },
  catProgressBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  catProgressFill: { height: '100%', borderRadius: 3 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND_PURPLE + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: TEXT_DARK },
  emptySub: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginTop: 6, textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.strong,
  },
});
