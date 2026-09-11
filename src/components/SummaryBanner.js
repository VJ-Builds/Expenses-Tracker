import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { formatINR } from '../utils/dateHelpers';

/**
 * Top-level summary card showing current month total and budget progress.
 */
export default function SummaryBanner({ monthTotal, budget }) {
  const hasBudget  = Boolean(budget && budget > 0);
  const pct        = hasBudget ? Math.min((monthTotal / budget) * 100, 100) : 0;
  const overBudget = hasBudget && monthTotal > budget;

  const barColor = overBudget
    ? COLORS.danger
    : pct > 75
      ? COLORS.warning
      : COLORS.success;

  return (
    <LinearGradient
      colors={['#2D1B69', '#1A0A2E']}
      style={styles.banner}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Top row */}
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>Total Spent This Month</Text>
          <Text style={[styles.amount, overBudget && styles.amountDanger]}>
            {formatINR(monthTotal)}
          </Text>
        </View>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>💰</Text>
        </View>
      </View>

      {/* Budget bar */}
      {hasBudget && (
        <View style={styles.budgetSection}>
          <View style={styles.budgetLabelRow}>
            <Text style={styles.budgetLabel}>
              {overBudget ? '⚠️  Over budget!' : `Budget: ${formatINR(budget)}`}
            </Text>
            <Text style={[styles.budgetPct, { color: barColor }]}>
              {pct.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
          </View>
        </View>
      )}

      {!hasBudget && (
        <Text style={styles.noBudget}>Set a monthly budget in settings to track limits</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:        { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, letterSpacing: 0.5 },
  amount:       { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxl, color: COLORS.textPrimary, marginTop: 4 },
  amountDanger: { color: COLORS.danger },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary + '55',
  },
  icon:          { fontSize: 24 },
  budgetSection: { marginTop: SPACING.sm },
  budgetLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  budgetLabel:   { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  budgetPct:     { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.xs },
  barBg:         { height: 6, backgroundColor: COLORS.bgInput, borderRadius: RADIUS.full, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: RADIUS.full },
  noBudget:      { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: SPACING.xs },
});
