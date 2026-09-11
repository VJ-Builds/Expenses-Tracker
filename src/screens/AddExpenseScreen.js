import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Animated, Easing as RNEasing, FlatList, Modal,
  Keyboard, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, ChevronDown, Check, Calendar, FileText, Tag, Plus } from 'lucide-react-native';
import { FONTS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { addExpense, updateExpense, getCategoriesForUser, getPaymentMethodsForUser, getMonthlyTotal, getMonthlyBudget } from '../db/queries';
import { formatINR } from '../utils/dateHelpers';
import { syncUp } from '../utils/syncManager';
import Svg, { Path, Circle } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BRAND = '#FF6B6B';
const BG_WHITE = '#FFFFFF';
const BG_SCREEN = '#F2F3F7';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#9EA3B5';
const BORDER = '#E6E8F0';
const ROW_H = 54;
const BTN_H = 54;
const BTN_MX = 20;

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ──────────────────────────────────────────────────────
// ✅ PhonePe Style Success Overlay
//   - Expanding green circle
//   - Animated white checkmark drawing (strokeDashoffset)
// ──────────────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

function PhonePeSuccessOverlay({ visible, onDone }) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const pathAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    overlayOpacity.setValue(0);
    circleScale.setValue(0);
    pathAnim.setValue(0);
    textOpacity.setValue(0);
    textTranslateY.setValue(20);

    Animated.sequence([
      // 1. Fade in white/light background overlay
      Animated.timing(overlayOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),

      // 2. Pop the green circle
      Animated.spring(circleScale, {
        toValue: 1,
        tension: 220,
        friction: 12,
        useNativeDriver: true,
      }),

      // 3. Draw the checkmark & slide text up simultaneously
      Animated.parallel([
        Animated.timing(pathAnim, {
          toValue: 1,
          duration: 180,
          easing: RNEasing.inOut(RNEasing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 150,
          easing: RNEasing.out(RNEasing.ease),
          useNativeDriver: true,
        }),
      ]),

      // 4. Wait a bit, then finish
      Animated.delay(500),
    ]).start(() => {
      if (onDone) onDone();
    });

  }, [visible]);

  if (!visible) return null;

  // Path length is roughly 75 for this checkmark
  const checkmarkLength = 80;
  const strokeDashoffset = pathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [checkmarkLength, 0],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Light overlay backdrop (PhonePe often uses white or very light overlay) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(255, 255, 255, 0.94)', opacity: overlayOpacity }
        ]}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
        {/* Green Circle Container */}
        <Animated.View style={{ transform: [{ scale: circleScale }] }}>
          <Svg width="110" height="110" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="48" fill="#139D59" />
            <AnimatedPath
              d="M 28 52 L 44 68 L 74 34"
              stroke="#FFFFFF"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={checkmarkLength}
              strokeDashoffset={strokeDashoffset}
            />
          </Svg>
        </Animated.View>

        {/* Success Text */}
        <Animated.View
          style={{
            marginTop: 30,
            alignItems: 'center',
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }]
          }}
        >
          <Text style={{ fontFamily: FONTS.bold, fontSize: 24, color: TEXT_DARK }}>
            Expense Added Successfully
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 16, color: TEXT_MUTED, marginTop: 8 }}>
            Expense safely recorded.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────
