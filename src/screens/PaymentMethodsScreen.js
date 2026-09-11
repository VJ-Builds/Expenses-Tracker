import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft,
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  CreditCard,
  ShieldAlert,
  GripVertical,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { FONTS, RADIUS, SHADOWS } from '../constants/theme';
import {
  getPaymentMethodsWithStats,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethodSafe,
  updatePaymentMethodsOrder,
} from '../db/queries';
import { syncUp } from '../utils/syncManager';

const BRAND_PRIMARY = '#3B82F6';
const BRAND_SECONDARY = '#8862F8';
const BG_APP = '#F7F8FA';
const TEXT_DARK = '#1C1C28';
const TEXT_MUTED = '#8F92A1';

const SLOT_HEIGHT = 82; // 72px card height + 10px margin

const PRESET_COLORS = [
  '#10B981',
  '#8862F8',
  '#3B82F6',
  '#F59E0B',
  '#FF6B6B',
  '#06B6D4',
  '#EC4899',
  '#6366F1',
  '#84CC16',
  '#F97316',
  '#6B7280',
  '#14B8A6',
];

const PRESET_EMOJIS = [
  '💵', '📱', '💳', '🏦', '🪙', '🧾',
  '🏧', '💰', '💸', '💎', '🏷️', '💼',
  '🛒', '🛍️', '📦', '🌐', '💻', '⚡',
];

