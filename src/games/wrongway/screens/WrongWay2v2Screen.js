/**
 * Wrong Way: Don't be mad - 2 vs 2 Team Battle Screen
 * 4-player team arena on 9x9 board:
 * Team Red (A1, A2) vs Team Blue (B1, B2).
 * Alternates turns A1 -> B1 -> A2 -> B2 with shared team walls.
 * Both teammates must cross to the opposing side to win!
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import {
  ArrowLeft,
  RotateCcw,
  Swords,
  Home,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../../constants/theme';
import {
  MAP_TYPES,
  BOARD_DIMENSIONS,
  getStartPositions,
  getGoalRows,
  THEME,
  PLAYER_COLORS,
} from '../constants/wrongWayConstants';
import {
  getValidMoves,
  tryWall2v2,
} from '../engine/boardLogic';
import { getSettings, updateSettings } from '../engine/storageService';
import audio from '../engine/audioService';

import WrongWayBoard from '../components/WrongWayBoard';
import WallControls from '../components/WallControls';
import FallingGlitters from '../components/FallingGlitters';

export default function WrongWay2v2Screen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    getSettings().then(cfg => {
      if (typeof cfg.darkMode === 'boolean') {
        setDarkMode(cfg.darkMode);
      }
    });
  }, []);

  const toggleTheme = async () => {
    const next = !darkMode;
    setDarkMode(next);
    audio.haptic('light');
    await updateSettings({ darkMode: next });
  };

  const theme = darkMode ? THEME.dark : THEME.light;

  const { rows, cols } = BOARD_DIMENSIONS[MAP_TYPES.TWO_V_TWO];
  const startPositions = getStartPositions(MAP_TYPES.TWO_V_TWO);
  const goalRows = getGoalRows(MAP_TYPES.TWO_V_TWO);

  const turnOrder = ['A1', 'B1', 'A2', 'B2'];

  const [tokens, setTokens] = useState(startPositions);
  const [walls, setWalls] = useState(new Set());
  const [wallOwners, setWallOwners] = useState({});
  const [teamBarr, setTeamBarr] = useState({ A: 10, B: 10 });
  const [turnIndex, setTurnIndex] = useState(0);
  const [reached, setReached] = useState({ A1: false, A2: false, B1: false, B2: false });
  const [winner, setWinner] = useState(null); // 'Team Red' | 'Team Blue' | null
  const [showVictoryModal, setShowVictoryModal] = useState(false);

  const [wallMode, setWallMode] = useState(null);
  const [previewKey, setPreviewKey] = useState(null);
  const [isPreviewValid, setIsPreviewValid] = useState(true);

  const activeToken = turnOrder[turnIndex];
  const currentTeam = activeToken.startsWith('A') ? 'A' : 'B';
  const hasReachedGoal = reached[activeToken];

  // Advance to next turn in rotation
  const nextTurn = () => {
    setTurnIndex(prev => (prev + 1) % turnOrder.length);
    setWallMode(null);
    setPreviewKey(null);
  };

  // Valid moves for current token
  const validMoves = React.useMemo(() => {
    if (winner || hasReachedGoal) return [];
    const myPos = tokens[activeToken];
    const otherTokens = turnOrder
      .filter(id => id !== activeToken)
      .map(id => tokens[id]);
    return getValidMoves(myPos, otherTokens, walls, rows, cols);
  }, [tokens, walls, activeToken, winner, hasReachedGoal, rows, cols]);

  // Handle move
  const handleMove = (r, c) => {
    if (winner || hasReachedGoal) return;
    const isValid = validMoves.some(m => m.r === r && m.c === c);
    if (!isValid) return;

    audio.play('move');

    const nextPos = { r, c };
    const nextTokens = { ...tokens, [activeToken]: nextPos };
    setTokens(nextTokens);

    // Goal check
    const goalRow = goalRows[activeToken];
    let nextReached = { ...reached };
    if (nextPos.r === goalRow) {
      nextReached[activeToken] = true;
      setReached(nextReached);

      // Check if team won
      if (currentTeam === 'A' && nextReached.A1 && nextReached.A2) {
        setWinner('Team Red');
        setShowVictoryModal(true);
        audio.play('win');
        audio.haptic('success');
        return;
      }
      if (currentTeam === 'B' && nextReached.B1 && nextReached.B2) {
        setWinner('Team Blue');
        setShowVictoryModal(true);
        audio.play('win');
        audio.haptic('success');
        return;
      }
    }

    setWallMode(null);
    setPreviewKey(null);
    nextTurn();
  };

  // Handle wall placement (Double-tap to confirm)
  const handlePlaceWall = (r, c, orient) => {
    if (winner || teamBarr[currentTeam] <= 0) return;

    const key = `${orient}-${r}-${c}`;
    const nextWalls = tryWall2v2(key, walls, tokens, goalRows, rows, cols);

    if (previewKey !== key) {
      setPreviewKey(key);
      setIsPreviewValid(!!nextWalls);
      audio.haptic('light');
      return;
    }

    if (!nextWalls) {
      audio.haptic('error');
      Alert.alert(
        '🚫 Illegal Wall',
        'You cannot place a wall here! In 2v2, every player on both teams must retain an open path to their goal.'
      );
      return;
    }

    audio.play('wall');
    audio.haptic('medium');
    setWalls(nextWalls);
    setWallOwners(prev => ({ ...prev, [key]: currentTeam }));
    setTeamBarr(b => ({ ...b, [currentTeam]: b[currentTeam] - 1 }));
    setWallMode(null);
    setPreviewKey(null);
    nextTurn();
  };

  const handleReset = () => {
    setShowVictoryModal(false);
    setTokens(startPositions);
    setWalls(new Set());
    setWallOwners({});
    setTeamBarr({ A: 10, B: 10 });
    setTurnIndex(0);
    setReached({ A1: false, A2: false, B1: false, B2: false });
    setWinner(null);
    setWallMode(null);
    setPreviewKey(null);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 8),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft stroke={theme.text} size={20} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.text }]}>2 vs 2 Team Arena</Text>
          <Text style={[styles.subtitle, { color: theme.accent }]}>
            Shared Walls • 4 Pawns
          </Text>
        </View>

        <View style={styles.navRightGroup}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            {darkMode ? (
              <Sun stroke="#F59E0B" size={18} strokeWidth={2.2} />
            ) : (
              <Moon stroke="#6366F1" size={18} strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <RotateCcw stroke={theme.subtle} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Team Status Banner */}
      <View style={styles.teamBanner}>
        {/* Team Red */}
        <View
          style={[
            styles.teamBox,
            currentTeam === 'A' && styles.teamBoxActive,
            { backgroundColor: theme.card, borderColor: currentTeam === 'A' ? PLAYER_COLORS.A.primary : theme.cardBorder },
          ]}
        >
          <View style={styles.teamHeaderRow}>
            <View style={[styles.dot, { backgroundColor: PLAYER_COLORS.A.primary }]} />
            <Text style={[styles.teamName, { color: PLAYER_COLORS.A.primary }]}>Team Red</Text>
          </View>
          <Text style={[styles.teamStatus, { color: theme.text }]}>
            Walls: {teamBarr.A} • Goals: {(reached.A1 ? 1 : 0) + (reached.A2 ? 1 : 0)}/2
          </Text>
        </View>

        {/* Team Blue */}
        <View
          style={[
            styles.teamBox,
            currentTeam === 'B' && styles.teamBoxActive,
            { backgroundColor: theme.card, borderColor: currentTeam === 'B' ? PLAYER_COLORS.B.primary : theme.cardBorder },
          ]}
        >
          <View style={styles.teamHeaderRow}>
            <View style={[styles.dot, { backgroundColor: PLAYER_COLORS.B.primary }]} />
            <Text style={[styles.teamName, { color: PLAYER_COLORS.B.primary }]}>Team Blue</Text>
          </View>
          <Text style={[styles.teamStatus, { color: theme.text }]}>
            Walls: {teamBarr.B} • Goals: {(reached.B1 ? 1 : 0) + (reached.B2 ? 1 : 0)}/2
          </Text>
        </View>
      </View>

      {/* Turn indicator */}
      <View style={styles.turnIndicatorBar}>
        {wallMode ? (
          <Text style={[styles.turnText, { color: previewKey ? (isPreviewValid ? '#10B981' : '#EF4444') : theme.accent }]}>
            {previewKey
              ? (isPreviewValid ? '✓ Tap slot again to place wall' : '✕ Path blocked! Tap another slot')
              : '👆 Tap an intersection slot to preview wall'}
          </Text>
        ) : (
          <Text style={[styles.turnText, { color: PLAYER_COLORS[activeToken]?.primary || theme.accent }]}>
            Current Turn: {activeToken} ({activeToken.startsWith('A') ? 'Red Team' : 'Blue Team'})
            {hasReachedGoal ? ' (At Goal! Place wall or skip)' : ''}
          </Text>
        )}
      </View>

      {/* Board */}
      <View style={styles.boardWrap}>
        <WrongWayBoard
          rows={rows}
          cols={cols}
          mapType={MAP_TYPES.TWO_V_TWO}
          tokens={tokens}
          walls={walls}
          wallOwners={wallOwners}
          goalRows={goalRows}
          activeTurn={activeToken}
          validMoves={validMoves}
          onCellPress={handleMove}
          wallPlacementMode={wallMode}
          previewWallKey={previewKey}
          isPreviewValid={isPreviewValid}
          onGridIntersectionPress={handlePlaceWall}
          darkMode={darkMode}
        />
      </View>

      {/* Wall Controls */}
      <WallControls
        wallMode={wallMode}
        onSelectWallMode={mode => {
          setWallMode(mode);
          setPreviewKey(null);
        }}
        wallsRemaining={teamBarr[currentTeam]}
        canSkip={hasReachedGoal}
        onSkipTurn={nextTurn}
        darkMode={darkMode}
        disabled={winner !== null}
        accentColor={PLAYER_COLORS[activeToken]?.primary}
        playerLabel={currentTeam === 'A' ? 'Red Team' : 'Blue Team'}
      />

      {/* Floating button to view victory card if user dismissed it to inspect the board */}
      {winner && !showVictoryModal && (
        <TouchableOpacity
          style={[styles.floatingResultBtn, { backgroundColor: winner === 'Team Red' ? '#EF4444' : '#3B82F6' }]}
          onPress={() => setShowVictoryModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingResultText}>🏆 Result</Text>
        </TouchableOpacity>
      )}

      {/* Victory Modal with Falling Glitters */}
      {isFocused && showVictoryModal && winner && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowVictoryModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {/* Close Button to Inspect Board */}
              <TouchableOpacity
                style={styles.closeCardBtn}
                onPress={() => setShowVictoryModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeCardText, { color: theme.subtle }]}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.winEmoji}>🏆</Text>
              <Text style={[styles.winTitle, { color: theme.text }]}>{winner} Wins!</Text>
              <Text style={[styles.winDesc, { color: theme.subtle }]}>
                Both teammates successfully crossed the arena!
              </Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.rematchBtn, { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, elevation: 4 }]}
                  onPress={handleReset}
                >
                  <Text style={styles.rematchBtnText}>Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rematchBtn, { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, elevation: 4 }]}
                  onPress={() => {
                    setShowVictoryModal(false);
                    setWinner(null);
                    navigation.navigate('WrongWayMenu');
                  }}
                >
                  <Text style={styles.rematchBtnText}>Menu</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Colorful Falling Glitters & Sparkles Shower Cascading Across Entire Screen & Card */}
            <FallingGlitters active={true} count={80} />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  teamBanner: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  teamBox: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  teamBoxActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  teamStatus: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  turnIndicatorBar: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  turnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  boardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '90%',
    maxWidth: 330,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    position: 'relative',
  },
  closeCardBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    zIndex: 10,
  },
  closeCardText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  floatingResultBtn: {
    position: 'absolute',
    top: 54,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingResultText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FFF',
  },
  winEmoji: {
    fontSize: 54,
    marginBottom: 10,
  },
  winTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
  },
  winDesc: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  rematchBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  rematchBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFF',
  },
});
