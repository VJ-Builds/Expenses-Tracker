import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, LayoutAnimation, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import { Calendar, ChevronLeft, ChevronRight, BarChart2, PieChart as PieChartIcon } from 'lucide-react-native';

import { FONTS, SHADOWS, RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getExpenses, getCategoryTotals, getDailyTotals, getMonthlyTotals } from '../db/queries';
import { formatINR, todayISO, lastNDays, currentMonthStart, currentMonthEnd, currentYearStart } from '../utils/dateHelpers';
import AnimatedBackground from '../components/AnimatedBackground';

const { width: SCREEN_W } = Dimensions.get('window');
const BRAND_PURPLE = '#FF6B6B'; // Sunset Horizon Primary
const BG_APP = '#F7F8FA';
const TEXT_DARK = '#1C1C28';
const TEXT_MUTED = '#8F92A1';

const TABS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(key, delta) {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthDisplay(key) {
  const [year, month] = key.split('-');
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`;
}

const PIE_COLORS = ['#FF6B6B', '#FF8E53', '#F59E0B', '#10B981', '#4B5563', '#EF4444'];

export default function ReportsScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Monthly');
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());

  const [totalExpenses, setTotalExpenses] = useState(0);
  const [chartLineData, setChartLineData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [categoryList, setCategoryList] = useState([]);

  const loadData = useCallback(() => {
    if (!user) return;
    
    const [year, month] = monthKey.split('-');
    let startDate = '';
    let endDate = '';
    let lineChartData = [];

    const today = new Date();

    if (activeTab === 'Daily') {
      startDate = todayISO();
      endDate = todayISO();
      // Daily line chart could show hours, but since we don't have time, just leave it empty or show a single point.
    } else if (activeTab === 'Weekly') {
      const d = new Date();
      d.setDate(d.getDate() - 6); // Last 7 days
      startDate = d.toISOString().split('T')[0];
      endDate = todayISO();
      
      const daily = getDailyTotals(user.id, startDate, endDate);
      lineChartData = daily.map(item => ({
        value: item.total,
        label: item.date.substring(5, 10), // MM-DD
      }));
    } else if (activeTab === 'Monthly') {
      startDate = `${year}-${month}-01`;
      endDate = `${year}-${month}-31`;
      
      const daily = getDailyTotals(user.id, startDate, endDate);
      lineChartData = daily.map(item => ({
        value: item.total,
        label: item.date.substring(8, 10), // DD
      }));
    } else if (activeTab === 'Yearly') {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      
      const monthly = getMonthlyTotals(user.id, startDate, endDate);
      lineChartData = monthly.map(item => ({
        value: item.total,
        label: MONTH_LABELS[parseInt(item.month.split('-')[1], 10) - 1], // Jan, Feb...
      }));
    }

    // Total
    const exps = getExpenses({ userId: user.id, startDate, endDate });
    const total = exps.reduce((s, e) => s + e.amount, 0);
    setTotalExpenses(total);
    setChartLineData(lineChartData);

    // Category pie chart
    const cats = getCategoryTotals(user.id, startDate, endDate);
    const formattedPie = cats.slice(0, 6).map((c, i) => ({
      value: Math.round(c.total),
      color: PIE_COLORS[i] || '#8F92A1',
      label: c.name,
      pct: total > 0 ? Math.round((c.total / total) * 100) : 0,
    }));
    setPieData(formattedPie.length > 0 ? formattedPie : [{ value: 1, color: '#E8EAF0', label: 'No Data', pct: 0 }]);
    const catsList = cats.slice(0, 6).map((c, i) => ({
      ...c,
      color: PIE_COLORS[i] || '#8F92A1',
      pct: total > 0 ? Math.round((c.total / total) * 100) : 0,
    }));
    
    setCategoryList(catsList);
  }, [user, monthKey, activeTab]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }, [loadData])
  );

  return (
    <View style={styles.safeArea}>
      <AnimatedBackground />

      {/* Segmented Control */}
      <View style={styles.segmentWrap}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.segmentTab, activeTab === tab && styles.segmentTabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Month/Year Selector (only for Monthly and Yearly) */}
        {(activeTab === 'Monthly' || activeTab === 'Yearly') && (
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => setMonthKey(k => shiftMonth(k, activeTab === 'Yearly' ? -12 : -1))}>
              <ChevronLeft stroke={TEXT_DARK} size={22} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {activeTab === 'Yearly' ? monthKey.split('-')[0] : getMonthDisplay(monthKey)}
            </Text>
            <TouchableOpacity onPress={() => setMonthKey(k => shiftMonth(k, activeTab === 'Yearly' ? 12 : 1))}>
              <ChevronRight stroke={TEXT_DARK} size={22} />
            </TouchableOpacity>
          </View>
        )}

        {/* Total Expenses Card + Line Chart */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Expenses</Text>
          <Text style={styles.cardAmount}>{formatINR(totalExpenses)}</Text>
          {chartLineData.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
              <LineChart
                data={chartLineData}
                color={BRAND_PURPLE}
                thickness={2.5}
                dataPointsColor={BRAND_PURPLE}
                dataPointsRadius={4}
                startFillColor={BRAND_PURPLE + '30'}
                endFillColor="transparent"
                areaChart
                xAxisColor="#E8EAF0"
                yAxisColor="transparent"
                hideYAxisText
                xAxisLabelTextStyle={{ color: TEXT_MUTED, fontSize: 10, fontFamily: FONTS.medium }}
                spacing={Math.max(40, (SCREEN_W - 80) / Math.max(chartLineData.length, 1))}
                initialSpacing={10}
                isAnimated
                curved
              />
            </ScrollView>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <BarChart2 stroke={BRAND_PURPLE} size={28} opacity={0.6} />
              </View>
              <Text style={styles.emptyTitle}>No chart data</Text>
              <Text style={styles.emptySub}>We don't have enough data to generate a trend line for this period.</Text>
            </View>
          )}
        </View>

        {/* Spending by Category */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Spending by Category</Text>
          <View style={styles.pieSection}>
            {/* Donut */}
            <PieChart
              data={pieData}
              donut
              radius={80}
              innerRadius={55}
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterAmount}>{formatINR(totalExpenses).replace('.00', '')}</Text>
                  <Text style={styles.pieCenterSub}>Total</Text>
                </View>
              )}
              strokeColor={BG_APP}
              strokeWidth={3}
              isAnimated
            />
          </View>

          {/* Legend table */}
          <View style={styles.legendTable}>
            {categoryList.map((cat, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>{cat.name}</Text>
                </View>
                <Text style={styles.legendAmount}>{formatINR(cat.total)}</Text>
                <Text style={[styles.legendPct, { color: cat.color }]}>{cat.pct}%</Text>
              </View>
            ))}
            {categoryList.length === 0 && (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconWrap}>
                  <PieChartIcon stroke={BRAND_PURPLE} size={28} opacity={0.6} />
                </View>
                <Text style={styles.emptyTitle}>No spending recorded</Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxl, color: TEXT_DARK },
  iconBtn: { padding: 6, borderRadius: RADIUS.md, backgroundColor: '#FFF', ...SHADOWS.card },

  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#EDEEF5',
    borderRadius: RADIUS.full,
    padding: 4,
  },
  segmentTab: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.full, alignItems: 'center' },
  segmentTabActive: { backgroundColor: '#FFF', ...SHADOWS.card },
  segmentText: { fontFamily: FONTS.semiBold, fontSize: 12, color: TEXT_MUTED },
  segmentTextActive: { color: BRAND_PURPLE, fontFamily: FONTS.bold },

  content: { paddingHorizontal: 20, paddingBottom: 100 },

  monthRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  monthLabel: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md, color: TEXT_DARK },

  card: {
    backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    padding: 20, marginBottom: 16, ...SHADOWS.card,
  },
  cardLabel: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginBottom: 4 },
  cardAmount: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxxl, color: TEXT_DARK },
  cardSectionTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: TEXT_DARK, marginBottom: 16 },

  emptyWrap: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: BRAND_PURPLE + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.md, color: TEXT_DARK },
  emptySub: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginTop: 4, textAlign: 'center', lineHeight: 20 },

  pieSection: { alignItems: 'center', marginBottom: 20 },
  pieCenter: { alignItems: 'center' },
  pieCenterAmount: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: TEXT_DARK },
  pieCenterSub: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginTop: 2 },

  legendTable: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm, color: TEXT_DARK, flex: 1 },
  legendAmount: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.sm, color: TEXT_DARK, width: 90, textAlign: 'right' },
  legendPct: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.sm, width: 40, textAlign: 'right' },
});
