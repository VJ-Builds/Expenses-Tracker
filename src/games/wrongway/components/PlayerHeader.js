/**
 * Wrong Way: Don't be mad - Player Status Header Component
 * Displays Player A vs Player B status cards, active turn indicators, remaining walls,
 * digital timer countdowns, and quick menu/emote trigger buttons.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { FONTS } from '../../../constants/theme';
import { PLAYER_COLORS, THEME } from '../constants/wrongWayConstants';

export default function PlayerHeader({
  playerA = { name: 'Player 1', walls: 10, timeSec: null },
  playerB = { name: 'Player 2', walls: 10, timeSec: null },
  activeTurn = 'A',
  isVsBot = false,
  timerMode = 'none',
  onOpenEmotes,
  onGiveUp,
  darkMode = true,
}) {
  const theme = darkMode ? THEME.dark : THEME.light;

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isBlitz = timerMode.startsWith('blitz');

  return (
    <View style={styles.container}>
      {/* Player A Card */}
      <View
        style={[
          styles.playerCard,
          activeTurn === 'A' && [
            styles.playerCardActive,
            {
              borderColor: PLAYER_COLORS.A.primary,
              shadowColor: PLAYER_COLORS.A.primary,
            },
          ],
          {
            backgroundColor: theme.card,
            borderColor: activeTurn === 'A' ? PLAYER_COLORS.A.primary : theme.cardBorder,
          },
        ]}
      >
        <View style={styles.avatarWrap}>
          <View
            style={[
              styles.avatarDot,
              { backgroundColor: PLAYER_COLORS.A.primary },
            ]}
          />
          <Text
            style={[styles.playerName, { color: theme.text }]}
            numberOfLines={1}
          >
            {playerA.name}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.wallPill}>
            <Text style={styles.wallIcon}>🧱</Text>
            <Text style={[styles.wallText, { color: theme.text }]}>
              {playerA.walls}
            </Text>
          </View>

          {playerA.timeSec !== null && (
            <View
              style={[
                styles.timerPill,
                activeTurn === 'A' && isBlitz && playerA.timeSec <= 3 && styles.timerUrgent,
              ]}
            >
              <Text style={styles.timerText}>{formatTime(playerA.timeSec)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Center VS & Emote Trigger */}
      <View style={styles.centerCol}>
        <View style={[styles.vsBadge, { backgroundColor: theme.cellHover }]}>
          <Text style={[styles.vsText, { color: theme.subtle }]}>VS</Text>
        </View>

        {onOpenEmotes && (
          <TouchableOpacity
            style={[styles.emoteBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={onOpenEmotes}
            activeOpacity={0.7}
          >
            <Text style={styles.emoteBtnEmoji}>💬</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Player B Card */}
      <View
        style={[
          styles.playerCard,
          activeTurn === 'B' && [
            styles.playerCardActive,
            {
              borderColor: PLAYER_COLORS.B.primary,
              shadowColor: PLAYER_COLORS.B.primary,
            },
          ],
          {
            backgroundColor: theme.card,
            borderColor: activeTurn === 'B' ? PLAYER_COLORS.B.primary : theme.cardBorder,
          },
        ]}
      >
        <View style={styles.avatarWrap}>
          <View
            style={[
              styles.avatarDot,
              { backgroundColor: PLAYER_COLORS.B.primary },
            ]}
          />
          <Text
            style={[styles.playerName, { color: theme.text }]}
            numberOfLines={1}
          >
            {playerB.name}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.wallPill}>
            <Text style={styles.wallIcon}>🧱</Text>
            <Text style={[styles.wallText, { color: theme.text }]}>
              {playerB.walls}
            </Text>
          </View>

          {playerB.timeSec !== null && (
            <View
              style={[
                styles.timerPill,
                activeTurn === 'B' && isBlitz && playerB.timeSec <= 3 && styles.timerUrgent,
              ]}
            >
              <Text style={styles.timerText}>{formatTime(playerB.timeSec)}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  playerCard: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  playerCardActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    transform: [{ translateY: -2 }],
  },
  avatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  avatarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playerName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  wallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  wallIcon: {
    fontSize: 11,
  },
  wallText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  timerPill: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timerUrgent: {
    backgroundColor: '#EF4444',
  },
  timerText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },
  centerCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  vsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vsText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  emoteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoteBtnEmoji: {
    fontSize: 13,
  },
});
