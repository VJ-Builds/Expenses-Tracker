import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import Svg, { Path, Circle, Rect, G, Ellipse } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Settings, RotateCcw, Sparkles, Play } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MEOWDOKU_PALETTE,
  CELL_STATE,
  LEVEL_43_PRESET,
  generateMeowdokuLevel,
  propagateCrossesForCat,
} from './meowdokuEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORAGE_KEY = 'meowdoku_progress_v1';

function TuxedoCatSvg({ size = 28, winking = false, badgeColor = null }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Path d="M10 30 L12 8 L28 18 Z" fill="#231F20" />
        <Path d="M54 30 L52 8 L36 18 Z" fill="#231F20" />
        <Path d="M13 26 L14.5 12 L24 19 Z" fill="#F49AC1" />
        <Path d="M51 26 L49.5 12 L40 19 Z" fill="#F49AC1" />
        <Ellipse cx="32" cy="36" rx="23" ry="20" fill="#FFFFFF" />
        <Path
          d="M9 34 C9 19, 22 15, 32 15 C42 15, 55 19, 55 34 C55 41, 49 44, 44 43 C39 42, 35 32, 32 23 C29 32, 25 42, 20 43 C15 44, 9 41, 9 34 Z"
          fill="#231F20"
        />
        <Path
          d="M15 47 C22 55, 42 55, 49 47 C44 53, 20 53, 15 47 Z"
          fill="#E5E7EB"
        />
        <Circle cx="21.5" cy="34.5" r="5.6" fill="#A3B18A" />
        <Circle cx="21.5" cy="34.5" r="4.2" fill="#1E1E1E" />
        <Circle cx="19.8" cy="32.8" r="1.4" fill="#FFFFFF" />
        {winking ? (
          <Path
            d="M37.5 34.5 Q42.5 30.5 47.5 34.5"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <G>
            <Circle cx="42.5" cy="34.5" r="5.6" fill="#A3B18A" />
            <Circle cx="42.5" cy="34.5" r="4.2" fill="#1E1E1E" />
            <Circle cx="40.8" cy="32.8" r="1.4" fill="#FFFFFF" />
          </G>
        )}
        <Ellipse cx="32" cy="40.5" rx="2.6" ry="1.8" fill="#F49AC1" />
        {winking ? (
          <G>
            <Path d="M28.5 44 Q32 51 35.5 44 Z" fill="#FF6B8B" />
            <Path
              d="M27.5 43.5 Q32 46.5 36.5 43.5"
              stroke="#5C4033"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </G>
        ) : (
          <Path
            d="M28.5 44 Q30.2 45.8 32 44 Q33.8 45.8 35.5 44"
            stroke="#6B4F43"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {badgeColor && (
          <G>
            <Circle cx="52" cy="48" r="8" fill="#FFFFFF" />
            <Circle cx="52" cy="48" r="6.2" fill={badgeColor} />
          </G>
        )}
      </Svg>
    </View>
  );
}

function CatSilhouetteSvg({ size = 26, color = '#A3BED8' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M11 31 L13 10 L28 19 Z" fill={color} />
      <Path d="M53 31 L51 10 L36 19 Z" fill={color} />
      <Ellipse cx="32" cy="37" rx="22" ry="19" fill={color} />
    </Svg>
  );
}

function GoldFishSvg({ active = true, size = 24 }) {
  const bodyColor = active ? '#F5A623' : '#E2D9D0';
  const finColor = active ? '#D9820F' : '#CFC3B8';
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M31 27 L43 22 L39 38 Z" fill={finColor} />
      <Path d="M18 11 Q26 6 29 14 Z" fill={finColor} />
      <Path d="M18 29 L14 37 L24 33 Z" fill={finColor} />
      <Ellipse
        cx="21"
        cy="23"
        rx="14"
        ry="10.5"
        transform="rotate(22 21 23)"
        fill={bodyColor}
      />
      <Circle cx="13" cy="19" r="1.8" fill="#FFF8E7" />
    </Svg>
  );
}

