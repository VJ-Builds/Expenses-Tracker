import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getDailyTotals, getCategoryTotals, getMonthlyTotals } from '../db/queries';
import {
  lastNDays, currentWeekStart, currentMonthStart,
  currentYearStart, todayISO, formatShortDate, formatINR,
} from '../utils/dateHelpers';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - SPACING.md * 2 - SPACING.lg * 2;

const TIMEFRAMES = [
  { key: 'week',  label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year',  label: 'Yearly' },
];

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [timeframe, setTimeframe]       = useState('week');
  const [barData, setBarData]           = useState([]);
  const [pieData, setPieData]           = useState([]);
  const [monthlyData, setMonthlyData]   = useState([]);
  const [topCategory, setTopCategory]   = useState(null);
  const [totalSpent, setTotalSpent]     = useState(0);

  const loadCharts = useCallback(() => {
    if (!user) return;
    const today = todayISO();
    let startDate;

    if (timeframe === 'week')  startDate = currentWeekStart();
    if (timeframe === 'month') startDate = currentMonthStart();
    if (timeframe === 'year')  startDate = currentYearStart();

    // Bar / Line data
    const dailyRows = getDailyTotals(user.id, startDate, today);
    const dayMap = {};
    dailyRows.forEach((r) => { dayMap[r.date] = r.total; });

    let days = [];
    if (timeframe === 'week')  days = lastNDays(7);
    if (timeframe === 'month') days = lastNDays(30);
    if (timeframe === 'year')  days = lastNDays(365);

    // For year, aggregate by month buckets
    let barItems;
    if (timeframe === 'year') {
      const monthBuckets = {};
      days.forEach((d) => {
        const mk = d.slice(0, 7);
        monthBuckets[mk] = (monthBuckets[mk] || 0) + (dayMap[d] || 0);
      });
      barItems = Object.entries(monthBuckets).map(([mk, val]) => ({
        value: Math.round(val),
        label: mk.slice(5), // MM
        frontColor: COLORS.primary,
        topLabelComponent: () => null,
      }));
    } else {
      barItems = days.map((d) => ({
        value: Math.round(dayMap[d] || 0),
        label: timeframe === 'week' ? formatShortDate(d) : d.slice(8),
        frontColor: dayMap[d] ? COLORS.primary : COLORS.border,
        topLabelComponent: () => null,
      }));
    }
    setBarData(barItems);

    // Pie data
    const catRows = getCategoryTotals(user.id, startDate, today);
    const total = catRows.reduce((s, c) => s + c.total, 0);
    setTotalSpent(total);
    setTopCategory(catRows[0] || null);
    setPieData(
      catRows.map((c) => ({
        value: Math.round(c.total),
        color: c.color,
        text: c.icon,
        label: c.name,
      }))
    );
  }, [user?.id, timeframe]);

  useFocusEffect(useCallback(() => { loadCharts(); }, [loadCharts]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A0A2E', '#0F0F1A']} style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSub}>Visualize your spending patterns</Text>
        </LinearGradient>

        {/* Timeframe toggles */}
        <View style={styles.toggleWrap}>
          {TIMEFRAMES.map((tf) => (
            <TouchableOpacity
              key={tf.key}
              style={[styles.toggleBtn, timeframe === tf.key && styles.toggleBtnActive]}
              onPress={() => setTimeframe(tf.key)}
            >
              {timeframe === tf.key ? (
                <LinearGradient colors={COLORS.gradientPrimary} style={styles.toggleGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.toggleTextActive}>{tf.label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.toggleText}>{tf.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Total Spent</Text>
            <Text style={styles.summaryCardValue}>{formatINR(totalSpent)}</Text>
          </View>
          {topCategory && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardLabel}>Top Category</Text>
              <Text style={styles.summaryCardEmoji}>{topCategory.icon}</Text>
              <Text style={[styles.summaryCardValue, { fontSize: FONTS.sizes.md }]}>{topCategory.name}</Text>
            </View>
          )}
        </View>

        {/* Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {timeframe === 'week' ? 'This Week' : timeframe === 'month' ? 'This Month' : 'This Year'} — Daily Spend
          </Text>
          {barData.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                width={Math.max(CHART_W, barData.length * 38)}
                height={200}
                barWidth={timeframe === 'year' ? 24 : 20}
                spacing={timeframe === 'year' ? 10 : 6}
                roundedTop
                roundedBottom
                hideRules
                xAxisColor={COLORS.border}
                yAxisColor={COLORS.border}
                yAxisTextStyle={{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 9 }}
                noOfSections={4}
                maxValue={Math.max(...barData.map((d) => d.value), 100)}
                isAnimated
              />
            </ScrollView>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No data for this period</Text>
            </View>
          )}
        </View>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Category Breakdown</Text>
            <View style={styles.pieWrap}>
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterText}>📊</Text>
                  </View>
                )}
                strokeColor={COLORS.bg}
                strokeWidth={2}
                isAnimated
              />
              {/* Legend */}
              <View style={styles.legend}>
                {pieData.map((item, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                    <Text style={styles.legendValue}>₹{item.value.toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: COLORS.bg },
  container:  { paddingBottom: SPACING.xxl },
  header:     { padding: SPACING.lg, paddingBottom: SPACING.md },
  headerTitle:{ fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxl, color: COLORS.textPrimary },
  headerSub:  { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  toggleWrap: {
    flexDirection: 'row', marginHorizontal: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: 4, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleBtn: {
    flex: 1, borderRadius: RADIUS.sm - 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', height: 36,
  },
  toggleBtnActive: {},
  toggleGradient:  { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  toggleText:      { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  toggleTextActive:{ fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm, color: '#fff' },
  summaryRow:      { flexDirection: 'row', marginHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.md },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  summaryCardLabel:{ fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginBottom: 4 },
  summaryCardValue:{ fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.textPrimary },
  summaryCardEmoji:{ fontSize: 24, marginBottom: 2 },
  chartCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  chartTitle:    { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, marginBottom: SPACING.md },
  emptyChart:    { height: 160, alignItems: 'center', justifyContent: 'center' },
  emptyChartText:{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm },
  pieWrap:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  pieCenter:     { alignItems: 'center', justifyContent: 'center' },
  pieCenterText: { fontSize: 28 },
  legend:        { flex: 1, marginLeft: SPACING.md, gap: 6 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:     { width: 10, height: 10, borderRadius: 5 },
  legendLabel:   { flex: 1, fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  legendValue:   { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.xs, color: COLORS.textPrimary },
});
