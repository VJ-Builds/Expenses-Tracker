/**
 * Wrong Way: Don't be mad - Wall Controls Component
 * Toolbar for selecting Horizontal or Vertical wall placement, tracking remaining barricades,
 * hammer activation, and turn skip actions.
 * Zero layout shifting: static dimensions, no jumpy cancel button.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { FONTS } from '../../../constants/theme';
import { THEME } from '../constants/wrongWayConstants';

export default function WallControls({
  wallMode,               // 'H' | 'V' | null
  onSelectWallMode,       // (mode) => void
  wallsRemaining = 10,
  hasHammer = false,
  hammerActive = false,
  onToggleHammer,
  canSkip = false,
  onSkipTurn,
  darkMode = true,
  disabled = false,
  accentColor,
  playerLabel,
  inverted = false,       // For top player in local 2-player mode
}) {
  const theme = darkMode ? THEME.dark : THEME.light;
  const activeColor = accentColor || theme.accent;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        disabled && styles.containerDisabled,
        inverted && styles.containerInverted,
      ]}
    >
      {/* Top row: Wall Placement Buttons & Counter */}
      <View style={styles.buttonRow}>
        {/* Horizontal Wall Button */}
        <TouchableOpacity
          style={[
            styles.toolBtn,
            {
              backgroundColor: wallMode === 'H' ? activeColor : theme.cellHover,
              borderColor: wallMode === 'H' ? activeColor : theme.cardBorder,
            },
            wallsRemaining <= 0 && styles.toolBtnDisabled,
          ]}
          onPress={() => onSelectWallMode(wallMode === 'H' ? null : 'H')}
          disabled={disabled || wallsRemaining <= 0}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.hWallIcon,
              { backgroundColor: wallMode === 'H' ? '#FFF' : theme.text },
            ]}
          />
          <Text
            style={[
              styles.toolBtnText,
              { color: wallMode === 'H' ? '#FFF' : theme.text },
            ]}
          >
            Horizontal
          </Text>
        </TouchableOpacity>

        {/* Center: Remaining Count Badge & Player Label */}
        <View style={styles.counterBadge}>
          {playerLabel ? (
            <Text style={[styles.playerBadgeText, { color: activeColor }]}>
              {playerLabel}
            </Text>
          ) : null}
          <Text style={[styles.counterNumber, { color: activeColor }]}>
            {wallsRemaining}
          </Text>
          <Text style={[styles.counterLabel, { color: theme.subtle }]}>
            WALLS
          </Text>
        </View>

        {/* Vertical Wall Button */}
        <TouchableOpacity
          style={[
            styles.toolBtn,
            {
              backgroundColor: wallMode === 'V' ? activeColor : theme.cellHover,
              borderColor: wallMode === 'V' ? activeColor : theme.cardBorder,
            },
            wallsRemaining <= 0 && styles.toolBtnDisabled,
          ]}
          onPress={() => onSelectWallMode(wallMode === 'V' ? null : 'V')}
          disabled={disabled || wallsRemaining <= 0}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.vWallIcon,
              { backgroundColor: wallMode === 'V' ? '#FFF' : theme.text },
            ]}
          />
          <Text
            style={[
              styles.toolBtnText,
              { color: wallMode === 'V' ? '#FFF' : theme.text },
            ]}
          >
            Vertical
          </Text>
        </TouchableOpacity>
      </View>

      {/* Optional fixed hammer or skip actions (if active) */}
      {(hasHammer || canSkip) && (
        <View style={styles.specialRow}>
          {hasHammer && (
            <TouchableOpacity
              style={[
                styles.specialBtn,
                hammerActive ? styles.hammerBtnActive : { backgroundColor: '#F59E0B' },
              ]}
              onPress={onToggleHammer}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Text style={styles.specialBtnText}>
                {hammerActive ? '🔨 Tap Wall to Smash' : '🔨 Hammer Ready'}
              </Text>
            </TouchableOpacity>
          )}

          {canSkip && (
            <TouchableOpacity
              style={[styles.specialBtn, { backgroundColor: '#64748B' }]}
              onPress={onSkipTurn}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Text style={styles.specialBtnText}>Skip Turn ➔</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  containerDisabled: {
    opacity: 0.45,
  },
  containerInverted: {
    transform: [{ rotate: '180deg' }],
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  toolBtnDisabled: {
    opacity: 0.3,
  },
  toolBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  hWallIcon: {
    width: 16,
    height: 5,
    borderRadius: 2.5,
  },
  vWallIcon: {
    width: 5,
    height: 16,
    borderRadius: 2.5,
  },
  counterBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 4,
  },
  playerBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  counterNumber: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    lineHeight: 20,
  },
  counterLabel: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  specialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 8,
  },
  specialBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  hammerBtnActive: {
    backgroundColor: '#D97706',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  specialBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FFF',
  },
});