function LightbulbSvg({ size = 34 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="25" y="44" width="14" height="8" rx="3" fill="#7E57C2" />
      <Path d="M27 52 Q32 58 37 52 Z" fill="#5E35B1" />
      <Path
        d="M32 10 C20 10, 14 19, 14 28 C14 35, 21 39, 24 45 L40 45 C43 39, 50 35, 50 28 C50 19, 44 10, 32 10 Z"
        fill="#FFC107"
      />
      <Ellipse cx="26" cy="23" rx="5" ry="7" transform="rotate(-20 26 23)" fill="#FFE082" />
    </Svg>
  );
}

function MouseSvg({ size = 34 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="16" cy="20" r="11" fill="#9E9E9E" />
      <Circle cx="48" cy="20" r="11" fill="#9E9E9E" />
      <Circle cx="16" cy="20" r="7" fill="#F49AC1" />
      <Circle cx="48" cy="20" r="7" fill="#F49AC1" />
      <Ellipse cx="32" cy="36" rx="19" ry="16" fill="#BDBDBD" />
      <Ellipse cx="32" cy="40" rx="14" ry="11" fill="#E0E0E0" />
      <Circle cx="25" cy="34" r="2.8" fill="#212121" />
      <Circle cx="39" cy="34" r="2.8" fill="#212121" />
      <Circle cx="24.2" cy="33.2" r="0.9" fill="#FFFFFF" />
      <Circle cx="38.2" cy="33.2" r="0.9" fill="#FFFFFF" />
      <Ellipse cx="32" cy="40" rx="2.6" ry="1.9" fill="#F49AC1" />
      <Rect x="29.5" y="45" width="2.2" height="3.5" rx="0.8" fill="#FFFFFF" />
      <Rect x="32.3" y="45" width="2.2" height="3.5" rx="0.8" fill="#FFFFFF" />
    </Svg>
  );
}

function RuleMiniDiagram({ type }) {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let isCat = false;
      let isCross = false;
      let bg = '#8B5E3C';

      if (type === 'color') {
        isCat = r === 1 && c === 1;
        isCross = r === 0 || (r === 1 && c === 0) || (r === 2 && c === 0);
        if (!isCat && !isCross) bg = '#C8AD96';
      } else if (type === 'rowcol') {
        isCat = r === 0 && c === 1;
        isCross = (r === 0 && c !== 1) || (c === 1 && r !== 0);
        if (!isCat && !isCross) bg = '#C8AD96';
      } else {
        isCat = r === 1 && c === 1;
        isCross = !isCat;
      }

      cells.push(
        <View
          key={`${r}-${c}`}
          style={[styles.miniCell, { backgroundColor: isCat ? '#D7C0AE' : bg }]}
        >
          {isCat && <View style={styles.miniCatDot} />}
          {isCross && <Text style={styles.miniCrossText}>×</Text>}
        </View>
      );
    }
  }
  return <View style={styles.miniGridWrap}>{cells}</View>;
}

function createLevel43ScreenshotBoard() {
  const N = 10;
  let b = Array.from({ length: N }, () => new Array(N).fill(CELL_STATE.EMPTY));
  const grid = LEVEL_43_PRESET.grid;
  const sol = LEVEL_43_PRESET.solutionCols;

  for (const r of LEVEL_43_PRESET.screenshotPlacedRows) {
    const c = sol[r];
    b[r][c] = CELL_STATE.CAT;
    b = propagateCrossesForCat(b, grid, r, c);
  }
  b[1][8] = CELL_STATE.CROSS;
  b[3][8] = CELL_STATE.CROSS;
  b[4][8] = CELL_STATE.CROSS;
  return b;
}