function ReorderableMethodCard({
  method,
  index,
  isDragging,
  dragY,
  dragScale,
  itemOffset,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onEdit,
  onDelete,
}) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          onStartDrag(index);
        },
        onPanResponderMove: (_, gestureState) => {
          onMoveDrag(index, gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          onEndDrag(index, gestureState.dy);
        },
        onPanResponderTerminate: (_, gestureState) => {
          onEndDrag(index, gestureState.dy);
        },
      }),
    [index, onStartDrag, onMoveDrag, onEndDrag]
  );

  const count = method.expense_count || 0;
  const methodColor = method.color || '#3B82F6';

  const animatedStyle = isDragging
    ? {
        transform: [{ translateY: dragY }, { scale: dragScale }],
        zIndex: 9999,
        elevation: 16,
        shadowColor: BRAND_SECONDARY,
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        borderWidth: 1.5,
        borderColor: BRAND_SECONDARY,
      }
    : {
        transform: [{ translateY: itemOffset || 0 }],
        zIndex: 1,
        elevation: 2,
      };

  return (
    <Animated.View style={[styles.methodCard, animatedStyle]}>
      {/* Press & Hold Six Dots Drag Handle */}
      <View {...panResponder.panHandlers} style={styles.sixDotsHandle}>
        <GripVertical
          size={20}
          color={isDragging ? BRAND_SECONDARY : TEXT_MUTED}
          strokeWidth={2.2}
        />
      </View>

      {/* Method Icon / Emoji */}
      <View style={[styles.iconWrap, { backgroundColor: `${methodColor}20` }]}>
        <Text style={styles.iconText}>{method.icon || '💳'}</Text>
      </View>

      {/* Details */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {method.name}
        </Text>
        <Text style={styles.count}>
          {count} {count === 1 ? 'transaction' : 'transactions'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => onEdit(method)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Pencil stroke={TEXT_MUTED} size={15} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: '#FEE2E2' }]}
          onPress={() => onDelete(method)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 stroke="#EF4444" size={15} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodName, setMethodName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💳');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  // Load payment methods with expense counters
  const loadMethods = useCallback(() => {
    if (!user) return;
    try {
      const list = getPaymentMethodsWithStats(user.id);
      setMethods(list);
    } catch (e) {
      console.error('Failed to load payment methods:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadMethods();
    }, [loadMethods])
  );

  // Separate reorderable methods from the static 'Other' method
  const { reorderableMethods, otherMethod } = useMemo(() => {
    let other = null;
    const reorderable = [];

    methods.forEach((m) => {
      const isOther = m.name?.toLowerCase() === 'other';
      if (isOther && !other) {
        other = m;
      } else {
        reorderable.push(m);
      }
    });

    return { reorderableMethods: reorderable, otherMethod: other };
  }, [methods]);

  // Continuous Drag & Drop State
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const itemOffsets = useRef([]);
  const isReorderingRef = useRef(false);

  // Sync offsets array length with reorderableMethods
  while (itemOffsets.current.length < reorderableMethods.length) {
    itemOffsets.current.push(new Animated.Value(0));
  }
  if (itemOffsets.current.length > reorderableMethods.length) {
    itemOffsets.current = itemOffsets.current.slice(0, reorderableMethods.length);
  }

  // Smoothly shift non-dragged items to open a landing slot
  useEffect(() => {
    if (isReorderingRef.current) return;

    if (draggingIndex === null || hoverIndex === null) {
      itemOffsets.current.forEach(anim => {
        anim.setValue(0);
      });
      return;
    }

    itemOffsets.current.forEach((anim, idx) => {
      if (idx === draggingIndex) return;
      let target = 0;
      if (draggingIndex < hoverIndex) {
        if (idx > draggingIndex && idx <= hoverIndex) {
          target = -SLOT_HEIGHT;
        }
      } else if (draggingIndex > hoverIndex) {
        if (idx >= hoverIndex && idx < draggingIndex) {
          target = SLOT_HEIGHT;
        }
      }
      Animated.spring(anim, {
        toValue: target,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [draggingIndex, hoverIndex]);

  const handleStartDrag = useCallback((idx) => {
    isReorderingRef.current = false;
    setDraggingIndex(idx);
    setHoverIndex(idx);
    dragY.setValue(0);
    Animated.spring(dragScale, {
      toValue: 1.04,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [dragY, dragScale]);

  const handleMoveDrag = useCallback((startIdx, dy) => {
    dragY.setValue(dy);
    const shift = Math.round(dy / SLOT_HEIGHT);
    const targetHover = Math.max(0, Math.min(reorderableMethods.length - 1, startIdx + shift));
    setHoverIndex(prev => (prev !== targetHover ? targetHover : prev));
  }, [dragY, reorderableMethods.length]);

  const handleEndDrag = useCallback((startIdx, dy) => {
    const shift = Math.round(dy / SLOT_HEIGHT);
    const finalTarget = Math.max(0, Math.min(reorderableMethods.length - 1, startIdx + shift));

    if (finalTarget === startIdx) {
      // Returned to same position
      Animated.parallel([
        Animated.spring(dragY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
        Animated.spring(dragScale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start(() => {
        setDraggingIndex(null);
        setHoverIndex(null);
      });
      return;
    }

    isReorderingRef.current = true;

    // Build the new reordered array
    const updatedReorderable = [...reorderableMethods];
    const [moved] = updatedReorderable.splice(startIdx, 1);
    updatedReorderable.splice(finalTarget, 0, moved);

    const fullList = otherMethod ? [...updatedReorderable, otherMethod] : updatedReorderable;

    // Snap card directly into the final slot center
    Animated.timing(dragY, {
      toValue: (finalTarget - startIdx) * SLOT_HEIGHT,
      duration: 60,
      useNativeDriver: true,
    }).start(() => {
      // Keep draggingIndex locked to destination slot to eliminate bounce-back
      setDraggingIndex(finalTarget);
      setHoverIndex(null);
      dragY.setValue(0);
      dragScale.setValue(1);
      itemOffsets.current.forEach(anim => anim.setValue(0));

      setMethods(fullList);

      requestAnimationFrame(() => {
        setDraggingIndex(null);
        isReorderingRef.current = false;
      });

      // Persist new ordering in SQLite
      const idsToSave = fullList.map(m => m.id);
      try {
        updatePaymentMethodsOrder(user.id, idsToSave);
        if (user) syncUp(user).catch(() => {});
      } catch (err) {
        console.error('Failed to save payment methods order:', err);
      }
    });
  }, [reorderableMethods, otherMethod, dragY, dragScale, user]);

  // Filter reorderable methods by search query
  const filteredReorderable = useMemo(() => {
    if (!search.trim()) return reorderableMethods;
    const query = search.trim().toLowerCase();
    return reorderableMethods.filter((m) => m.name.toLowerCase().includes(query));
  }, [reorderableMethods, search]);

  // Modal Open Handlers
  const handleOpenAdd = () => {
    setEditingMethod(null);
    setMethodName('');
    setSelectedEmoji('💳');
    setSelectedColor(PRESET_COLORS[0]);
    setCustomEmojiInput('');
    setModalVisible(true);
  };

  const handleOpenEdit = (method) => {
    setEditingMethod(method);
    setMethodName(method.name);
    setSelectedEmoji(method.icon || '💳');
    setSelectedColor(method.color || PRESET_COLORS[0]);
    setCustomEmojiInput('');
    setModalVisible(true);
  };

  // Modal Save Handler
  const handleSaveModal = () => {
    const trimmed = methodName.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a payment method name.');
      return;
    }

    if (trimmed.toLowerCase() === 'other') {
      Alert.alert('Reserved Name', '"Other" is a reserved system fallback payment method.');
      return;
    }

    // Check duplicate name
    const exists = methods.some(
      (m) =>
        m.name.toLowerCase() === trimmed.toLowerCase() &&
        (!editingMethod || m.id !== editingMethod.id)
    );
    if (exists) {
      Alert.alert('Duplicate', `A payment method named "${trimmed}" already exists.`);
      return;
    }

    const icon = customEmojiInput.trim() || selectedEmoji || '💳';
    const color = selectedColor || PRESET_COLORS[0];

    try {
      if (editingMethod) {
        updatePaymentMethod(editingMethod.id, trimmed, icon, color);
      } else {
        addPaymentMethod(user.id, trimmed, icon, color);
      }
      setModalVisible(false);
      loadMethods();
      if (user) syncUp(user).catch(() => {});
    } catch (e) {
      Alert.alert('Error', 'Failed to save payment method. Please try again.');
      console.error(e);
    }
  };

  // Delete Handler
  const handleDelete = (method) => {
    if (method.name?.toLowerCase() === 'other') {
      Alert.alert('Protected', '"Other" is a system fallback payment method and cannot be deleted.');
      return;
    }

    const count = method.expense_count || 0;
    const countWarning =
      count > 0
        ? `\n\n⚠️ ${count} existing transaction${count === 1 ? '' : 's'} using "${method.name}" will be safely transferred to "Other".`
        : '';

    Alert.alert(
      'Delete Payment Method?',
      `Are you sure you want to delete "${method.name}"?${countWarning}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              deletePaymentMethodSafe(user.id, method.id);
              loadMethods();
              if (user) syncUp(user).catch(() => {});
            } catch (e) {
              Alert.alert('Error', 'Failed to delete payment method.');
              console.error(e);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft stroke={TEXT_DARK} size={24} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={handleOpenAdd}>
          <Plus stroke="#FFF" size={16} strokeWidth={2.5} />
          <Text style={styles.addHeaderBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search stroke={TEXT_MUTED} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search payment methods..."
            placeholderTextColor={TEXT_MUTED}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X stroke={TEXT_MUTED} size={16} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{methods.length}</Text>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND_PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={draggingIndex === null}
        >
          {/* Reordering Hint Banner */}
          {!search.trim() && reorderableMethods.length > 1 && (
            <View style={styles.hintBanner}>
              <GripVertical size={16} color="#4F46E5" strokeWidth={2.2} style={{ marginRight: 6 }} />
              <Text style={styles.hintText}>
                Press & hold the six dots (⋮⋮) on any payment method to drag and reorder anywhere.
              </Text>
            </View>
          )}

          {/* Active Reorderable Payment Methods */}
          {filteredReorderable.map((method, idx) => {
            const isDragging = draggingIndex === idx;
            return (
              <ReorderableMethodCard
                key={method.id}
                method={method}
                index={idx}
                isDragging={isDragging}
                dragY={dragY}
                dragScale={dragScale}
                itemOffset={itemOffsets.current[idx]}
                onStartDrag={handleStartDrag}
                onMoveDrag={handleMoveDrag}
                onEndDrag={handleEndDrag}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            );
          })}

          {filteredReorderable.length === 0 && !otherMethod && (
            <View style={styles.emptyWrap}>
              <CreditCard stroke={TEXT_MUTED} size={40} />
              <Text style={styles.emptyTitle}>No payment methods found</Text>
              <Text style={styles.emptySub}>
                {search.trim()
                  ? 'Try a different search query'
                  : 'Tap "+ Add" to create your first custom payment method'}
              </Text>
            </View>
          )}

          {/* ── Pinned Static "Other" Section at Bottom ── */}
          {otherMethod && (
            <View style={styles.pinnedSection}>
              <View style={styles.pinnedSectionHeader}>
                <Text style={styles.pinnedSectionTitle}>FALLBACK METHOD (ALWAYS LAST)</Text>
                <View style={styles.pinnedBadge}>
                  <ShieldAlert size={12} color={TEXT_MUTED} style={{ marginRight: 4 }} />
                  <Text style={styles.pinnedBadgeText}>Protected</Text>
                </View>
              </View>

              <View style={[styles.methodCard, styles.pinnedCard]}>
                <View style={styles.pinnedLeftIndicator}>
                  <ShieldAlert size={16} color={TEXT_MUTED} strokeWidth={2} />
                </View>

                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: `${otherMethod.color || '#6B7280'}20` },
                  ]}
                >
                  <Text style={styles.iconText}>{otherMethod.icon || '📦'}</Text>
                </View>

                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {otherMethod.name}
                  </Text>
                  <Text style={styles.count}>
                    {otherMethod.expense_count || 0}{' '}
                    {(otherMethod.expense_count || 0) === 1
                      ? 'transaction'
                      : 'transactions'}{' '}
                    (Transferred from deleted methods)
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMethod ? 'Edit Payment Method' : 'New Payment Method'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <X stroke={TEXT_DARK} size={20} />
              </TouchableOpacity>
            </View>

            {/* Live Preview Badge */}
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.previewBadge,
                  {
                    backgroundColor: `${selectedColor}18`,
                    borderColor: selectedColor,
                  },
                ]}
              >
                <Text style={styles.previewEmoji}>
                  {customEmojiInput.trim() || selectedEmoji}
                </Text>
                <Text style={[styles.previewName, { color: selectedColor }]}>
                  {methodName.trim() || 'Payment Method Name'}
                </Text>
              </View>
              <Text style={styles.previewHint}>Live Preview</Text>
            </View>

            {/* Name Input */}
            <Text style={styles.inputLabel}>PAYMENT METHOD NAME</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g. PayPal, Amazon Pay, Forex Card"
              placeholderTextColor={TEXT_MUTED}
              value={methodName}
              onChangeText={setMethodName}
              maxLength={26}
              autoFocus
            />

            {/* Emoji Selection */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.inputLabel}>CHOOSE ICON</Text>
              <TextInput
                style={styles.customEmojiInput}
                placeholder="Custom emoji"
                placeholderTextColor={TEXT_MUTED}
                value={customEmojiInput}
                onChangeText={setCustomEmojiInput}
                maxLength={4}
              />
            </View>
            <View style={styles.emojiGrid}>
              {PRESET_EMOJIS.map((emoji, idx) => {
                const isSelected =
                  !customEmojiInput && selectedEmoji === emoji;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.emojiCell,
                      isSelected && {
                        backgroundColor: `${selectedColor}30`,
                        borderColor: selectedColor,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => {
                      setCustomEmojiInput('');
                      setSelectedEmoji(emoji);
                    }}
                  >
                    <Text style={styles.emojiCellText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Color Swatches */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>
              CHOOSE COLOR
            </Text>
            <View style={styles.colorPaletteGrid}>
              {PRESET_COLORS.map((color, idx) => {
                const isSelected = selectedColor === color;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      isSelected && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {isSelected && <Check stroke="#FFF" size={16} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveModal}
              >
                <LinearGradient
                  colors={[BRAND_PRIMARY, BRAND_SECONDARY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGradient}
                >
                  <Text style={styles.saveBtnText}>
                    {editingMethod ? 'Save Changes' : 'Create Method'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG_APP,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: TEXT_DARK,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND_PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    ...SHADOWS.card,
  },
  addHeaderBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#FFF',
  },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8EAF0',
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: TEXT_DARK,
    paddingVertical: 0,
  },
  countBadge: {
    backgroundColor: '#FFF',
    height: 42,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EAF0',
  },
  countBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: BRAND_PRIMARY,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    height: 72,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: TEXT_DARK,
  },
  count: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: TEXT_DARK,
    marginTop: 6,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.strong,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: TEXT_DARK,
  },
  closeBtn: {
    padding: 4,
  },

  // Preview
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  previewEmoji: {
    fontSize: 22,
  },
  previewName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  previewHint: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  inputLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  nameInput: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: TEXT_DARK,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E8EAF0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customEmojiInput: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: TEXT_DARK,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAF0',
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 90,
    textAlign: 'right',
  },

  // Emoji Grid
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EAF0',
  },
  emojiCellText: {
    fontSize: 20,
  },

  // Color Swatches
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  colorSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    ...SHADOWS.card,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: TEXT_MUTED,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  saveBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFF',
  },

  // ── Reorder Controls & Hints ──
  sixDotsHandle: {
    width: 36,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginLeft: -4,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  hintText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#4F46E5',
    flex: 1,
    lineHeight: 16,
  },

  // ── Pinned Bottom Section ──
  pinnedSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pinnedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  pinnedSectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pinnedBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: TEXT_DARK,
  },
  pinnedCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pinnedLeftIndicator: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
});
