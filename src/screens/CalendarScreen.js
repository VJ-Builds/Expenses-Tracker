import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import { getExpenses, getDailyTotals } from '../db/queries';
import { formatINR, todayISO } from '../utils/dateHelpers';
import ExpenseCard from '../components/ExpenseCard';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [currentMonth, setCurrentMonth] = useState(todayISO().substring(0, 7)); // YYYY-MM
  const [dailyTotals, setDailyTotals] = useState([]);
  const [dayExpenses, setDayExpenses] = useState([]);

  // Fetch daily totals for the currently viewed month
  const loadMonthData = useCallback((monthStr) => {
    if (!user) return;
    const start = `${monthStr}-01`;
    const end = `${monthStr}-31`;
    const totals = getDailyTotals(user.id, start, end);
    setDailyTotals(totals);
  }, [user]);

  // Fetch expenses for the selected day
  const loadDayData = useCallback((dateStr) => {
    if (!user) return;
    const data = getExpenses({ userId: user.id, startDate: dateStr, endDate: dateStr });
    setDayExpenses(data);
  }, [user]);

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [currentMonth, loadMonthData]);

  useEffect(() => {
    loadDayData(selectedDate);
  }, [selectedDate, loadDayData]);

  useFocusEffect(
    useCallback(() => {
      loadMonthData(currentMonth);
      loadDayData(selectedDate);
    }, [currentMonth, selectedDate, loadMonthData, loadDayData])
  );

  const totalsMap = useMemo(() => {
    const map = {};
    dailyTotals.forEach(d => {
      map[d.date] = d.total;
    });
    return map;
  }, [dailyTotals]);

  const onMonthChange = (month) => {
    setCurrentMonth(month.dateString.substring(0, 7));
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: SPACING.md }}>
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Calendar View</Text>
      </View>

      <View style={[styles.calendarWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Calendar
          current={selectedDate}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.textSecondary,
            monthTextColor: colors.textPrimary,
            textMonthFontFamily: FONTS.semiBold,
            textDayHeaderFontFamily: FONTS.medium,
            arrowColor: colors.primary,
          }}
          dayComponent={({ date, state }) => {
            const isSelected = date.dateString === selectedDate;
            const total = totalsMap[date.dateString];
            const isToday = date.dateString === todayISO();

            let textColor = colors.textPrimary;
            if (state === 'disabled') textColor = colors.textMuted;
            else if (isSelected) textColor = '#fff';
            else if (isToday) textColor = colors.primary;

            return (
              <TouchableOpacity
                onPress={() => onDayPress(date)}
                style={[
                  styles.dayContainer,
                  isSelected && { backgroundColor: colors.primary, borderRadius: RADIUS.sm }
                ]}
              >
                <Text style={[styles.dayText, { color: textColor }]}>
                  {date.day}
                </Text>
                {total > 0 && (
                  <Text style={[styles.dayTotal, { color: isSelected ? '#fff' : colors.accent }]} numberOfLines={1}>
                    {formatINR(total).replace('.00', '')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: colors.textPrimary }]}>
          Transactions on {selectedDate}
        </Text>
      </View>

      <FlatList
        data={dayExpenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ExpenseCard expense={item} onEdit={null} onDelete={null} readonly />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌴</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No spending</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>You didn't spend anything on this day.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: SPACING.md, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  title: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.xl },
  calendarWrap: { margin: SPACING.md, padding: SPACING.sm, borderRadius: RADIUS.xl, borderWidth: 1 },
  
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 45, height: 45,
  },
  dayText: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.md },
  dayTotal: { fontFamily: FONTS.bold, fontSize: 8, marginTop: 2 },
  
  listHeader: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  listTitle: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md },
  listContent: { paddingBottom: SPACING.xxl },
  
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md, marginTop: SPACING.sm },
  emptySub: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, marginTop: 4 },
});