export default function MeowdokuScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [levelData, setLevelData] = useState(() => generateMeowdokuLevel(43));
  const [board, setBoard] = useState(() => createLevel43ScreenshotBoard());
  const [score, setScore] = useState(3840);
  const [lives, setLives] = useState(3);
  const [boosters, setBoosters] = useState({ cat: 5, hint: 5, mouse: 2 });
  const [autoCross, setAutoCross] = useState(true);
  const [singleTapCatMode, setSingleTapCatMode] = useState(false);
  const [errorCell, setErrorCell] = useState(null);
  const [hintCell, setHintCell] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);

  const lastTapRef = useRef({ key: null, time: 0 });
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const N = levelData.size;

  const saveProgress = useCallback(async (lv, sc, bst) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ level: lv, score: sc, boosters: bst })
      );
    } catch {
      // Ignore storage errors
    }
  }, []);

  const startLevel = useCallback((lvNum, useScreenshotPreset = false) => {
    const data = generateMeowdokuLevel(lvNum);
    setLevelData(data);
    if (lvNum === 43 && useScreenshotPreset) {
      setBoard(createLevel43ScreenshotBoard());
    } else {
      const emptyBoard = Array.from({ length: data.size }, () =>
        new Array(data.size).fill(CELL_STATE.EMPTY)
      );
      let starterRow = 0;
      for (let r = 0; r < data.size; r++) {
        const reg = data.grid[r][data.solutionCols[r]];
        let regSize = 0;
        for (let rr = 0; rr < data.size; rr++) {
          for (let cc = 0; cc < data.size; cc++) {
            if (data.grid[rr][cc] === reg) regSize++;
          }
        }
        if (regSize === 1) {
          starterRow = r;
          break;
        }
      }
      const sc = data.solutionCols[starterRow];
      emptyBoard[starterRow][sc] = CELL_STATE.CAT;
      const seededBoard = propagateCrossesForCat(emptyBoard, data.grid, starterRow, sc);
      setBoard(seededBoard);
    }
    setLives(3);
    setErrorCell(null);
    setHintCell(null);
    setShowWinModal(false);
    setShowGameOverModal(false);
  }, []);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const checkVictory = useCallback(
    (nextBoard, currentScore) => {
      let placedCount = 0;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (nextBoard[r][c] === CELL_STATE.CAT) placedCount++;
        }
      }
      if (placedCount === N) {
        const newScore = currentScore + 250;
        setScore(newScore);
        saveProgress(levelData.level + 1, newScore, boosters);
        setTimeout(() => {
          setShowWinModal(true);
        }, 280);
      }
    },
    [N, levelData.level, boosters, saveProgress]
  );

  const handlePlaceCat = useCallback(
    (r, c) => {
      if (board[r][c] === CELL_STATE.CAT) return;

      const isCorrect = levelData.solutionCols[r] === c;
      if (isCorrect) {
        let next = board.map(row => [...row]);
        next[r][c] = CELL_STATE.CAT;
        if (autoCross) {
          next = propagateCrossesForCat(next, levelData.grid, r, c);
        }
        const nextScore = score + 120;
        setBoard(next);
        setScore(nextScore);
        setHintCell(null);
        checkVictory(next, nextScore);
      } else {
        setErrorCell(`${r}-${c}`);
        triggerShake();
        setTimeout(() => setErrorCell(null), 650);

        const next = board.map(row => [...row]);
        next[r][c] = CELL_STATE.CROSS;
        setBoard(next);

        setLives(prev => {
          const remaining = prev - 1;
          if (remaining <= 0) {
            setTimeout(() => setShowGameOverModal(true), 350);
          }
          return Math.max(0, remaining);
        });
      }
    },
    [board, levelData, autoCross, score, checkVictory, triggerShake]
  );

  const handleCellPress = useCallback(
    (r, c) => {
      if (board[r][c] === CELL_STATE.CAT) return;

      if (singleTapCatMode) {
        handlePlaceCat(r, c);
        return;
      }

      const key = `${r}-${c}`;
      const now = Date.now();
      if (lastTapRef.current.key === key && now - lastTapRef.current.time < 340) {
        lastTapRef.current = { key: null, time: 0 };
        handlePlaceCat(r, c);
        return;
      }

      lastTapRef.current = { key, time: now };
      const next = board.map(row => [...row]);
      next[r][c] =
        next[r][c] === CELL_STATE.CROSS ? CELL_STATE.EMPTY : CELL_STATE.CROSS;
      setBoard(next);
    },
    [board, singleTapCatMode, handlePlaceCat]
  );

  const handleCatBooster = () => {
    if (boosters.cat <= 0) return;
    const unplacedRows = [];
    for (let r = 0; r < N; r++) {
      const c = levelData.solutionCols[r];
      if (board[r][c] !== CELL_STATE.CAT) {
        unplacedRows.push(r);
      }
    }
    if (unplacedRows.length === 0) return;
    const targetRow = unplacedRows[0];
    const targetCol = levelData.solutionCols[targetRow];
    setBoosters(prev => ({ ...prev, cat: prev.cat - 1 }));
    handlePlaceCat(targetRow, targetCol);
  };

  const handleHintBooster = () => {
    if (boosters.hint <= 0) return;
    const candidates = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] === CELL_STATE.EMPTY && levelData.solutionCols[r] !== c) {
          candidates.push([r, c]);
        }
      }
    }
    if (candidates.length === 0) {
      for (let r = 0; r < N; r++) {
        const sc = levelData.solutionCols[r];
        if (board[r][sc] !== CELL_STATE.CAT) {
          setHintCell(`${r}-${sc}`);
          setBoosters(prev => ({ ...prev, hint: prev.hint - 1 }));
          break;
        }
      }
      return;
    }

    const next = board.map(row => [...row]);
    const count = Math.min(3, candidates.length);
    for (let i = 0; i < count; i++) {
      const [rr, cc] = candidates[i];
      next[rr][cc] = CELL_STATE.CROSS;
    }
    setBoard(next);
    setBoosters(prev => ({ ...prev, hint: prev.hint - 1 }));
  };

  const handleMouseBooster = () => {
    if (boosters.mouse <= 0) return;
    let targetReg = -1;
    for (let r = 0; r < N; r++) {
      const sc = levelData.solutionCols[r];
      if (board[r][sc] !== CELL_STATE.CAT) {
        targetReg = levelData.grid[r][sc];
        break;
      }
    }
    if (targetReg === -1) return;

    const next = board.map(row => [...row]);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (
          levelData.grid[r][c] === targetReg &&
          levelData.solutionCols[r] !== c &&
          next[r][c] === CELL_STATE.EMPTY
        ) {
          next[r][c] = CELL_STATE.CROSS;
        }
      }
    }
    setBoard(next);
    setBoosters(prev => ({ ...prev, mouse: prev.mouse - 1 }));
  };

  const placedRegions = new Set();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r]?.[c] === CELL_STATE.CAT) {
        placedRegions.add(levelData.grid[r][c]);
      }
    }
  }

  const boardOuterPad = 14;
  const gridInnerPad = 8;
  const availableBoardWidth = Math.min(SCREEN_WIDTH - boardOuterPad * 2, 430);
  const cellMargin = 1.6;
  const cellSize = Math.floor(
    (availableBoardWidth - gridInnerPad * 2 - N * cellMargin * 2) / N
  );
  const topCatIconSize = Math.min(28, Math.floor((availableBoardWidth - 36) / N));

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(
            insets.top,
            Platform.OS === 'android' ? StatusBar.currentHeight || 12 : 12
          ),
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAF4EE" />

      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.circleHeaderBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <ArrowLeft stroke="#785244" size={22} strokeWidth={2.6} />
        </TouchableOpacity>

        <View style={styles.statsCenter}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{levelData.level}</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{score}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.circleHeaderBtn}
          onPress={() => setShowSettingsModal(true)}
          activeOpacity={0.75}
        >
          <Settings stroke="#785244" size={22} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.fishRowWrap}>
        <View style={styles.fishPill}>
          {[0, 1, 2].map(idx => (
            <GoldFishSvg key={idx} active={idx < lives} size={23} />
          ))}
        </View>
      </View>

      <View style={styles.rulesRow}>
        <View style={styles.ruleCard}>
          <RuleMiniDiagram type="color" />
          <Text style={styles.ruleText}>{'1 Cat per\ncolor'}</Text>
        </View>

        <View style={styles.ruleCard}>
          <RuleMiniDiagram type="rowcol" />
          <Text style={styles.ruleText}>{'1 Cat per\ncolumn and\nrow'}</Text>
        </View>

        <View style={styles.ruleCard}>
          <RuleMiniDiagram type="touch" />
          <Text style={styles.ruleText}>{'Cats cannot\ntouch'}</Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.boardSection,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <View style={styles.catTabFolder}>
          {Array.from({ length: N }, (_, regId) => {
            const colorHex = MEOWDOKU_PALETTE[regId % MEOWDOKU_PALETTE.length].hex;
            const isPlaced = placedRegions.has(regId);
            return (
              <View key={regId} style={styles.catTabItem}>
                {isPlaced ? (
                  <TuxedoCatSvg size={topCatIconSize} badgeColor={colorHex} />
                ) : (
                  <CatSilhouetteSvg size={topCatIconSize} color={colorHex} />
                )}
              </View>
            );
          })}
        </View>

        <View style={[styles.boardCard, { width: availableBoardWidth }]}>
          {board.map((row, r) => (
            <View key={`r-${r}`} style={styles.gridRow}>
              {row.map((cellState, c) => {
                const regId = levelData.grid[r][c];
                const bgHex = MEOWDOKU_PALETTE[regId % MEOWDOKU_PALETTE.length].hex;
                const cellKey = `${r}-${c}`;
                const isError = errorCell === cellKey;
                const isHint = hintCell === cellKey;

                return (
                  <TouchableOpacity
                    key={cellKey}
                    activeOpacity={0.8}
                    onPress={() => handleCellPress(r, c)}
                    onLongPress={() => handlePlaceCat(r, c)}
                    delayLongPress={240}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        margin: cellMargin,
                        backgroundColor: isError ? '#EF4444' : bgHex,
                      },
                      isHint && styles.hintCellBorder,
                    ]}
                  >
                    {cellState === CELL_STATE.CROSS && (
                      <Svg
                        width={Math.floor(cellSize * 0.56)}
                        height={Math.floor(cellSize * 0.56)}
                        viewBox="0 0 24 24"
                      >
                        <Path
                          d="M5 5 L19 19 M19 5 L5 19"
                          stroke="#FFFFFF"
                          strokeWidth="4.2"
                          strokeLinecap="round"
                        />
                      </Svg>
                    )}
                    {cellState === CELL_STATE.CAT && (
                      <TuxedoCatSvg size={Math.floor(cellSize * 0.88)} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={styles.boostersRow}>
        <TouchableOpacity
          style={styles.boosterCircle}
          onPress={handleCatBooster}
          activeOpacity={0.8}
        >
          <TuxedoCatSvg size={38} winking />
          <View style={styles.boosterBadge}>
            <Text style={styles.boosterBadgeText}>{boosters.cat}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.boosterCircle}
          onPress={handleHintBooster}
          activeOpacity={0.8}
        >
          <LightbulbSvg size={36} />
          <View style={styles.boosterBadge}>
            <Text style={styles.boosterBadgeText}>{boosters.hint}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.boosterCircle}
          onPress={handleMouseBooster}
          activeOpacity={0.8}
        >
          <MouseSvg size={38} />
          <View style={styles.boosterBadge}>
            <Text style={styles.boosterBadgeText}>{boosters.mouse}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Meowdoku Settings</Text>
            <Text style={styles.modalSub}>
              Tap once to mark X • Double-tap (or hold) to place a Cat
            </Text>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setAutoCross(!autoCross)}
            >
              <Text style={styles.toggleLabel}>Auto-Mark X around Placed Cats</Text>
              <View style={[styles.toggleBadge, autoCross && styles.toggleBadgeOn]}>
                <Text style={styles.toggleBadgeText}>{autoCross ? 'ON' : 'OFF'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setSingleTapCatMode(!singleTapCatMode)}
            >
              <Text style={styles.toggleLabel}>1-Tap Cat Placement Mode</Text>
              <View
                style={[styles.toggleBadge, singleTapCatMode && styles.toggleBadgeOn]}
              >
                <Text style={styles.toggleBadgeText}>
                  {singleTapCatMode ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() => {
                  startLevel(43, true);
                  setShowSettingsModal(false);
                }}
              >
                <RotateCcw stroke="#FFFFFF" size={16} />
                <Text style={styles.modalBtnPrimaryText}>
                  Load Level 43 Screenshot State
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  startLevel(levelData.level, false);
                  setShowSettingsModal(false);
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>
                  Restart Level {levelData.level} from Scratch
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.levelPickerHeading}>Jump to Level</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.levelChipsRow}
            >
              {[1, 2, 5, 10, 15, 24, 30, 42, 43, 44, 50, 80].map(lv => {
                const active = levelData.level === lv;
                return (
                  <TouchableOpacity
                    key={lv}
                    style={[styles.levelChip, active && styles.levelChipActive]}
                    onPress={() => {
                      startLevel(lv, lv === 43);
                      setShowSettingsModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.levelChipText,
                        active && styles.levelChipTextActive,
                      ]}
                    >
                      Lv {lv}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Resume Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showWinModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TuxedoCatSvg size={64} />
            <Text style={[styles.modalTitle, { marginTop: 10 }]}>Purr-fect Logic!</Text>
            <Text style={styles.modalSub}>
              You solved Level {levelData.level} with {lives} golden fish remaining!
            </Text>
            <TouchableOpacity
              style={[styles.modalBtnPrimary, { width: '100%', marginTop: 12 }]}
              onPress={() => startLevel(levelData.level + 1, false)}
            >
              <Play stroke="#FFFFFF" size={16} fill="#FFFFFF" />
              <Text style={styles.modalBtnPrimaryText}>
                Next Level (Level {levelData.level + 1})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showGameOverModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TuxedoCatSvg size={60} winking />
            <Text style={[styles.modalTitle, { marginTop: 10 }]}>Out of Fish Treats!</Text>
            <Text style={styles.modalSub}>
              Remember: no two cats can share a row, column, color, or touch diagonally.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtnPrimary, { width: '100%', marginTop: 12 }]}
              onPress={() => {
                setLives(3);
                setShowGameOverModal(false);
              }}
            >
              <Sparkles stroke="#FFFFFF" size={16} />
              <Text style={styles.modalBtnPrimaryText}>Refill 3 Fish & Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtnSecondary, { width: '100%', marginTop: 8 }]}
              onPress={() => startLevel(levelData.level, levelData.level === 43)}
            >
              <Text style={styles.modalBtnSecondaryText}>Restart Level</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF4EE',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 22,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: 6,
  },
  circleHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#785244',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statsCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
  },
  statBlock: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8D6E63',
    marginBottom: 1,
  },
  statValue: {
    fontSize: 25,
    fontWeight: '800',
    color: '#785244',
    letterSpacing: -0.3,
  },
  fishRowWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  fishPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#785244',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  rulesRow: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    marginVertical: 4,
  },
  ruleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EBE1',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 7,
    gap: 6,
  },
  miniGridWrap: {
    width: 33,
    height: 33,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniCell: {
    width: 9.6,
    height: 9.6,
    margin: 0.6,
    borderRadius: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#231F20',
  },
  miniCrossText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 9,
  },
  ruleText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#785244',
    lineHeight: 13,
  },
  boardSection: {
    alignItems: 'center',
    marginVertical: 2,
  },
  catTabFolder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 3,
  },
  catTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#785244',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintCellBorder: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  boostersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginTop: 6,
  },
  boosterCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justify.content: 'center',
    shadowColor: '#785244',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  boosterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E53935',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boosterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(35, 31, 32, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: '#FAF4EE',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#785244',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#8D6E63',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  toggleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#785244',
  },
  toggleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#E5DDD5',
  },
  toggleBadgeOn: {
    backgroundColor: '#9BD382',
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4A352B',
  },
  modalActions: {
    width: '100%',
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  modalBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A96E44',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  modalBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EBE1',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  modalBtnSecondaryText: {
    color: '#785244',
    fontSize: 13.5,
    fontWeight: '700',
  },
  levelPickerHeading: {
    alignSelf: 'flex-start',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#8D6E63',
    marginBottom: 8,
  },
  levelChipsRow: {
    gap: 8,
    paddingBottom: 12,
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  levelChipActive: {
    backgroundColor: '#785244',
  },
  levelChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#785244',
  },
  levelChipTextActive: {
    color: '#FFFFFF',
  },
  closeModalBtn: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A96E44',
  },
});