// Custom Animated Dropdown (Bottom Sheet)
// ──────────────────────────────────────────────
function Dropdown({ label, value, items, onChange, placeholder, leftIcon, onAddNew, addNewLabel }) {
  const [open, setOpen] = useState(false);
  const chevron = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(500)).current;

  const openSheet = () => {
    setOpen(true);
    Animated.parallel([
      Animated.timing(chevron, { toValue: 1, duration: 220, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(chevron, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: 500, duration: 220, easing: RNEasing.in(RNEasing.quad), useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const select = (v) => { onChange(v); closeSheet(); };
  const rotate = chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const selected = items.find(i => i.value === value);

  return (
    <>
      <TouchableOpacity style={styles.row} onPress={openSheet} activeOpacity={0.7}>
        <View style={styles.rowLeft}>
          {leftIcon}
          <Text style={[styles.rowValue, !selected && { color: TEXT_MUTED }]} numberOfLines={1}>
            {selected ? selected.label : placeholder}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown stroke={TEXT_MUTED} size={18} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <Modal transparent visible animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
          <View style={styles.modalRoot}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)', opacity: overlay }]} />
            <TouchableOpacity style={{ flex: 1 }} onPress={closeSheet} activeOpacity={1} />
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
              <View style={styles.sheetPill} />
              <Text style={styles.sheetTitle}>{label}</Text>
              <FlatList
                data={items}
                keyExtractor={i => String(i.value)}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 50 }}
                ListFooterComponent={onAddNew ? (
                  <TouchableOpacity
                    style={[styles.sheetRow, { borderTopWidth: 1, borderTopColor: '#F0F1F5', marginTop: 8, justifyContent: 'center', backgroundColor: BRAND + '12', borderRadius: 12 }]}
                    onPress={() => {
                      closeSheet();
                      onAddNew();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: BRAND }}>
                      {addNewLabel || '+ Manage Categories'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                renderItem={({ item }) => {
                  const sel = item.value === value;
                  return (
                    <TouchableOpacity
                      style={[styles.sheetRow, sel && styles.sheetRowActive]}
                      onPress={() => select(item.value)}
                      activeOpacity={0.55}
                    >
                      {item.rawIcon ? (
                        <View style={[styles.sheetEmoji, { backgroundColor: (item.rawColor || BRAND) + '22' }]}>
                          <Text style={{ fontSize: 18 }}>{item.rawIcon}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.sheetRowLabel, sel && { color: BRAND, fontFamily: FONTS.semiBold }]}>
                        {item.label}
                      </Text>
                      {sel && <Check stroke={BRAND} size={17} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────
export default function AddExpenseScreen({ navigation, route }) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const insets = useSafeAreaInsets();

  const editing = route.params?.expense || null;
  const isEditing = !!editing;
  const initDate = editing ? new Date(editing.date) : new Date();

  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [description, setDescription] = useState(editing?.description || '');
  const [date, setDate] = useState(initDate.toISOString());
  const [categoryId, setCategoryId] = useState(editing?.category_id || null);
  const [payMethod, setPayMethod] = useState(() => {
    if (editing?.payment_method) return editing.payment_method;
    if (user?.id) {
      try {
        const rows = getPaymentMethodsForUser(user.id, { excludeOther: true });
        if (rows && rows.length > 0) return rows[0].name;
      } catch (e) {
        console.error('Initial payMethod load error:', e);
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [catItems, setCatItems] = useState([]);
  const [showDate, setShowDate] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const btnBottom = useRef(new Animated.Value(insets.bottom + 20)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const offset = Platform.OS === 'android' ? 55 : 16;
        Animated.spring(btnBottom, {
          toValue: e.endCoordinates.height + offset,
          useNativeDriver: false,
          tension: 80, friction: 10,
        }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.spring(btnBottom, {
          toValue: insets.bottom + 20,
          useNativeDriver: false,
          tension: 80, friction: 10,
        }).start();
      }
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, [insets.bottom]);

  const [payItems, setPayItems] = useState([]);

  const loadPaymentMethods = useCallback(() => {
    if (!user) return;
    try {
      const rows = getPaymentMethodsForUser(user.id, { excludeOther: true });
      if (rows && rows.length > 0) {
        const items = rows.map(m => ({ label: m.name, value: m.name, rawIcon: m.icon || '💳', rawColor: m.color }));
        setPayItems(items);
        if (!isEditing) {
          setPayMethod(prev => {
            if (!prev) return items[0].value;
            const exists = items.some(i => i.value === prev);
            return exists ? prev : items[0].value;
          });
        }
      } else {
        const defaults = [
          { label: 'Cash', value: 'Cash', rawIcon: '💵' },
          { label: 'UPI', value: 'UPI', rawIcon: '📱' },
          { label: 'Card', value: 'Card', rawIcon: '💳' },
          { label: 'Net Banking', value: 'Net Banking', rawIcon: '🏦' },
        ];
        setPayItems(defaults);
        if (!isEditing) {
          setPayMethod(prev => prev || defaults[0].value);
        }
      }
    } catch (e) {
      console.error('Failed to load payment methods in AddExpense:', e);
    }
  }, [user, isEditing]);

  const loadCategories = useCallback(() => {
    if (!user) return;
    const rows = getCategoriesForUser(user.id);
    const items = rows.map(c => ({ label: c.name, value: c.id, rawIcon: c.icon, rawColor: c.color }));
    setCatItems(items);
    if (!isEditing && items.length > 0) {
      setCategoryId(prev => {
        const exists = items.some(i => i.value === prev);
        return exists ? prev : items[0].value;
      });
    }
  }, [user, isEditing]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadPaymentMethods();
    }, [loadCategories, loadPaymentMethods])
  );

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.'); return;
    }
    if (!categoryId) {
      Alert.alert('Category Required', 'Please select a category.'); return;
    }
    setLoading(true);
    try {
      const payload = {
        userId: user.id, categoryId,
        amount: parseFloat(amount),
        description: description.trim(),
        date, paymentMethod: payMethod,
      };
      if (isEditing) {
        updateExpense({ id: editing.id, ...payload });
      } else {
        addExpense(payload);
        const mk = date.substring(0, 7);
        const total = getMonthlyTotal(user.id, mk);
        const mBudget = getMonthlyBudget(user.id, mk);
        if (mBudget > 0) {
          if (total > mBudget)
            addNotification({ title: 'Budget Exceeded! ⚠️', message: `Spent ${formatINR(total)}, exceeding your budget of ${formatINR(mBudget)}.`, type: 'warning', time: new Date().toISOString() });
          else if (total > mBudget * 0.9)
            addNotification({ title: 'Nearing Budget ⚠️', message: 'Over 90% of monthly budget used.', type: 'warning', time: new Date().toISOString() });
        }
      }

      // 🎉 Success: keyboard dismiss → PhonePe animation
      Keyboard.dismiss();
      setShowSuccess(true);

      // Trigger background sync after mutation
      syncUp(user).catch(err => console.log('Background sync failed:', err));

    } catch (e) {
      setLoading(false);
      Alert.alert('Error', e.message);
    }
  };

  const selCat = catItems.find(c => c.value === categoryId);
  const selPay = payItems.find(p => p.value === payMethod);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft stroke={TEXT_DARK} size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEditing ? 'Edit Expense' : 'Add Expense'}</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* ── Amount Hero ── */}
          <View style={styles.amountHero}>
            <Text style={styles.amountHint}>Total Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={TEXT_MUTED}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                selectionColor={BRAND}
                color={TEXT_DARK}
                includeFontPadding={false}
                autoFocus={!isEditing}
              />
            </View>
            <View style={styles.amountLine} />
          </View>

          {/* ── Form Card ── */}
          {/* paddingBottom makes sure rows aren't hidden behind floating button */}
          <View style={[styles.card, { marginBottom: BTN_H + 40 + insets.bottom }]}>

            {/* Category */}
            <Dropdown
              label="Select Category"
              value={categoryId}
              items={catItems}
              onChange={setCategoryId}
              placeholder="Choose a category"
              leftIcon={
                <View style={[styles.rowIcon, { backgroundColor: (selCat?.rawColor || BRAND) + '20' }]}>
                  <Text style={{ fontSize: 15 }}>{selCat?.rawIcon || '📦'}</Text>
                </View>
              }
            />

            <View style={styles.divider} />

            {/* Date */}
            <TouchableOpacity style={styles.row} onPress={() => setShowDate(true)} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#4E65FF20' }]}>
                  <Calendar stroke="#4E65FF" size={15} />
                </View>
                <Text style={styles.rowValue}>{fmtDate(date)}</Text>
              </View>
              <ChevronDown stroke={TEXT_MUTED} size={18} />
            </TouchableOpacity>
            {showDate && (
              <DateTimePicker
                value={new Date(date)} mode="date" display="default" maximumDate={new Date()}
                onChange={(_, d) => { setShowDate(false); if (d) setDate(d.toISOString()); }}
              />
            )}

            <View style={styles.divider} />

            {/* Payment */}
            <Dropdown
              label="Select Payment Method"
              value={payMethod}
              items={payItems}
              onChange={setPayMethod}
              placeholder="Choose payment method"
              leftIcon={
                <View style={[styles.rowIcon, { backgroundColor: (selPay?.rawColor || '#10B981') + '20' }]}>
                  <Text style={{ fontSize: 15 }}>{selPay?.rawIcon || '💳'}</Text>
                </View>
              }
            />

            <View style={styles.divider} />

            {/* Notes */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#F59E0B20' }]}>
                  <FileText stroke="#F59E0B" size={15} />
                </View>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={TEXT_MUTED}
                  value={description}
                  onChangeText={setDescription}
                  returnKeyType="done"
                  maxLength={80}
                />
              </View>
            </View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Floating Save Button (lives outside KAV, animates above keyboard) ── */}
      <Animated.View style={[styles.floatingBtnWrap, { bottom: btnBottom }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>💾  Save Expense</Text>
          }
        </TouchableOpacity>
      </Animated.View>

      {/* ── PhonePe Style Success Overlay (handles navigation via onDone) ── */}
      <PhonePeSuccessOverlay
        visible={showSuccess}
        onDone={() => {
          navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG_SCREEN },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: BG_SCREEN,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: BG_WHITE, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: TEXT_DARK },

  // Amount
  amountHero: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 24 },
  amountHint: { fontFamily: FONTS.regular, fontSize: 12, color: TEXT_MUTED, marginBottom: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontFamily: FONTS.bold, fontSize: 28, color: TEXT_DARK, marginRight: 4, marginTop: 6 },
  amountInput: {
    fontFamily: FONTS.bold, fontSize: 52, color: TEXT_DARK,
    minWidth: 100, textAlign: 'center', includeFontPadding: false, paddingVertical: 0,
  },
  amountLine: { marginTop: 10, height: 3, width: 80, backgroundColor: BRAND, borderRadius: 2, opacity: 0.8 },

  // Card
  card: {
    backgroundColor: BG_WHITE, borderRadius: 20,
    marginHorizontal: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, minHeight: ROW_H,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowValue: { fontFamily: FONTS.medium, fontSize: 15, color: TEXT_DARK, flex: 1 },
  divider: { height: 1, backgroundColor: BORDER, marginLeft: 60 },

  // Notes
  notesInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 15, color: TEXT_DARK, includeFontPadding: false, paddingVertical: 0 },

  // Floating Save Button
  floatingBtnWrap: {
    position: 'absolute', left: BTN_MX, right: BTN_MX,
  },
  saveBtn: {
    backgroundColor: BRAND, borderRadius: 16, height: BTN_H,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  saveBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#FFF', letterSpacing: 0.3 },

  // Bottom Sheet Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BG_WHITE, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    maxHeight: '62%', paddingHorizontal: 20, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 22,
  },
  sheetPill: { width: 38, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: 17, color: TEXT_DARK, marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12, marginBottom: 2 },
  sheetRowActive: { backgroundColor: '#FFF0F0' },
  sheetEmoji: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sheetRowLabel: { fontFamily: FONTS.medium, fontSize: 15, color: TEXT_DARK, flex: 1 },
});
