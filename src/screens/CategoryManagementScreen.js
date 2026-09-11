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
  FlatList,
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
  Tag,
  ShieldAlert,
  GripVertical,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { FONTS, RADIUS, SHADOWS } from '../constants/theme';
import {
  getCategoriesWithStats,
  addCategory,
  updateCategory,
  deleteCategorySafe,
  updateCategoriesOrder,
} from '../db/queries';
import { syncUp } from '../utils/syncManager';

const BRAND_PRIMARY = '#FF6B6B';
const BRAND_SECONDARY = '#8862F8';
const BG_APP = '#F7F8FA';
const TEXT_DARK = '#1C1C28';
const TEXT_MUTED = '#8F92A1';

const SLOT_HEIGHT = 82; // 72px card height + 10px margin

const PRESET_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#A78BFA',
  '#F97316',
  '#FBBF24',
  '#EC4899',
  '#3B82F6',
  '#10B981',
  '#84CC16',
  '#8862F8',
  '#06B6D4',
  '#E11D48',
  '#6366F1',
  '#6B7280',
];

const PRESET_EMOJIS = [
  '🍽️', '🚗', '🛍️', '💊', '💡', '🎬',
  '📚', '🏠', '🛒', '📦', '☕', '🍕',
  '🍔', '🏋️', '✈️', '🎮', '🐾', '💼',
  '🎁', '💈', '⚡', '🩺', '🌿', '🍿',
  '🍺', '👕', '🚕', '📱', '🎟️', '🍼',
  '⚽', '🏖️', '🏨', '🎂', '🧼', '🔧',
];

