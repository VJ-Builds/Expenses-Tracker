/**
 * Wrong Way: Don't be mad - Main 1v1 Gameplay Screen
 * Implements complete interactive turn-based loop (Vs Bot and Local Pass & Play),
 * real-time BFS path validation, Quoridor jumping, timers, chaos crate drops,
 * hammer smashing, move history replay logging, and victory celebration.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Film,
  Trophy,
  Home,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../../constants/theme';
import {
  MAP_TYPES,
  DUEL_SIZES,
  BOARD_DIMENSIONS,
  TIMER_MODES,
  TIMER_SECONDS,
  getStartPositions,
  getGoalRows,
  THEME,
  PLAYER_COLORS,
} from '../constants/wrongWayConstants';
import {
  getValidMoves,
  tryWall,
  makeHammers,
  pickChaosPos,
  pickFairDropWall,
  isSteelWall,
  generatePresetWalls,
} from '../engine/boardLogic';
import {
  aiEasy,
  aiNormal,
  aiHard,
  aiHammerBreak,
} from '../engine/aiEngine';
import {
  recordMatchResult,
  updateEloRating,
  saveReplay,
  getSettings,
  updateSettings,
} from '../engine/storageService';
import audio from '../engine/audioService';

import WrongWayBoard from '../components/WrongWayBoard';
import WallControls from '../components/WallControls';
import PlayerHeader from '../components/PlayerHeader';
import EmoteOverlay from '../components/EmoteOverlay';
import ReplayViewerModal from '../components/ReplayViewerModal';
import FallingGlitters from '../components/FallingGlitters';

export default function WrongWayGameScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const {
    isVsBot = true,
    difficulty = 'normal',
    mapType = MAP_TYPES.DUEL,
    duelSize = DUEL_SIZES.STANDARD,
    timerMode = TIMER_MODES.NONE,
    chaosMode = false,
    dropMode = null,
    hammerMode = false,
    hammerDrops = 1,
    barricades = 10,
    includeWalls = false,
    wallSeed = 1,
  } = route.params || {};

  const [darkMode, setDarkMode] = useState(route.params?.darkMode ?? true);

  // Load and synchronize theme from storage
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

  // Board dimensions
  const dims = mapType === MAP_TYPES.DUEL
    ? BOARD_DIMENSIONS[MAP_TYPES.DUEL][duelSize]
    : BOARD_DIMENSIONS[mapType];
  const { rows, cols } = dims;

  const startPositions = getStartPositions(mapType, duelSize);
  const goalRows = getGoalRows(mapType, duelSize);

  // Deterministic Initial Maze Walls (Option A: Mulberry32 Seed 1-5000)
  const initialPresetWalls = React.useMemo(() => {
    if (!includeWalls) return [];
    return generatePresetWalls(
      wallSeed,
      rows,
      cols,
      startPositions.A,
      startPositions.B,
      goalRows.A,
      goalRows.B,
      6
    );
  }, [includeWalls, wallSeed, rows, cols, startPositions, goalRows]);

  // ── Game State ──
  const [tokens, setTokens] = useState(startPositions);
  const [walls, setWalls] = useState(() => new Set(initialPresetWalls));
  const [wallOwners, setWallOwners] = useState(() => {
    const o = {};
    initialPresetWalls.forEach(k => {
      o[k] = 'PRESET';
    });
    return o;
  });
  const [barr, setBarr] = useState({ A: barricades, B: barricades });
  const [activeTurn, setActiveTurn] = useState('A'); // 'A' or 'B'
  const [winner, setWinner] = useState(null); // 'A' | 'B' | null

  // Special Items
  const [chaosItem, setChaosItem] = useState(null); // { r, c }
  const [hammers, setHammers] = useState([]);
  const [playerHammers, setPlayerHammers] = useState({ A: 0, B: 0 });
  const [hammerActive, setHammerActive] = useState(false);
  const [breakingWall, setBreakingWall] = useState(null); // { key, color }
  const [pickupNotice, setPickupNotice] = useState(null);
  const pickupTimerRef = useRef(null);

  const showPickupNotification = useCallback((text) => {
    setPickupNotice(text);
    if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current);
    pickupTimerRef.current = setTimeout(() => {
      setPickupNotice(null);
    }, 2600);
  }, []);

  // Wall placement mode
  const [wallMode, setWallMode] = useState(null); // 'H' | 'V' | null
  const [previewKey, setPreviewKey] = useState(null);
  const [isPreviewValid, setIsPreviewValid] = useState(true);

  // Timers
  const [timeA, setTimeA] = useState(() => (timerMode !== TIMER_MODES.NONE ? TIMER_SECONDS[timerMode] : null));
  const [timeB, setTimeB] = useState(() => (timerMode !== TIMER_MODES.NONE ? TIMER_SECONDS[timerMode] : null));
  const turnTimerRef = useRef(null);

  // Replay & History
  const [moveHist, setMoveHist] = useState([]);
  const [recentAiMoves, setRecentAiMoves] = useState([]);
  const [activeReplay, setActiveReplay] = useState(null);
  const [showReplayModal, setShowReplayModal] = useState(false);

  // Emotes
  const [showEmotes, setShowEmotes] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState(null);

  // Game over settlement data & celebration states
  const [settlement, setSettlement] = useState(null);
  const [showVictoryModal, setShowVictoryModal] = useState(false);

  // ── Spawn Items on Game Init ──
  useEffect(() => {
    if (hammerMode) {
      setHammers(makeHammers(rows, cols));
    }
    if (chaosMode) {
      const pos = pickChaosPos(startPositions.A, startPositions.B, new Set(initialPresetWalls), goalRows.A, goalRows.B, rows, cols);
      if (pos) setChaosItem(pos);
    }
  }, []);

  // ── Valid Moves for Active Player ──
  const validMoves = React.useMemo(() => {
    if (winner) return [];
    if (isVsBot && activeTurn === 'B') return []; // Bot thinking
    const myPos = tokens[activeTurn];
    const oppPos = tokens[activeTurn === 'A' ? 'B' : 'A'];
    return getValidMoves(myPos, oppPos, walls, rows, cols);
  }, [tokens, walls, activeTurn, winner, isVsBot, rows, cols]);

  // ── End Game Settlement ──
  const handleVictory = useCallback(async (winPlayer) => {
    setWinner(winPlayer);
    setShowVictoryModal(true);
    audio.play(winPlayer === 'A' ? 'win' : 'lose');
    audio.haptic('success');

    const won = winPlayer === 'A';
    const matchRecord = await recordMatchResult(won, mapType);
    const eloRecord = await updateEloRating(won, 1000, mapType);

    const replayObj = {
      id: 'rep_' + Date.now(),
      mapType,
      duelSize,
      rows,
      cols,
      winner: winPlayer,
      startTokens: startPositions,
      moves: moveHist,
      moveHist: moveHist,
      date: Date.now(),
      finalWalls: Array.from(walls),
      finalTokens: tokens,
      initialWalls: initialPresetWalls,
      initialWallOwners: Object.fromEntries(initialPresetWalls.map(k => [k, 'PRESET'])),
      wallOwners,
    };
    await saveReplay(replayObj);

    setSettlement({
      won,
      earnedXp: matchRecord.earnedXp,
      level: matchRecord.level,
      deltaElo: eloRecord.delta,
      newElo: eloRecord.newRating,
      replayData: replayObj,
    });
  }, [mapType, duelSize, rows, cols, startPositions, moveHist, walls, tokens, initialPresetWalls, wallOwners]);

  // ── Digital Timers Countdown Loop ──
  useEffect(() => {
    if (timerMode === TIMER_MODES.NONE || winner) {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      return;
    }

    const isBlitz = timerMode.startsWith('blitz');

    turnTimerRef.current = setInterval(() => {
      if (activeTurn === 'A') {
        setTimeA(prev => {
          if (prev <= 1) {
            if (isBlitz) {
              audio.play('click');
              setActiveTurn('B');
              return TIMER_SECONDS[timerMode];
            } else {
              handleVictory('B');
              return 0;
            }
          }
          return prev - 1;
        });
      } else {
        setTimeB(prev => {
          if (prev <= 1) {
            if (isBlitz) {
              audio.play('click');
              setActiveTurn('A');
              return TIMER_SECONDS[timerMode];
            } else {
              handleVictory('A');
              return 0;
            }
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [activeTurn, winner, timerMode, handleVictory]);

  // Reset Blitz timer on turn change
  useEffect(() => {
    if (timerMode.startsWith('blitz')) {
      setTimeA(TIMER_SECONDS[timerMode]);
      setTimeB(TIMER_SECONDS[timerMode]);
    }
  }, [activeTurn, timerMode]);

  // ── Random Walls Drop Modifier ──
  useEffect(() => {
    if (!dropMode || winner) return;

    const intervalMs = dropMode === 'veryoften' ? 12000 : dropMode === 'often' ? 22000 : 35000;
    const dropTimer = setInterval(() => {
      const dropKey = pickFairDropWall(tokens.A, tokens.B, walls, goalRows.A, goalRows.B, rows, cols);
      if (dropKey) {
        audio.play('wall');
        setWalls(prev => {
          const next = new Set(prev);
          next.add(dropKey);
          return next;
        });
        setWallOwners(prev => ({ ...prev, [dropKey]: 'SKY' }));
        setMoveHist(h => [...h, { player: 'SKY', type: 'barricade', wallKey: dropKey }]);
      }
    }, intervalMs);

    return () => clearInterval(dropTimer);
  }, [dropMode, winner, tokens, walls, goalRows, rows, cols]);

  // ── Move Token Action ──
  const handleMove = (r, c) => {
    if (winner) return;

    // Check if cell is in valid moves
    const isValid = validMoves.some(m => m.r === r && m.c === c);
    if (!isValid) {
      // If user tapped a goodie from a distance, guide them on how to collect it
      if (hammers.some(h => h.r === r && h.c === c)) {
        audio.haptic('light');
        showPickupNotification('🚶 Move your pawn onto the hammer to collect it!');
      } else if (chaosItem && chaosItem.r === r && chaosItem.c === c) {
        audio.haptic('light');
        showPickupNotification('🚶 Move your pawn onto the crate to get +2 barricades!');
      }
      return;
    }

    audio.play('move');

    const nextPos = { r, c };
    const player = activeTurn;
    const nextTokens = { ...tokens, [player]: nextPos };
    setTokens(nextTokens);

    // Record Move
    setMoveHist(h => [...h, { player, type: 'move', to: nextPos }]);

    // Item pickups
    if (chaosItem && chaosItem.r === r && chaosItem.c === c) {
      audio.play('pickup');
      audio.haptic('success');
      setBarr(b => ({ ...b, [player]: b[player] + 2 }));
      setChaosItem(null);
      showPickupNotification('📦 +2 Barricades Collected!');
    }

    const hammerFound = hammers.find(h => h.r === r && h.c === c);
    if (hammerFound) {
      audio.play('pickup');
      audio.haptic('success');
      setPlayerHammers(p => ({ ...p, [player]: p[player] + 1 }));
      setHammers(hm => hm.filter(h => h.id !== hammerFound.id));
      showPickupNotification('🔨 Hammer Acquired! Tap "Hammer Ready" to smash walls!');
    }

    // Win check
    if (nextPos.r === goalRows[player]) {
      handleVictory(player);
      return;
    }

    // Clear placement preview and switch turn
    setWallMode(null);
    setPreviewKey(null);
    setHammerActive(false);
    setActiveTurn(prev => (prev === 'A' ? 'B' : 'A'));
  };

  // ── Wall Placement Action (Double-Tap to Confirm) ──
  const handlePlaceWall = (r, c, orient) => {
    if (winner || barr[activeTurn] <= 0) return;

    const key = `${orient}-${r}-${c}`;
    const nextWalls = tryWall(key, walls, tokens.A, tokens.B, goalRows.A, goalRows.B, rows, cols);

    // 1st Tap: If preview is not currently on this slot, set preview
    if (previewKey !== key) {
      setPreviewKey(key);
      setIsPreviewValid(!!nextWalls);
      audio.haptic('light');
      return;
    }

    // 2nd Tap on same slot: Confirm and commit!
    if (!nextWalls) {
      audio.haptic('error');
      Alert.alert(
        '🚫 Illegal Placement',
        'You cannot place a wall here! A wall must never completely trap or block any player from their goal.'
      );
      return;
    }

    audio.play('wall');
    audio.haptic('medium');
    setWalls(nextWalls);
    setWallOwners(prev => ({ ...prev, [key]: activeTurn }));
    setBarr(b => ({ ...b, [activeTurn]: b[activeTurn] - 1 }));

    // Record Wall
    setMoveHist(h => [...h, { player: activeTurn, type: 'barricade', wallKey: key }]);

    setWallMode(null);
    setPreviewKey(null);
    setActiveTurn(prev => (prev === 'A' ? 'B' : 'A'));
  };

  // ── Hammer Smash Wall Action ──
  const handleSmashWall = (action, wallKey) => {
    if (action !== 'break_wall' || !hammerActive || playerHammers[activeTurn] <= 0) return;

    if (isSteelWall(wallKey, mapType, rows)) {
      audio.haptic('error');
      Alert.alert('🛡️ Steel Wall', 'Walls directly in front of the goal line are indestructible steel walls!');
      return;
    }

    // Determine wall color for shatter fragments
    const owner = wallOwners[wallKey];
    let wallColor = '#94A3B8';
    if (owner === 'A') wallColor = PLAYER_COLORS.A.primary;
    else if (owner === 'B') wallColor = PLAYER_COLORS.B.primary;
    else if (owner === 'SKY') wallColor = '#F59E0B';

    // Trigger visual collapse animation & audio
    setBreakingWall({ key: wallKey, color: wallColor });
    audio.play('break');
    audio.haptic('heavy');

    // Remove from logical walls immediately so pathfinding updates
    setWalls(prev => {
      const next = new Set(prev);
      next.delete(wallKey);
      return next;
    });
    setWallOwners(prev => {
      const next = { ...prev };
      delete next[wallKey];
      return next;
    });

    setPlayerHammers(p => ({ ...p, [activeTurn]: p[activeTurn] - 1 }));
    setHammerActive(false);

    setMoveHist(h => [...h, { player: activeTurn, type: 'break_wall', wallKey }]);

    // Switch turn once the physical shatter animation completes
    setTimeout(() => {
      setActiveTurn(prev => (prev === 'A' ? 'B' : 'A'));
    }, 520);
  };

  // ── AI Bot Turn Execution ──
  useEffect(() => {
    if (!isVsBot || activeTurn !== 'B' || winner) return;

    const botTimer = setTimeout(() => {
      // 1. Check if bot has hammer and can smash an opponent wall
      if (playerHammers.B > 0) {
        const breakCandidate = aiHammerBreak(tokens.B, walls, goalRows.B, mapType, rows, cols);
        if (breakCandidate) {
          const owner = wallOwners[breakCandidate];
          let wallColor = '#94A3B8';
          if (owner === 'A') wallColor = PLAYER_COLORS.A.primary;
          else if (owner === 'B') wallColor = PLAYER_COLORS.B.primary;
          else if (owner === 'SKY') wallColor = '#F59E0B';

          setBreakingWall({ key: breakCandidate, color: wallColor });
          audio.play('break');
          audio.haptic('heavy');

          setWalls(prev => {
            const next = new Set(prev);
            next.delete(breakCandidate);
            return next;
          });
          setWallOwners(prev => {
            const next = { ...prev };
            delete next[breakCandidate];
            return next;
          });
          setPlayerHammers(p => ({ ...p, B: p.B - 1 }));
          setMoveHist(h => [...h, { player: 'B', type: 'break_wall', wallKey: breakCandidate }]);
          showPickupNotification('🤖 Bot smashed a wall with hammer!');

          setTimeout(() => {
            setActiveTurn('A');
          }, 520);
          return;
        }
      }

      // 2. Decide Move or Wall based on difficulty
      let decision = null;
      if (difficulty === 'easy') {
        decision = aiEasy(tokens.B, tokens.A, walls, barr.B, chaosItem, goalRows.B, goalRows.A, rows, cols);
      } else if (difficulty === 'hard') {
        decision = aiHard(tokens.B, tokens.A, walls, barr.B, barr.A, recentAiMoves, chaosItem, goalRows.B, goalRows.A, rows, cols);
      } else {
        decision = aiNormal(tokens.B, tokens.A, walls, barr.B, chaosItem, goalRows.B, goalRows.A, rows, cols);
      }

      if (decision && decision.type === 'barricade' && decision.walls) {
        audio.play('wall');
        setWalls(decision.walls);
        setBarr(b => ({ ...b, B: b.B - 1 }));
        if (decision.key) {
          setWallOwners(prev => ({ ...prev, [decision.key]: 'B' }));
        }
        setMoveHist(h => [...h, { player: 'B', type: 'barricade', wallKey: decision.key || 'ai-wall' }]);
        setActiveTurn('A');
      } else if (decision && decision.type === 'move' && decision.pos) {
        audio.play('move');
        const nextPos = decision.pos;
        setTokens(prev => ({ ...prev, B: nextPos }));
        setRecentAiMoves(r => [nextPos, ...r].slice(0, 5));

        setMoveHist(h => [...h, { player: 'B', type: 'move', to: nextPos }]);

        // Item pickups for bot
        if (chaosItem && chaosItem.r === nextPos.r && chaosItem.c === nextPos.c) {
          audio.play('pickup');
          setBarr(b => ({ ...b, B: b.B + 2 }));
          setChaosItem(null);
          showPickupNotification('🤖 Bot collected +2 Barricades!');
        }

        const botHammer = hammers.find(h => h.r === nextPos.r && h.c === nextPos.c);
        if (botHammer) {
          audio.play('pickup');
          setPlayerHammers(p => ({ ...p, B: p.B + 1 }));
          setHammers(hm => hm.filter(h => h.id !== botHammer.id));
          showPickupNotification('🤖 Bot collected a Hammer!');
        }

        if (nextPos.r === goalRows.B) {
          handleVictory('B');
          return;
        }

        setActiveTurn('A');
      } else {
        // Fallback: move toward goal
        const fallbackMoves = getValidMoves(tokens.B, tokens.A, walls, rows, cols);
        if (fallbackMoves.length > 0) {
          audio.play('move');
          const nextPos = fallbackMoves[0];
          setTokens(prev => ({ ...prev, B: nextPos }));
          if (chaosItem && chaosItem.r === nextPos.r && chaosItem.c === nextPos.c) {
            audio.play('pickup');
            setBarr(b => ({ ...b, B: b.B + 2 }));
            setChaosItem(null);
          }
          const botHammer = hammers.find(h => h.r === nextPos.r && h.c === nextPos.c);
          if (botHammer) {
            audio.play('pickup');
            setPlayerHammers(p => ({ ...p, B: p.B + 1 }));
            setHammers(hm => hm.filter(h => h.id !== botHammer.id));
          }
          setActiveTurn('A');
        }
      }
    }, 550);

    return () => clearTimeout(botTimer);
  }, [activeTurn, isVsBot, winner, tokens, walls, barr, difficulty, chaosItem, playerHammers, goalRows, rows, cols, mapType, recentAiMoves, handleVictory]);

  // ── Emote Selection ──
  const handleEmoteSelect = (emote) => {
    setFloatingEmote({ emoji: emote.emoji, sender: activeTurn === 'A' ? 'Red' : 'Blue' });
    audio.play('click');
    setTimeout(() => setFloatingEmote(null), 2500);
  };

  // ── Rematch Reset ──
  const handleRematch = () => {
    setShowVictoryModal(false);
    setTokens(startPositions);
    setWalls(new Set(initialPresetWalls));
    const o = {};
    initialPresetWalls.forEach(k => {
      o[k] = 'PRESET';
    });
    setWallOwners(o);
    setBarr({ A: barricades, B: barricades });
    setActiveTurn('A');
    setWinner(null);
    setSettlement(null);
    setMoveHist([]);
    setRecentAiMoves([]);
    setWallMode(null);
    setPreviewKey(null);
    setHammerActive(false);
    setTimeA(timerMode !== TIMER_MODES.NONE ? TIMER_SECONDS[timerMode] : null);
    setTimeB(timerMode !== TIMER_MODES.NONE ? TIMER_SECONDS[timerMode] : null);
    setPlayerHammers({ A: 0, B: 0 });
    setBreakingWall(null);
    setPickupNotice(null);
    if (hammerMode) setHammers(makeHammers(rows, cols));
    if (chaosMode) {
      const pos = pickChaosPos(startPositions.A, startPositions.B, new Set(initialPresetWalls), goalRows.A, goalRows.B, rows, cols);
      if (pos) setChaosItem(pos);
    }
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
      {/* Top Navigation Row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={() => {
            if (!winner && moveHist.length > 0) {
              Alert.alert('Leave Match?', 'Are you sure you want to abandon this game?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
              ]);
            } else {
              navigation.goBack();
            }
          }}
        >
          <ArrowLeft stroke={theme.text} size={20} strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={[styles.modeTitle, { color: theme.text }]}>
          {mapType === MAP_TYPES.DUEL ? 'Duel Arena' : 'Classic Race'}
        </Text>

        <View style={styles.navRightGroup}>
          {/* Light / Dark Mode Quick Toggle */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
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
            style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={handleRematch}
            activeOpacity={0.7}
          >
            <RotateCcw stroke={theme.subtle} size={18} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* For Local 2-Player mode: Player 2 Top Wall Controls (Facing Player 2) */}
      {!isVsBot && (
        <WallControls
          wallMode={activeTurn === 'B' ? wallMode : null}
          onSelectWallMode={mode => {
            if (activeTurn !== 'B') return;
            audio.play('click');
            setWallMode(mode);
            setPreviewKey(null);
            setHammerActive(false);
          }}
          wallsRemaining={barr.B}
          hasHammer={playerHammers.B > 0}
          hammerCount={playerHammers.B}
          hammerActive={activeTurn === 'B' && hammerActive}
          onToggleHammer={() => {
            if (activeTurn !== 'B') return;
            audio.play('click');
            setHammerActive(h => !h);
            setWallMode(null);
            setPreviewKey(null);
          }}
          darkMode={darkMode}
          disabled={winner !== null || activeTurn !== 'B'}
          accentColor={PLAYER_COLORS.B.primary}
          playerLabel="Player 2"
          inverted={true}
        />
      )}

      {/* Players Header Card */}
      <PlayerHeader
        playerA={{ name: 'Player 1 (Red)', walls: barr.A, timeSec: timeA }}
        playerB={{ name: isVsBot ? `Bot (${difficulty})` : 'Player 2 (Blue)', walls: barr.B, timeSec: timeB }}
        activeTurn={activeTurn}
        isVsBot={isVsBot}
        timerMode={timerMode}
        onOpenEmotes={() => setShowEmotes(true)}
        darkMode={darkMode}
      />

      {/* Floating Pickup Notification Banner */}
      {pickupNotice && (
        <View style={styles.pickupBanner} pointerEvents="none">
          <Text style={styles.pickupBannerText}>{pickupNotice}</Text>
        </View>
      )}

      {/* Main Interactive Game Board */}
      <View style={styles.boardContainer}>
        <WrongWayBoard
          rows={rows}
          cols={cols}
          mapType={mapType}
          tokens={tokens}
          walls={walls}
          wallOwners={wallOwners}
          goalRows={goalRows}
          activeTurn={activeTurn}
          validMoves={validMoves}
          onCellPress={(r, c) => {
            if (r === 'break_wall') {
              handleSmashWall('break_wall', c);
            } else {
              handleMove(r, c);
            }
          }}
          wallPlacementMode={wallMode}
          previewWallKey={previewKey}
          isPreviewValid={isPreviewValid}
          onGridIntersectionPress={handlePlaceWall}
          chaosItem={chaosItem}
          hammers={hammers}
          hammerModeActive={hammerActive}
          breakingWall={breakingWall}
          onShatterComplete={() => setBreakingWall(null)}
          darkMode={darkMode}
        />
      </View>

      {/* Static Visual Hint Bar (Zero Layout Shift) */}
      <View style={styles.hintContainer}>
        {wallMode ? (
          previewKey ? (
            <Text style={[styles.hintText, { color: isPreviewValid ? '#10B981' : '#EF4444' }]}>
              {isPreviewValid ? '✓ Tap slot again to place wall' : '✕ Path blocked! Tap another slot'}
            </Text>
          ) : (
            <Text style={[styles.hintText, { color: activeTurn === 'A' ? PLAYER_COLORS.A.primary : PLAYER_COLORS.B.primary }]}>
              👆 Tap an intersection slot to preview wall
            </Text>
          )
        ) : (
          <Text style={[styles.hintText, { color: theme.subtle }]}>
            {activeTurn === 'A'
              ? (isVsBot ? 'Your turn — Move pawn or pick wall' : "Player 1's turn")
              : (isVsBot ? 'Bot is thinking...' : "Player 2's turn")}
          </Text>
        )}
      </View>

      {/* Bottom Wall Controls (Player 1 / Human) */}
      <WallControls
        wallMode={activeTurn === 'A' ? wallMode : null}
        onSelectWallMode={mode => {
          if (activeTurn !== 'A') return;
          audio.play('click');
          setWallMode(mode);
          setPreviewKey(null);
          setHammerActive(false);
        }}
        wallsRemaining={barr.A}
        hasHammer={playerHammers.A > 0}
        hammerCount={playerHammers.A}
        hammerActive={activeTurn === 'A' && hammerActive}
        onToggleHammer={() => {
          if (activeTurn !== 'A') return;
          audio.play('click');
          setHammerActive(h => !h);
          setWallMode(null);
          setPreviewKey(null);
        }}
        darkMode={darkMode}
        disabled={winner !== null || activeTurn !== 'A'}
        accentColor={PLAYER_COLORS.A.primary}
        playerLabel={!isVsBot ? 'Player 1' : undefined}
      />

      {/* Floating Emote Component */}
      <EmoteOverlay
        visible={showEmotes}
        onClose={() => setShowEmotes(false)}
        onSelectEmote={handleEmoteSelect}
        activeFloatingEmote={floatingEmote}
        darkMode={darkMode}
      />

      {/* Floating button to reopen victory card if user dismissed it to inspect the board */}
      {winner && !showVictoryModal && (
        <TouchableOpacity
          style={[styles.floatingResultBtn, { backgroundColor: winner === 'A' ? '#10B981' : '#3B82F6' }]}
          onPress={() => setShowVictoryModal(true)}
          activeOpacity={0.8}
        >
          <Trophy stroke="#FFF" size={15} />
          <Text style={styles.floatingResultText}>Result</Text>
        </TouchableOpacity>
      )}

      {/* Match Settlement & Victory Modal */}
      {isFocused && showVictoryModal && winner && settlement && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowVictoryModal(false)}
        >
          <View style={styles.victoryBackdrop}>
            <View style={[styles.victoryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {/* Close Button to Inspect Board */}
              <TouchableOpacity
                style={styles.closeCardBtn}
                onPress={() => setShowVictoryModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeCardText, { color: theme.subtle }]}>✕</Text>
              </TouchableOpacity>

              <View style={styles.trophyWrap}>
                <Text style={styles.trophyEmoji}>
                  {winner === 'A' ? '🏆' : '💀'}
                </Text>
              </View>

              <Text style={[styles.victoryTitle, { color: theme.text }]}>
                {winner === 'A' ? 'Victory!' : 'Defeat!'}
              </Text>
              <Text style={[styles.victorySub, { color: theme.accent }]}>
                {winner === 'A' ? 'Player 1 Reached the Goal' : (isVsBot ? 'Bot Outplayed You' : 'Player 2 Won')}
              </Text>

              {/* Settlement stats */}
              <View style={[styles.settleRow, { backgroundColor: theme.cellHover }]}>
                <View style={styles.settleItem}>
                  <Text style={[styles.settleVal, { color: '#10B981' }]}>+{settlement.earnedXp}</Text>
                  <Text style={[styles.settleLbl, { color: theme.subtle }]}>XP Earned</Text>
                </View>
                <View style={styles.settleItem}>
                  <Text style={[styles.settleVal, { color: theme.text }]}>Level {settlement.level}</Text>
                  <Text style={[styles.settleLbl, { color: theme.subtle }]}>Player Rank</Text>
                </View>
                <View style={styles.settleItem}>
                  <Text style={[styles.settleVal, { color: settlement.won ? '#3B82F6' : '#EF4444' }]}>
                    {settlement.deltaElo >= 0 ? `+${settlement.deltaElo}` : settlement.deltaElo}
                  </Text>
                  <Text style={[styles.settleLbl, { color: theme.subtle }]}>ELO Rating</Text>
                </View>
              </View>

              {/* Action Buttons: Rematch (Green), Replay (Blue), and Home (Gold) */}
              <View style={styles.victoryActions}>
                <TouchableOpacity
                  style={[styles.vBtn, { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, elevation: 4 }]}
                  onPress={handleRematch}
                >
                  <RotateCcw stroke="#FFF" size={17} strokeWidth={2.4} />
                  <Text style={[styles.vBtnText, { color: '#FFF' }]}>Rematch</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.vBtn, { backgroundColor: '#0284C7', shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, elevation: 4 }]}
                  onPress={() => {
                    setShowVictoryModal(false);
                    setActiveReplay(settlement.replayData);
                    setShowReplayModal(true);
                  }}
                >
                  <Film stroke="#FFF" size={17} strokeWidth={2.4} />
                  <Text style={[styles.vBtnText, { color: '#FFF' }]}>Replay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.vBtn, { backgroundColor: '#F59E0B', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, elevation: 4 }]}
                  onPress={() => {
                    setShowVictoryModal(false);
                    setWinner(null);
                    setSettlement(null);
                    navigation.navigate('WrongWayMenu');
                  }}
                >
                  <Home stroke="#FFF" size={17} strokeWidth={2.4} />
                  <Text style={[styles.vBtnText, { color: '#FFF' }]}>Home</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Colorful Falling Glitters & Sparkles Shower Cascading Across Entire Screen & Card */}
            <FallingGlitters active={true} count={80} />
          </View>
        </Modal>
      )}

      {/* Replay Viewer Modal */}
      <ReplayViewerModal
        visible={showReplayModal}
        replay={activeReplay}
        onClose={() => {
          setShowReplayModal(false);
          setShowVictoryModal(true);
        }}
        darkMode={darkMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintContainer: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  hintText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  pickupBanner: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    zIndex: 99,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 10,
  },
  pickupBannerText: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    color: '#F8FAFC',
  },
  victoryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  victoryCard: {
    width: '90%',
    maxWidth: 340,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
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
  trophyWrap: {
    marginBottom: 10,
  },
  trophyEmoji: {
    fontSize: 54,
  },
  victoryTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
  },
  victorySub: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 18,
    textAlign: 'center',
  },
  settleRow: {
    flexDirection: 'row',
    width: '100%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  settleItem: {
    flex: 1,
    alignItems: 'center',
  },
  settleVal: {
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  settleLbl: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    marginTop: 2,
  },
  victoryActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  vBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  vBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFF',
  },
});
