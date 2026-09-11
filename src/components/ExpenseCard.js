import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Trash2, Pencil } from 'lucide-react-native';

import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatINR } from '../utils/dateHelpers';

// Relative date helper: "Today", "Yesterday", or "13 Jul"
const relativeDate = (dateStr) => {
  const expDate = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(expDate, today)) return 'Today';
  if (sameDay(expDate, yesterday)) return 'Yesterday';
  return expDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default function ExpenseCard({ expense, onEdit, onDelete, readonly = false }) {
  const { colors } = useTheme();
  const iconBg = (expense.category_color || '#FF6B6B') + '20';

  const confirmDelete = () => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
      {/* Category Icon Circle */}
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Text style={styles.icon}>{expense.category_icon || '📦'}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
          {expense.category_name || 'General'}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
          {expense.description || expense.payment_method || '—'}
        </Text>
      </View>

      {/* Amount + Date */}
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>
          {formatINR(expense.amount)}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {relativeDate(expense.date)}
        </Text>
      </View>

      {/* Swipe-style actions (visible only if onDelete or onEdit provided) */}
      {!readonly && (onEdit || onDelete) && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '18' }]} onPress={onEdit}>
              <Pencil stroke={colors.primary} size={16} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF444418' }]} onPress={confirmDelete}>
              <Trash2 stroke="#EF4444" size={16} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...SHADOWS.card,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  categoryName: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md },
  description: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, marginTop: 2 },
  right: { alignItems: 'flex-end', marginLeft: 8 },
  amount: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md },
  date: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