function ReorderableCard({
  cat,
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

  const count = cat.expense_count || 0;
  const catColor = cat.color || '#6B7280';

  const animatedStyle = isDragging
    ? {
        transform: [{ translateY: dragY }, { scale: dragScale }],
        zIndex: 9999,
        elevation: 16,
        borderColor: BRAND_SECONDARY,
        borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
      }
    : {
        transform: [{ translateY: itemOffset }],
        zIndex: 1,
        elevation: 2,
      };

  return (
    <Animated.View style={[styles.categoryCard, animatedStyle]}>
      {/* Six Dots Drag Handle */}
      <View {...panResponder.panHandlers} style={styles.sixDotsHandle}>
        <GripVertical
          stroke={isDragging ? BRAND_SECONDARY : '#6B7280'}
          size={20}
        />
      </View>

      {/* Left Icon Badge */}
      <View style={[styles.catIconWrap, { backgroundColor: catColor + '20' }]}>
        <Text style={styles.catIconText}>{cat.icon || '📦'}</Text>
      </View>

      {/* Info */}
      <View style={styles.catInfo}>
        <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
        <Text style={styles.catCount}>
          {count === 0 ? 'No expenses recorded' : `${count} transaction${count === 1 ? '' : 's'}`}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => onEdit(cat)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Pencil stroke={TEXT_MUTED} size={18} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: '#FEE2E2' }]}
          onPress={() => onDelete(cat)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 stroke="#EF4444" size={17} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function CategoryManagementScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📦');
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(() => {
    if (!user) return;
    try {
      const list = getCategoriesWithStats(user.id);
      setCategories(list);
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  // Separate reorderable categories from the static 'Other' category
  const { reorderableCategories, otherCategory } = useMemo(() => {
    let other = null;
    const reorderable = [];

    categories.forEach((cat) => {
      const isOther = cat.id === 10 || cat.name?.toLowerCase() === 'other';
      if (isOther && !other) {
        other = cat;
      } else {
        reorderable.push(cat);
      }
    });

    return { reorderableCategories: reorderable, otherCategory: other };
  }, [categories]);

  // Continuous Drag & Drop State
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const itemOffsets = useRef([]);
  const isReorderingRef = useRef(false);

  // Sync offsets array length with reorderableCategories
  while (itemOffsets.current.length < reorderableCategories.length) {
    itemOffsets.current.push(new Animated.Value(0));
  }
  if (itemOffsets.current.length > reorderableCategories.length) {
    itemOffsets.current = itemOffsets.current.slice(0, reorderableCategories.length);
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
    const targetHover = Math.max(0, Math.min(reorderableCategories.length - 1, startIdx + shift));
    setHoverIndex(prev => (prev !== targetHover ? targetHover : prev));
  }, [dragY, reorderableCategories.length]);

  const handleEndDrag = useCallback((startIdx, dy) => {
    const shift = Math.round(dy / SLOT_HEIGHT);
    const finalTarget = Math.max(0, Math.min(reorderableCategories.length - 1, startIdx + shift));

    if (finalTarget === startIdx) {
      // User dropped in the same slot: smoothly spring back to original position
      Animated.parallel([
        Animated.spring(dragScale, { toValue: 1, friction: 7, tension: 100, useNativeDriver: true }),
        Animated.spring(dragY, { toValue: 0, friction: 7, tension: 100, useNativeDriver: true }),
      ]).start(() => {
        itemOffsets.current.forEach(a => a.setValue(0));
        setDraggingIndex(null);
        setHoverIndex(null);
      });
      return;
    }

    // User dropped into a DIFFERENT slot!
    isReorderingRef.current = true;

    // 1. Smoothly snap dragY to the exact target slot position
    const targetOffset = (finalTarget - startIdx) * SLOT_HEIGHT;
    Animated.parallel([
      Animated.spring(dragScale, { toValue: 1, friction: 7, tension: 100, useNativeDriver: true }),
      Animated.timing(dragY, { toValue: targetOffset, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      // 2. Prepare the new reordered list
      const next = [...reorderableCategories];
      const [moved] = next.splice(startIdx, 1);
      next.splice(finalTarget, 0, moved);
      const fullList = otherCategory ? [...next, otherCategory] : next;

      // 3. Immediately set all offsets to 0
      itemOffsets.current.forEach(a => a.setValue(0));
      dragY.setValue(0);

      // 4. Update categories in state AND keep draggingIndex pointing to finalTarget
      // so the moved card NEVER falls back to startIdx for any frame!
      setCategories(fullList);
      setDraggingIndex(finalTarget);
      setHoverIndex(null);

      // 5. On the next frame when React has committed the new layout at finalTarget, clear the drag index
      requestAnimationFrame(() => {
        setDraggingIndex(null);
        isReorderingRef.current = false;
      });

      try {
        const ids = fullList.map(c => c.id);
        updateCategoriesOrder(user.id, ids);
        if (user) syncUp(user).catch(() => {});
      } catch (e) {
        console.error('Failed to update category order:', e);
      }
    });
  }, [dragScale, dragY, reorderableCategories, otherCategory, user]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(c => c.name?.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCategoryName('');
    setSelectedEmoji('🛍️');
    setSelectedColor('#FF6B6B');
    setModalVisible(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name || '');
    setSelectedEmoji(category.icon || '📦');
    setSelectedColor(category.color || '#6B7280');
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      Alert.alert('Category Name Required', 'Please enter a name for the category.');
      return;
    }

    // Check for duplicate names (case-insensitive) excluding current editing
    const duplicate = categories.find(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() &&
           (!editingCategory || c.id !== editingCategory.id)
    );
    if (duplicate) {
      Alert.alert('Duplicate Category', `A category named "${trimmedName}" already exists.`);
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        updateCategory(editingCategory.id, trimmedName, selectedEmoji, selectedColor);
      } else {
        addCategory(user.id, trimmedName, selectedEmoji, selectedColor);
      }

      loadCategories();
      setModalVisible(false);

      // Trigger background cloud sync
      if (user) syncUp(user).catch(() => {});
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (category) => {
    // Protect the fallback 'Other' category (id = 10 or name 'Other')
    if (category.id === 10 || category.name?.toLowerCase() === 'other') {
      Alert.alert(
        'Protected Category',
        'The "Other" category is required as the default fallback for uncategorized expenses and cannot be deleted.'
      );
      return;
    }

    const expenseCount = category.expense_count || 0;
    const message = expenseCount > 0
      ? `"${category.name}" has ${expenseCount} recorded expense${expenseCount === 1 ? '' : 's'}.\n\nDeleting this category will safely move these expenses to "Other" so your transactions are preserved.\n\nAre you sure?`
      : `Are you sure you want to delete the category "${category.name}"?`;

    Alert.alert(
      'Delete Category',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: expenseCount > 0 ? 'Delete & Reassign' : 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              deleteCategorySafe(user.id, category.id);
              loadCategories();
              // Trigger background cloud sync
              if (user) syncUp(user).catch(() => {});
            } catch (error) {
              Alert.alert('Delete Failed', error.message || 'Unable to delete category.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft stroke={TEXT_DARK} size={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Categories</Text>

        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={handleOpenAdd}
          activeOpacity={0.8}
        >
          <Plus stroke="#FFF" size={18} />
          <Text style={styles.addHeaderBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search stroke={TEXT_MUTED} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor={TEXT_MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X stroke={TEXT_MUTED} size={16} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{categories.length}</Text>
        </View>
      </View>

      {/* ── Category List ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND_PRIMARY} />
        </View>
      ) : (
        <ScrollView
          scrollEnabled={draggingIndex === null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {searchQuery.trim().length > 0 ? (
            /* Search Mode: Show filtered list directly */
            <>
              {filteredCategories.map((cat) => {
                const isProtected = cat.id === 10 || cat.name?.toLowerCase() === 'other';
                const count = cat.expense_count || 0;
                const catColor = cat.color || '#6B7280';

                return (
                  <View key={cat.id} style={styles.categoryCard}>
                    {/* Left Icon Badge */}
                    <View style={[styles.catIconWrap, { backgroundColor: catColor + '20' }]}>
                      <Text style={styles.catIconText}>{cat.icon || '📦'}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.catInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                        {isProtected && (
                          <View style={styles.protectedBadge}>
                            <Text style={styles.protectedBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.catCount}>
                        {count === 0 ? 'No expenses recorded' : `${count} transaction${count === 1 ? '' : 's'}`}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleOpenEdit(cat)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Pencil stroke={TEXT_MUTED} size={18} />
                      </TouchableOpacity>

                      {!isProtected ? (
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => handleDeleteCategory(cat)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 stroke="#EF4444" size={17} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { opacity: 0.35 }]}
                          onPress={() => handleDeleteCategory(cat)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 stroke={TEXT_MUTED} size={17} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            /* Normal Mode: Continuous Reorderable items + Pin-anchored 'Other' at the very bottom */
            <>
              {reorderableCategories.length > 0 && (
                <View style={styles.hintBanner}>
                  <Text style={styles.hintText}>
                    💡 Press & hold the six dots (⋮⋮) to drag any category up or down to any position. "Other" is always fixed at the bottom.
                  </Text>
                </View>
              )}

              {reorderableCategories.map((cat, index) => {
                const isItemDragging = draggingIndex === index;
                const offsetAnim = itemOffsets.current[index] || new Animated.Value(0);

                return (
                  <ReorderableCard
                    key={cat.id}
                    cat={cat}
                    index={index}
                    isDragging={isItemDragging}
                    dragY={dragY}
                    dragScale={dragScale}
                    itemOffset={offsetAnim}
                    onStartDrag={handleStartDrag}
                    onMoveDrag={handleMoveDrag}
                    onEndDrag={handleEndDrag}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteCategory}
                  />
                );
              })}

              {/* Anchored Bottom "Other" Category */}
              {otherCategory && (
                <View style={styles.pinnedSection}>
                  <View style={styles.pinnedSectionHeader}>
                    <Text style={styles.pinnedSectionTitle}>FIXED DEFAULT CATEGORY</Text>
                    <View style={styles.pinnedBadge}>
                      <Text style={styles.pinnedBadgeText}>📌 Always at bottom</Text>
                    </View>
                  </View>

                  <View style={[styles.categoryCard, styles.pinnedCard]}>
                    <View style={styles.pinnedLeftIndicator}>
                      <Text style={{ fontSize: 13, opacity: 0.6 }}>⚓</Text>
                    </View>

                    <View style={[styles.catIconWrap, { backgroundColor: (otherCategory.color || '#6B7280') + '20' }]}>
                      <Text style={styles.catIconText}>{otherCategory.icon || '📦'}</Text>
                    </View>

                    <View style={styles.catInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.catName} numberOfLines={1}>{otherCategory.name}</Text>
                        <View style={styles.protectedBadge}>
                          <Text style={styles.protectedBadgeText}>Default</Text>
                        </View>
                      </View>
                      <Text style={styles.catCount}>
                        {(otherCategory.expense_count || 0) === 0
                          ? 'No expenses recorded'
                          : `${otherCategory.expense_count} transaction${otherCategory.expense_count === 1 ? '' : 's'}`}
                      </Text>
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleOpenEdit(otherCategory)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Pencil stroke={TEXT_MUTED} size={18} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionIconBtn, { opacity: 0.35 }]}
                        onPress={() => handleDeleteCategory(otherCategory)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 stroke={TEXT_MUTED} size={17} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {filteredCategories.length === 0 && (
            <View style={styles.emptyWrap}>
              <Tag stroke={TEXT_MUTED} size={40} opacity={0.5} />
              <Text style={styles.emptyTitle}>No categories found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? `No category matches "${searchQuery}"` : 'Tap "+ Add" to create your first category.'}
              </Text>
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'New Category'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X stroke={TEXT_DARK} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Live Preview Badge */}
              <View style={styles.previewContainer}>
                <View style={[styles.previewBadge, { backgroundColor: selectedColor + '25', borderColor: selectedColor }]}>
                  <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
                  <Text style={[styles.previewName, { color: selectedColor }]}>
                    {categoryName.trim() || 'Category Name'}
                  </Text>
                </View>
                <Text style={styles.previewHint}>Live Preview</Text>
              </View>

              {/* Name Input */}
              <Text style={styles.inputLabel}>CATEGORY NAME</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="e.g., Snacks, Gym, Pet Care"
                placeholderTextColor={TEXT_MUTED}
                value={categoryName}
                onChangeText={setCategoryName}
                maxLength={30}
              />

              {/* Emoji Selection Grid */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.inputLabel}>CHOOSE ICON</Text>
                <TextInput
                  style={styles.customEmojiInput}
                  placeholder="Custom emoji"
                  placeholderTextColor={TEXT_MUTED}
                  value={PRESET_EMOJIS.includes(selectedEmoji) ? '' : selectedEmoji}
                  onChangeText={(val) => { if (val) setSelectedEmoji(val.trim()); }}
                  maxLength={4}
                />
              </View>
              <View style={styles.emojiGrid}>
                {PRESET_EMOJIS.map((emoji) => {
                  const isSelected = selectedEmoji === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiCell,
                        isSelected && { backgroundColor: selectedColor + '30', borderColor: selectedColor, borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedEmoji(emoji)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emojiCellText}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Color Palette Picker */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>CHOOSE COLOR</Text>
              <View style={styles.colorPaletteGrid}>
                {PRESET_COLORS.map((c) => {
                  const isSelected = selectedColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                      onPress={() => setSelectedColor(c)}
                      activeOpacity={0.8}
                    >
                      {isSelected && <Check stroke="#FFF" size={16} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveCategory}
                disabled={saving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[BRAND_PRIMARY, BRAND_SECONDARY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBtnGradient}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingCategory ? 'Update Category' : 'Create Category'}
                    </Text>
                  )}
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
  safeArea: {
    flex: 1,
    backgroundColor: BG_APP,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: BG_APP,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
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
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    height: 72,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catIconText: {
    fontSize: 20,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: TEXT_DARK,
  },
  catCount: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  protectedBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  protectedBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: TEXT_MUTED,
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
