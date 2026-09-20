/**
 * Wrong Way: Don't be mad - Match Replay Viewer Modal
 * Step-by-step interactive replay player with step forward, step backward,
 * play/pause auto-playback, and move logs.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../../constants/theme';
import {
  THEME,
  MAP_TYPES,
  DUEL_SIZES,
  BOARD_DIMENSIONS,
  getStartPositions,
  getGoalRows,
} from '../constants/wrongWayConstants';
import WrongWayBoard from './WrongWayBoard';

export default function ReplayViewerModal({
  visible,
  replay, // { id, mapType, duelSize, rows, cols, startTokens, moveHist, moves, winner }
  onClose,
  darkMode = true,
}) {
  const insets = useSafeAreaInsets();
  const theme = darkMode ? THEME.dark : THEME.light;
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef(null);

  const history = replay?.moveHist || replay?.moves || [];
  const totalSteps = history.length;

  // Reset to beginning when opening new replay
  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      setIsPlaying(false);
    }
  }, [visible, replay]);

  // Compute game state at the current stepIndex
  const currentState = React.useMemo(() => {
    if (!replay) return null;

    const mapType = replay.mapType || MAP_TYPES.DUEL;
    const duelSize = replay.duelSize || DUEL_SIZES.STANDARD;
    const defaultDims = mapType === MAP_TYPES.DUEL
      ? BOARD_DIMENSIONS[MAP_TYPES.DUEL][duelSize]
      : (BOARD_DIMENSIONS[mapType] || { rows: 9, cols: 9 });

    const rows = replay.rows || defaultDims.rows;
    const cols = replay.cols || defaultDims.cols;
    const goalRows = getGoalRows(mapType, duelSize);

    const defaultStart = getStartPositions(mapType, duelSize);
    const tokens = { ...(replay.startTokens || defaultStart) };
    const walls = new Set(replay.initialWalls || []);
    const wallOwners = { ...(replay.initialWallOwners || {}) };

    for (let i = 0; i <= stepIndex && i < history.length; i++) {
      const m = history[i];
      if (m.type === 'move' && m.to) {
        tokens[m.player] = m.to;
      } else if (m.type === 'barricade' && m.wallKey) {
        walls.add(m.wallKey);
        wallOwners[m.wallKey] = m.player;
      } else if (m.type === 'break_wall' && m.wallKey) {
        walls.delete(m.wallKey);
        delete wallOwners[m.wallKey];
      }
    }

    const currentMove = history[stepIndex] || null;
    const activeTurn = currentMove ? (currentMove.player === 'A' ? 'B' : 'A') : 'A';

    return { tokens, walls, wallOwners, rows, cols, goalRows, mapType, currentMove, activeTurn };
  }, [replay, history, stepIndex]);

  // Auto-play timer loop
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setStepIndex(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, totalSteps]);

  if (!visible || !replay || !currentState) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.bg,
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }]}
            onPress={onClose}
          >
            <Text style={[styles.closeBtnText, { color: theme.text }]}>✕ Close</Text>
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: theme.text }]}>Match Replay</Text>
            <Text style={[styles.subtitle, { color: theme.subtle }]}>
              Winner: {replay.winner === 'A' ? '🔴 Red' : '🔵 Blue'}
            </Text>
          </View>

          <View style={{ width: 60 }} />
        </View>

        {/* Board Display */}
        <View style={styles.boardWrap}>
          <WrongWayBoard
            rows={currentState.rows}
            cols={currentState.cols}
            mapType={currentState.mapType}
            tokens={currentState.tokens}
            walls={currentState.walls}
            wallOwners={currentState.wallOwners}
            goalRows={currentState.goalRows}
            activeTurn={currentState.activeTurn}
            darkMode={darkMode}
          />
        </View>

        {/* Action Description */}
        <View style={[styles.logCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.logStepText, { color: theme.accent }]}>
            Step {stepIndex + 1} of {totalSteps}
          </Text>
          {currentState.currentMove ? (
            <Text style={[styles.logActionText, { color: theme.text }]}>
              {currentState.currentMove.player === 'A' ? '🔴 Red' : '🔵 Blue'}{' '}
              {currentState.currentMove.type === 'move'
                ? `moved to (${currentState.currentMove.to.r}, ${currentState.currentMove.to.c})`
                : currentState.currentMove.type === 'barricade'
                ? `placed wall ${currentState.currentMove.wallKey}`
                : `smashed wall ${currentState.currentMove.wallKey}`}
            </Text>
          ) : (
            <Text style={[styles.logActionText, { color: theme.subtle }]}>
              Game Start Position
            </Text>
          )}
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsRow}>
          {/* Step Back */}
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: theme.card }]}
            onPress={() => {
              setIsPlaying(false);
              setStepIndex(prev => Math.max(0, prev - 1));
            }}
            disabled={stepIndex <= 0}
          >
            <Text style={[styles.ctrlBtnText, { color: theme.text }]}>⏮</Text>
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: theme.accent }]}
            onPress={() => setIsPlaying(p => !p)}
          >
            <Text style={styles.playBtnText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
          </TouchableOpacity>

          {/* Step Forward */}
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: theme.card }]}
            onPress={() => {
              setIsPlaying(false);
              setStepIndex(prev => Math.min(totalSteps - 1, prev + 1));
            }}
            disabled={stepIndex >= totalSteps - 1}
          >
            <Text style={[styles.ctrlBtnText, { color: theme.text }]}>⏭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  closeBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 2,
  },
  boardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  logStepText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  logActionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 36,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnText: {
    fontSize: 20,
  },
  playBtn: {
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFF',
  },
});
