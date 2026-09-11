import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, LayoutAnimation, Platform,
  Animated as RNAnimated, Easing as RNEasing, Modal, FlatList
} from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { Search, X, Tag, ChevronDown, Check, Wallet, Calendar, RotateCcw } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { FONTS, RADIUS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getExpenses, deleteExpense, getCategoriesForUser, getPaymentMethodsForUser } from '../db/queries';
import { syncUp } from '../utils/syncManager';
import ExpenseCard from '../components/ExpenseCard';
import AnimatedBackground from '../components/AnimatedBackground';

const TEXT_DARK   = '#1C1C28';
const TEXT_MUTED  = '#8F92A1';
const BRAND       = '#FF6B6B';
const BORDER      = '#E8EAF0';
const CAL_BLUE    = '#4E65FF';

// ── helpers ──────────────────────────────────────────────────────
const relativeHeader = (dateStr) => {
  const d = new Date(dateStr);
  const today     = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const same = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today))     return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAmount = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const toDateStr = (d) => {
  try { return d.toISOString().split('T')[0]; }
  catch { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
};

const MAX_GAP_MS = 92 * 24 * 60 * 60 * 1000; // ~3 calendar months

const getDefaultDates = () => {
  const end   = new Date();
  const start = new Date(); start.setMonth(start.getMonth() - 3);
  return { start, end };
};

// ── DEFAULT_PAY_ITEMS constant ──────────────────────────────────────
const DEFAULT_PAY_ITEMS = [
  { label: 'All Payments', value: 'All',         rawIcon: '💳', rawColor: TEXT_MUTED },
  { label: 'Cash',         value: 'Cash',         rawIcon: '💵' },
  { label: 'UPI',          value: 'UPI',          rawIcon: '📱' },
  { label: 'Card',         value: 'Card',         rawIcon: '💳' },
  { label: 'Net Banking',  value: 'Net Banking',  rawIcon: '🏦' },
  { label: 'Other',        value: 'Other',        rawIcon: '📦', rawColor: '#6B7280' },
];

// ── Custom Bottom-Sheet Dropdown ──────────────────────────────────
function Dropdown({ label, value, items, onChange, leftIcon, style }) {
  const [open, setOpen]   = useState(false);
  const chevron = useRef(new RNAnimated.Value(0)).current;
  const overlay = useRef(new RNAnimated.Value(0)).current;
  const sheetY  = useRef(new RNAnimated.Value(500)).current;

  const openSheet = () => {
    setOpen(true);
    RNAnimated.parallel([
      RNAnimated.timing(chevron, { toValue: 1, duration: 220, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }),
      RNAnimated.timing(overlay,  { toValue: 1, duration: 200, useNativeDriver: true }),
      RNAnimated.spring(sheetY,   { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    RNAnimated.parallel([
      RNAnimated.timing(chevron, { toValue: 0, duration: 180, useNativeDriver: true }),
      RNAnimated.timing(overlay,  { toValue: 0, duration: 170, useNativeDriver: true }),
      RNAnimated.timing(sheetY,   { toValue: 500, duration: 220, easing: RNEasing.in(RNEasing.quad), useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const select = (v) => { onChange(v); closeSheet(); };
  const rotate = chevron.interpolate({ inputRange: [0,1], outputRange: ['0deg','180deg'] });
  const selected = items.find(i => i.value === value);

  return (
    <>
      <TouchableOpacity style={[styles.miniCell, style]} onPress={openSheet} activeOpacity={0.7}>
        <View style={styles.miniLeft}>
          {leftIcon}
          <Text style={styles.miniValue} numberOfLines={1}>
            {selected ? selected.label : label}
          </Text>
        </View>
        <RNAnimated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown stroke={TEXT_MUTED} size={14} />
        </RNAnimated.View>
      </TouchableOpacity>

      {open && (
        <Modal transparent visible animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
          <View style={styles.modalRoot}>
            <RNAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)', opacity: overlay }]} />
            <TouchableOpacity style={{ flex: 1 }} onPress={closeSheet} activeOpacity={1} />
            <RNAnimated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
              <View style={styles.sheetPill} />
              <Text style={styles.sheetTitle}>{label}</Text>
              <FlatList
                data={items}
                keyExtractor={i => String(i.value)}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={{ paddingBottom: 50 }}
                renderItem={({ item }) => {
                  const sel = item.value === value;
                  return (
                    <TouchableOpacity
                      style={[styles.sheetRow, sel && styles.sheetRowActive]}
                      onPress={() => select(item.value)}
                      activeOpacity={0.55}
                    >
                      {item.rawIcon && (
                        <View style={[styles.sheetEmoji, { backgroundColor: (item.rawColor || BRAND) + '22' }]}>
                          <Text style={{ fontSize: 18 }}>{item.rawIcon}</Text>
                        </View>
                      )}
                      <Text style={[styles.sheetRowLabel, sel && { color: BRAND, fontFamily: FONTS.semiBold }]}>
                        {item.label}
                      </Text>
                      {sel && <Check stroke={BRAND} size={17} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </RNAnimated.View>
          </View>
        </Modal>
      )}
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function TransactionsListScreen({ navigation, route }) {
  const { user } = useAuth();

  // Search controlled by header icon via route.params
  const searchOpen = route?.params?.searchOpen || false;

  const [expenses,   setExpenses]   = useState([]);
  const [catItems,   setCatItems]   = useState([]);
  const [search,     setSearch]     = useState('');
  const [categoryId, setCategoryId] = useState('All');
  const [payMethod,  setPayMethod]  = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const { start: defStart, end: defEnd } = getDefaultDates();
  const [startDate, setStartDate] = useState(defStart);
  const [endDate,   setEndDate]   = useState(defEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  // ── search bar animated height ────────────────────────────────
  const searchH = useRef(new RNAnimated.Value(0)).current;
  const searchOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(searchH, {
        toValue: searchOpen ? 52 : 0,
        duration: 260,
        easing: RNEasing.out(RNEasing.quad),
        useNativeDriver: false,
      }),
      RNAnimated.timing(searchOpacity, {
        toValue: searchOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (!searchOpen) setSearch('');
    });
  }, [searchOpen]);

  // ── helpers ───────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    const { start, end } = getDefaultDates();
    setCategoryId('All');
    setPayMethod('All');
    setSearch('');
    setStartDate(start);
    setEndDate(end);
    if (searchOpen) navigation.setParams({ searchOpen: false });
  }, [searchOpen]);

  // Auto-reset when leaving the screen (deferred so it doesn't block exit transition)
  useFocusEffect(
    useCallback(() => {
      return () => {
        setTimeout(() => {
          resetFilters();
        }, 300);
      };
    }, [resetFilters])
  );

  const loadData = useCallback(() => {
    if (!user) return;
    const data = getExpenses({
      userId: user.id,
      search: search.trim() || undefined,
      startDate: toDateStr(startDate),
      endDate:   toDateStr(endDate),
    });
    setExpenses(data);

    const rows  = getCategoriesForUser(user.id);
    const items = [
      { label: 'All Categories', value: 'All', rawIcon: '🏷️', rawColor: TEXT_MUTED },
      ...rows.map(c => ({ label: c.name, value: c.id, rawIcon: c.icon, rawColor: c.color }))
    ];
    setCatItems(items);

    const pmRows = getPaymentMethodsForUser(user.id);
    const pItems = [
      { label: 'All Payments', value: 'All', rawIcon: '💳', rawColor: TEXT_MUTED },
      ...pmRows.map(m => ({ label: m.name, value: m.name, rawIcon: m.icon || '💳', rawColor: m.color || '#3B82F6' }))
    ];
    setPayItems(pItems);
  }, [user?.id, search, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }, [loadData])
  );

  // Animate list when in-memory filters change
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [categoryId, payMethod]);

  // ── date handlers (max 3-month / 92-day gap) ──────────────────
  const handleStartDate = (d) => {
    setShowStartPicker(false);
    if (!d) return;
    let s = new Date(d), e = new Date(endDate);
    if (s > e) e = new Date(s);
    if (e - s > MAX_GAP_MS) e = new Date(s.getTime() + MAX_GAP_MS);
    setStartDate(s); setEndDate(e);
  };

  const handleEndDate = (d) => {
    setShowEndPicker(false);
    if (!d) return;
    let e = new Date(d), s = new Date(startDate);
    if (e < s) s = new Date(e);
    if (e - s > MAX_GAP_MS) s = new Date(e.getTime() - MAX_GAP_MS);
    setStartDate(s); setEndDate(e);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (user) await syncUp(user);
    } catch (e) {
      console.log('Refresh sync error:', e);
    } finally {
      loadData();
      setRefreshing(false);
    }
  };
  const handleDelete = (id) => {
    deleteExpense(id);
    loadData();
    if (user) syncUp(user).catch(err => console.log('Delete sync error:', err));
  };
  const handleEdit   = (expense) => navigation.navigate('AddExpense', { expense });

  const [payItems, setPayItems] = useState(DEFAULT_PAY_ITEMS);

  const selCat = catItems.find(c => c.value === categoryId);
  const selPay = payItems.find(p => p.value === payMethod);

  // ── in-memory second filter pass ─────────────────────────────
  const sections = useMemo(() => {
    const map = {};
    expenses
      .filter(e => {
        if (categoryId !== 'All' && e.category_id !== categoryId) return false;
        if (payMethod  !== 'All' && e.payment_method !== payMethod)  return false;
        return true;
      })
      .forEach(e => {
        const key = e.date.split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(e);
      });

    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({
        title: date,
        total: map[date].reduce((s, e) => s + e.amount, 0),
        data:  map[date],
      }));
  }, [expenses, categoryId, payMethod]);

  // ── are any filters active? ───────────────────────────────────
  const { start: ds, end: de } = getDefaultDates();
  const filtersActive =
    categoryId !== 'All' ||
    payMethod  !== 'All' ||
    search.trim() !== '' ||
    toDateStr(startDate) !== toDateStr(ds) ||
    toDateStr(endDate)   !== toDateStr(de);

  // ── render ───────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <AnimatedBackground />

      {/* ── Collapsible Search Bar ── */}
      <RNAnimated.View style={[styles.searchContainer, { height: searchH, opacity: searchOpacity }]}>
        <View style={styles.searchWrap}>
          <Search stroke={TEXT_MUTED} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search category, note, payment or amount..."
            placeholderTextColor={TEXT_MUTED}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X stroke={TEXT_MUTED} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </RNAnimated.View>

      {/* ── Compact 2×2 Filter Grid ── */}
      <View style={styles.filterGrid}>
        {/* Row 1: Category + Payment Method */}
        <View style={styles.filterRow}>
          <Dropdown
            label="Category"
            value={categoryId}
            items={catItems}
            onChange={setCategoryId}
            style={styles.filterCellLeft}
            leftIcon={
              selCat && categoryId !== 'All'
                ? <View style={[styles.cellIcon, { backgroundColor: (selCat.rawColor || BRAND) + '22' }]}>
                    <Text style={{ fontSize: 13 }}>{selCat.rawIcon}</Text>
                  </View>
                : <View style={[styles.cellIcon, { backgroundColor: BRAND + '18' }]}>
                    <Tag stroke={BRAND} size={13} />
                  </View>
            }
          />
          <View style={styles.cellDividerV} />
          <Dropdown
            label="Payment"
            value={payMethod}
            items={payItems}
            onChange={setPayMethod}
            style={styles.filterCellRight}
            leftIcon={
              selPay && payMethod !== 'All'
                ? <View style={[styles.cellIcon, { backgroundColor: BRAND + '22' }]}>
                    <Text style={{ fontSize: 13 }}>{selPay.rawIcon}</Text>
                  </View>
                : <View style={[styles.cellIcon, { backgroundColor: BRAND + '18' }]}>
                    <Wallet stroke={BRAND} size={13} />
                  </View>
            }
          />
        </View>

        <View style={styles.cellDividerH} />

        {/* Row 2: Start Date + End Date */}
        <View style={styles.filterRow}>
          {/* Start Date */}
          <TouchableOpacity
            style={[styles.miniCell, styles.filterCellLeft]}
            onPress={() => setShowStartPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.miniLeft}>
              <View style={[styles.cellIcon, { backgroundColor: CAL_BLUE + '18' }]}>
                <Calendar stroke={CAL_BLUE} size={13} />
              </View>
              <View>
                <Text style={styles.dateLabel}>Start</Text>
                <Text style={styles.dateValue}>{fmtDate(startDate)}</Text>
              </View>
            </View>
            <ChevronDown stroke={TEXT_MUTED} size={14} />
          </TouchableOpacity>

          <View style={styles.cellDividerV} />

          {/* End Date */}
          <TouchableOpacity
            style={[styles.miniCell, styles.filterCellRight]}
            onPress={() => setShowEndPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.miniLeft}>
              <View style={[styles.cellIcon, { backgroundColor: CAL_BLUE + '18' }]}>
                <Calendar stroke={CAL_BLUE} size={13} />
              </View>
              <View>
                <Text style={styles.dateLabel}>End</Text>
                <Text style={styles.dateValue}>{fmtDate(endDate)}</Text>
              </View>
            </View>
            <ChevronDown stroke={TEXT_MUTED} size={14} />
          </TouchableOpacity>
        </View>

        {/* Reset Filters button — only shown when filters are active */}
        {filtersActive && (
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.75}>
            <RotateCcw stroke={BRAND} size={13} />
            <Text style={styles.resetText}>Reset Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* DateTimePickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, d) => handleStartDate(d)}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, d) => handleEndDate(d)}
        />
      )}

      {/* Transactions List */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
            <ExpenseCard
              expense={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          </Animated.View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{relativeHeader(section.title)}</Text>
            <Text style={styles.sectionTotal}>{formatAmount(section.total)}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Search stroke={BRAND} size={30} opacity={0.6} />
            </View>
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or date range.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },

  // Search bar (animated height)
  searchContainer: {
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 6,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: RADIUS.lg,
    paddingHorizontal: 12, height: 44,
    gap: 8, ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  // 2×2 filter grid card
  filterGrid: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    overflow: 'hidden',
  },
  filterRow: { flexDirection: 'row', alignItems: 'stretch' },

  // Each mini dropdown cell
  miniCell: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 11,
  },
  filterCellLeft:  { flex: 1 },
  filterCellRight: { flex: 1 },

  miniLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },

  miniValue: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: TEXT_DARK,
    flex: 1,
  },

  cellIcon: {
    width: 26, height: 26, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },

  // Date cell labels
  dateLabel: { fontFamily: FONTS.regular, fontSize: 10, color: TEXT_MUTED, lineHeight: 13 },
  dateValue: { fontFamily: FONTS.semiBold, fontSize: 12, color: TEXT_DARK, lineHeight: 16 },

  // Dividers inside grid
  cellDividerV: { width: 1, backgroundColor: BORDER },
  cellDividerH: { height: 1, backgroundColor: BORDER },

  // Reset button — appears at bottom of filter card when active
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9,
    borderTopWidth: 1, borderTopColor: BORDER,
    backgroundColor: BRAND + '08',
  },
  resetText: { fontFamily: FONTS.semiBold, fontSize: 12, color: BRAND },

  // Bottom Sheet Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    maxHeight: '65%', paddingHorizontal: 20, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.09, shadowRadius: 14, elevation: 22,
  },
  sheetPill: { width: 38, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: 17, color: TEXT_DARK, marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12, marginBottom: 2 },
  sheetRowActive: { backgroundColor: '#FFF0F0' },
  sheetEmoji: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sheetRowLabel: { fontFamily: FONTS.medium, fontSize: 15, color: TEXT_DARK, flex: 1 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 7, marginTop: 4,
  },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 13, color: TEXT_DARK },
  sectionTotal: { fontFamily: FONTS.semiBold, fontSize: 12, color: TEXT_MUTED },

  listContent: { paddingBottom: 100 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: BRAND + '12',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyText: { fontFamily: FONTS.bold, fontSize: 16, color: TEXT_DARK },
  emptySub: { fontFamily: FONTS.medium, fontSize: 13, color: TEXT_MUTED, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
