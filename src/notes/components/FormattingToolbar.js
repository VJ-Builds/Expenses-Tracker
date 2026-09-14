import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  ChevronDown,
  Plus,
  Minus,
} from 'lucide-react-native';

const QUICK_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];

export const INK_COLORS = [
  { hex: '#0F172A', label: 'Black' },
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#059669', label: 'Green' },
  { hex: '#DC2626', label: 'Red' },
  { hex: '#7C3AED', label: 'Purple' },
  { hex: '#D97706', label: 'Amber' },
  { hex: '#DB2777', label: 'Pink' },
  { hex: '#475569', label: 'Gray' },
];

export default function FormattingToolbar({
  fontSize = 16,
  inkColor = '#0F172A',
  textAlign = 'left',
  showAlignment = true,
  activeFormats = {},
  onApplyFormat,
  onChangeTextAlign,
}) {
  const [activeSubMenu, setActiveSubMenu] = useState(null); // 'size' | 'color' | null

  const currentSize = Math.max(6, Math.min(48, Number(fontSize) || 16));

  const toggleSubMenu = (menu) => {
    setActiveSubMenu((prev) => (prev === menu ? null : menu));
  };

  const handleStepSize = (delta) => {
    const next = Math.max(6, Math.min(48, currentSize + delta));
    onApplyFormat('size', next);
  };

  return (
    <View style={styles.container}>
      {/* ── Submenu Panel (Sizes or Colors) ── */}
      {activeSubMenu === 'size' && (
        <View style={styles.subPanel}>
          {/* Stepper with live size badge */}
          <View style={styles.stepperWrap}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => handleStepSize(-1)}
              activeOpacity={0.7}
              accessibilityLabel="Decrease font size"
            >
              <Minus stroke="#1E293B" size={13} strokeWidth={2.4} />
            </TouchableOpacity>

            <View style={styles.stepperBadge}>
              <Text style={styles.stepperBadgeText}>{currentSize} px</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => handleStepSize(1)}
              activeOpacity={0.7}
              accessibilityLabel="Increase font size"
            >
              <Plus stroke="#1E293B" size={13} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={styles.subSeparator} />

          {/* Quick size pills 6 to 48 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subPanelScroll}>
            {QUICK_SIZES.map((sz) => {
              const isCurrent = currentSize === sz;
              return (
                <TouchableOpacity
                  key={sz}
                  style={[styles.sizeChip, isCurrent && styles.sizeChipActive]}
                  onPress={() => onApplyFormat('size', sz)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sizeChipText, isCurrent && styles.sizeChipTextActive]}>
                    {sz}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {activeSubMenu === 'color' && (
        <View style={styles.subPanel}>
          <Text style={styles.subPanelLabel}>INK COLOR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subPanelScroll}>
            {INK_COLORS.map((item) => {
              const isCurrent = (inkColor || '#0F172A').toLowerCase() === item.hex.toLowerCase();
              return (
                <TouchableOpacity
                  key={item.hex}
                  style={[
                    styles.colorDotBtn,
                    isCurrent && styles.colorDotBtnActive,
                  ]}
                  onPress={() => {
                    onApplyFormat('color', item.hex);
                    setActiveSubMenu(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.colorDotInner, { backgroundColor: item.hex }]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Main Horizontal Toolbar ── */}
      <View style={styles.mainBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mainBarScroll}
          keyboardShouldPersistTaps="always"
        >
          {/* 1. Size Stepper & Dropdown Pill */}
          <View style={styles.sizeSection}>
            <TouchableOpacity
              style={styles.inlineStepBtn}
              onPress={() => handleStepSize(-1)}
              activeOpacity={0.7}
              accessibilityLabel="Decrease font size"
            >
              <Minus stroke="#475569" size={11} strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sizeSelectorPill, activeSubMenu === 'size' && styles.btnActive]}
              onPress={() => toggleSubMenu('size')}
              activeOpacity={0.7}
            >
              <Text style={styles.sizeSelectorText}>{currentSize}</Text>
              <ChevronDown stroke="#64748B" size={11} strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inlineStepBtn}
              onPress={() => handleStepSize(1)}
              activeOpacity={0.7}
              accessibilityLabel="Increase font size"
            >
              <Plus stroke="#475569" size={11} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          {/* 2. Ink Color Pill */}
          <TouchableOpacity
            style={[styles.colorSelectorPill, activeSubMenu === 'color' && styles.btnActive]}
            onPress={() => toggleSubMenu('color')}
            activeOpacity={0.7}
            accessibilityLabel="Ink Color"
          >
            <Palette stroke="#475569" size={15} strokeWidth={2.2} />
            <View style={[styles.currentColorIndicator, { backgroundColor: inkColor || '#0F172A' }]} />
          </TouchableOpacity>

          <View style={styles.separator} />

          {/* 3. Style Buttons: B, I, U, S */}
          <TouchableOpacity
            style={[styles.iconBtn, activeFormats.bold && styles.btnActive]}
            onPress={() => onApplyFormat('bold')}
            activeOpacity={0.7}
            accessibilityLabel="Bold"
          >
            <Bold stroke={activeFormats.bold ? '#2563EB' : '#1E293B'} size={15} strokeWidth={2.4} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, activeFormats.italic && styles.btnActive]}
            onPress={() => onApplyFormat('italic')}
            activeOpacity={0.7}
            accessibilityLabel="Italic"
          >
            <Italic stroke={activeFormats.italic ? '#2563EB' : '#1E293B'} size={15} strokeWidth={2.4} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, activeFormats.underline && styles.btnActive]}
            onPress={() => onApplyFormat('underline')}
            activeOpacity={0.7}
            accessibilityLabel="Underline"
          >
            <Underline stroke={activeFormats.underline ? '#2563EB' : '#1E293B'} size={15} strokeWidth={2.4} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, activeFormats.strike && styles.btnActive]}
            onPress={() => onApplyFormat('strike')}
            activeOpacity={0.7}
            accessibilityLabel="Strikethrough"
          >
            <Strikethrough stroke={activeFormats.strike ? '#2563EB' : '#1E293B'} size={15} strokeWidth={2.4} />
          </TouchableOpacity>

          {/* 4. Text Alignment (optional, hidden for checklist) */}
          {showAlignment && (
            <>
              <View style={styles.separator} />

              <TouchableOpacity
                style={[styles.iconBtn, textAlign === 'left' && styles.btnActive]}
                onPress={() => onChangeTextAlign && onChangeTextAlign('left')}
                activeOpacity={0.7}
                accessibilityLabel="Align Left"
              >
                <AlignLeft stroke={textAlign === 'left' ? '#2563EB' : '#64748B'} size={15} strokeWidth={2.2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, textAlign === 'center' && styles.btnActive]}
                onPress={() => onChangeTextAlign && onChangeTextAlign('center')}
                activeOpacity={0.7}
                accessibilityLabel="Align Center"
              >
                <AlignCenter stroke={textAlign === 'center' ? '#2563EB' : '#64748B'} size={15} strokeWidth={2.2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, textAlign === 'right' && styles.btnActive]}
                onPress={() => onChangeTextAlign && onChangeTextAlign('right')}
                activeOpacity={0.7}
                accessibilityLabel="Align Right"
              >
                <AlignRight stroke={textAlign === 'right' ? '#2563EB' : '#64748B'} size={15} strokeWidth={2.2} />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  subPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepperBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stepperBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  subSeparator: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
  },
  subPanelLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  subPanelScroll: {
    alignItems: 'center',
    gap: 6,
  },
  sizeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
  },
  sizeChipActive: {
    backgroundColor: '#2563EB',
  },
  sizeChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  sizeChipTextActive: {
    color: '#FFFFFF',
  },
  colorDotBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  colorDotBtnActive: {
    borderColor: '#2563EB',
  },
  colorDotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  mainBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  mainBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sizeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 2,
  },
  inlineStepBtn: {
    width: 20,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  sizeSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  colorSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentColorIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  separator: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
  },
  iconBtn: {
    width: 29,
    height: 29,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
});
