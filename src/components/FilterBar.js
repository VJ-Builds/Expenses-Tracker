import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { CATEGORIES } from '../constants/categories';

/**
 * Horizontal filter bar for the Dashboard.
 * Lets users filter by category (pill chips).
 */
export default function FilterBar({ filters, onChange }) {
  const allCategories = [{ id: null, name: 'All', icon: '🔘', color: COLORS.primary }, ...CATEGORIES];

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {allCategories.map((cat) => {
          const active = filters.categoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id ?? 'all'}
              style={[
                styles.chip,
                active && { backgroundColor: cat.color + '33', borderColor: cat.color },
              ]}
              onPress={() => onChange({ ...filters, categoryId: cat.id })}
              activeOpacity={0.75}
            >
              <Text style={styles.chipEmoji}>{cat.icon}</Text>
              <Text style={[styles.chipText, active && { color: cat.color }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:       { marginBottom: SPACING.xs },
  scroll:     { paddingHorizontal: SPACING.md, gap: SPACING.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  chipEmoji:  { fontSize: 13 },
  chipText:   { fontFamily: FONTS.medium, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
});
