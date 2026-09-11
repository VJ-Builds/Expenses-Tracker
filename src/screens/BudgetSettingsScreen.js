import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { ChevronDown } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import {
  getCategoryBudgets,
  getCategoryTotals,
  getCategoriesForUser,
  getMonthlyBudget,
  setMonthlyBudget,
  setCategoryBudget,
  deleteCategoryBudget
} from '../db/queries';
import { formatINR, currentMonthKey } from '../utils/dateHelpers';
import { syncUp } from '../utils/syncManager';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  // 6 months back through 6 months forward (covers past, current, and upcoming planning)
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ label, value: key });
  }
  return options;
};

const getMonthDisplay = (key) => {
  if (!key) return '';
  const [year, month] = key.split('-');
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`;
};

const CategoryBudgetCard = ({ cat, spent, limit, colors, onUpdate, onRemove }) => {
  const pct = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const pctText = Math.round(pct * 100);
  const [catBudgetInput, setCatBudgetInput] = useState(limit > 0 ? String(limit) : '');

  // Keep input in sync when month or limit changes
  useEffect(() => {
    setCatBudgetInput(limit > 0 ? String(limit) : '');
  }, [limit]);

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.catHeader}>
        <Text style={[styles.catName, { color: colors.textPrimary }]}>{cat.icon || '📦'} {cat.name}</Text>
        {limit > 0 ? (
          <Text style={[styles.catSpent, { color: colors.textSecondary }]}>
            Spent: <Text style={{ color: pct >= 1 ? colors.danger : colors.textPrimary }}>{formatINR(spent)}</Text> / {formatINR(limit)}
          </Text>
        ) : (
          <Text style={[styles.catSpent, { color: colors.textMuted }]}>
            Spent: {formatINR(spent)} (No limit)
          </Text>
        )}
      </View>
      {limit > 0 && (
        <View style={[styles.progressBarBg, { backgroundColor: colors.bgInput }]}>
          <View style={[styles.progressBarFill, { width: `${pctText}%`, backgroundColor: pct >= 1 ? colors.danger : colors.primary }]} />
        </View>
      )}
      
      <View style={styles.inputRow}>
        <Text style={[styles.currency, { color: colors.textMuted }]}>₹</Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgInput, borderColor: colors.border }]}
          value={catBudgetInput}
          onChangeText={setCatBudgetInput}
          keyboardType="numeric"
          placeholder="Set Limit (Optional)"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => onUpdate(cat.id, catBudgetInput)}>
          <Text style={styles.btnText}>Set</Text>
        </TouchableOpacity>
        {limit > 0 && (
          <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.danger }]} onPress={() => onRemove(cat.id)}>
            <Text style={[styles.btnOutlineText, { color: colors.danger }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function BudgetSettingsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const initialMonth = route.params?.selectedMonth || currentMonthKey();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [monthDropOpen, setMonthDropOpen] = useState(false);
  const [monthItems, setMonthItems] = useState(generateMonthOptions());
  const pillRef = useRef(null);
  const dropScrollRef = useRef(null);
  const DROPDOWN_ITEM_HEIGHT = 40;
  const [dropdownCoords, setDropdownCoords] = useState({ top: 180, left: 16, width: 300 });

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
          setDropdownCoords({
            top: y + height + 4,
            left: x,
            width: width,
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
          setDropdownCoords({
            top: y + height + 4,
            left: x,
            width: width,
          });
        }
        setMonthDropOpen(true);
      });
    } else {
      setMonthDropOpen(true);
    }
  }, [monthDropOpen]);

  const [monthlyBudget, setMonthlyBudgetInput] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    if (!user) return;
    const currentBudget = getMonthlyBudget(user.id, selectedMonth);
    setMonthlyBudgetInput(currentBudget > 0 ? String(currentBudget) : '');

    const allCats = getCategoriesForUser(user.id);
    const budgets = getCategoryBudgets(user.id, selectedMonth);

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    const totals = getCategoryTotals(user.id, startDate, endDate);

    const totalsMap = {};
    totals.forEach(t => { totalsMap[t.id] = t.total; });
    setCategoryTotals(totalsMap);

    const merged = allCats.map(c => {
      const b = budgets.find(bdg => bdg.category_id === c.id);
      return {
        ...c,
        budget: b ? b.budget : 0
      };
    });
    setCategories(merged);
  }, [user, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [selectedMonth, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleUpdateMonthly = () => {
    const val = parseFloat(monthlyBudget) || 0;
    if (val < 0) {
      Alert.alert('Error', 'Enter a valid positive number');
      return;
    }
    setMonthlyBudget(user.id, selectedMonth, val);
    if (user) {
      syncUp(user).catch(err => console.log('Budget sync failed:', err));
    }
    Alert.alert('Success', `Monthly budget for ${getMonthDisplay(selectedMonth)} updated!`);
    loadData();
  };

  const handleUpdateCategoryBudget = (catId, valStr) => {
    const val = parseFloat(valStr) || 0;
    if (val < 0) {
      Alert.alert('Error', 'Enter a valid positive number');
      return;
    }
    setCategoryBudget(user.id, catId, val, selectedMonth);
    if (user) {
      syncUp(user).catch(err => console.log('Category budget sync failed:', err));
    }
    loadData();
    Alert.alert('Success', `Category limit updated for ${getMonthDisplay(selectedMonth)}!`);
  };

  const handleRemoveCategoryBudget = (catId) => {
    deleteCategoryBudget(user.id, catId, selectedMonth);
    if (user) {
      syncUp(user).catch(err => console.log('Category budget remove sync failed:', err));
    }
    loadData();
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: SPACING.md }}>
            <Text style={{ fontSize: 24, color: colors.textPrimary }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Budget Settings</Text>
        </View>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 380 }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Month Selector */}
          <View style={styles.monthPickerWrap}>
            <Text style={[styles.monthPickerLabel, { color: colors.textSecondary }]}>SELECT MONTH TO CONFIGURE</Text>
            <View ref={pillRef} collapsable={false} onLayout={onPillLayout}>
              <TouchableOpacity
                style={[styles.monthPillButton, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={toggleDropdown}
                activeOpacity={0.75}
              >
                <Text style={[styles.monthPillText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {monthItems.find(m => m.value === selectedMonth)?.label || 'Month'}
                </Text>
                <ChevronDown
                  stroke={colors.textPrimary}
                  size={16}
                  style={{ transform: [{ rotate: monthDropOpen ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Overall Monthly Budget */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Overall Budget for {getMonthDisplay(selectedMonth)}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Set the total spending budget specifically for {getMonthDisplay(selectedMonth)}.
            </Text>
            <View style={styles.inputRow}>
              <Text style={[styles.currency, { color: colors.textMuted }]}>₹</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                value={monthlyBudget}
                onChangeText={setMonthlyBudgetInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleUpdateMonthly}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Budgets */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 6 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
              Category Limits ({getMonthDisplay(selectedMonth)})
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Categories')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.primary + '18', borderRadius: RADIUS.full }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: colors.primary }}>+ Manage Categories</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subNote, { color: colors.textMuted }]}>
            You can set different limits for each category, or leave them empty if you don't want a limit.
          </Text>

          {categories.map(cat => {
            const spent = categoryTotals[cat.id] || 0;
            const limit = cat.budget || 0;

            return (
              <CategoryBudgetCard
                key={cat.id}
                cat={cat}
                spent={spent}
                limit={limit}
                colors={colors}
                onUpdate={handleUpdateCategoryBudget}
                onRemove={handleRemoveCategoryBudget}
              />
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Month Dropdown Modal */}
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
              left: dropdownCoords.left,
              width: dropdownCoords.width,
              backgroundColor: colors.bgCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.monthDropdownContent, { backgroundColor: colors.bgCard }]}>
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
                      isSelected && { backgroundColor: colors.primary + '14' },
                      index > 0 && { borderTopWidth: 0.5, borderTopColor: colors.border },
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
                        { color: isSelected ? colors.primary : colors.textPrimary },
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: SPACING.md, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  title: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xl },
  content: { padding: SPACING.md, paddingBottom: 100 },
  sectionTitle: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  subNote: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, marginBottom: SPACING.md, marginLeft: 4 },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.lg },
  cardDesc: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, marginBottom: SPACING.md },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, marginRight: SPACING.sm },
  input: { flex: 1, height: 44, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, fontFamily: FONTS.regular, fontSize: FONTS.sizes.md },
  btn: { marginLeft: SPACING.sm, height: 44, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, justifyContent: 'center' },
  btnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md },
  btnOutline: { marginLeft: SPACING.xs, height: 44, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  btnOutlineText: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  catName: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md },
  catSpent: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.md },
  progressBarFill: { height: '100%', borderRadius: 3 },
  monthPickerWrap: { marginBottom: SPACING.lg },
  monthPickerLabel: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.xs, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  monthPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  monthPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.md,
  },
  monthDropdownMenu: {
    position: 'absolute',
    height: 180,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 9999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  monthDropdownContent: {
    flex: 1,
    borderRadius: RADIUS.lg,
  },
  monthDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    paddingHorizontal: SPACING.md,
  },
  monthDropdownItemText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
  },
  monthDropdownItemTextSelected: {
    fontFamily: FONTS.bold,
  },
});
