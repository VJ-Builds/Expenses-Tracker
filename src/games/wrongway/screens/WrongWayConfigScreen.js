/**
 * Wrong Way: Don't be mad - Match Configuration Screen
 * Allows customizing Map (Duel 7x7/9x9 vs Classic 9x13), Timers, AI Difficulty,
 * Chaos Crate Drops, Random Falling Walls, Hammer Mode, and starting Barricades.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import {
  ArrowLeft,
  Swords,
  Timer,
  Zap,
  Package,
  Hammer,
  CloudRain,
  Shield,
  Play,
  Dices,
} from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../../constants/theme';
import {
  MAP_TYPES,
  DUEL_SIZES,
  BOARD_DIMENSIONS,
  TIMER_MODES,
  DROP_MODES,
  AI_DIFFICULTIES,
  getStartPositions,
  getGoalRows,
  THEME,
} from '../constants/wrongWayConstants';
import { getSettings } from '../engine/storageService';
import { generatePresetWalls } from '../engine/boardLogic';
import audio from '../engine/audioService';

// ── Mini Map Live Preview Component ──
const MiniMapPreview = ({ rows, cols, walls = [], darkMode = true }) => {
  const cellSize = rows > 9 ? 13 : 18;
  const wallThick = 3.5;
  const width = cols * cellSize;
  const height = rows * cellSize;

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: darkMode ? '#10172A' : '#EDF2F7',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: darkMode ? '#1F2C4C' : '#CBD5E1',
        position: 'relative',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      {/* Grid Cells & Starting Pawns */}
      {Array.from({ length: rows }).map((_, r) => (
        <View key={`mr-${r}`} style={{ flexDirection: 'row' }}>
          {Array.from({ length: cols }).map((_, c) => {
            const isPawnA = r === rows - 1 && c === Math.floor(cols / 2);
            const isPawnB = r === 0 && c === Math.floor(cols / 2);
            return (
              <View
                key={`mc-${r}-${c}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderWidth: 0.5,
                  borderColor: darkMode ? '#1E293B' : '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isPawnB && (
                  <View
                    style={{
                      width: cellSize * 0.65,
                      height: cellSize * 0.65,
                      borderRadius: (cellSize * 0.65) / 2,
                      backgroundColor: '#3B82F6',
                    }}
                  />
                )}
                {isPawnA && (
                  <View
                    style={{
                      width: cellSize * 0.65,
                      height: cellSize * 0.65,
                      borderRadius: (cellSize * 0.65) / 2,
                      backgroundColor: '#EF4444',
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* Preset Walls rendered in cool neutral stone */}
      {walls.map(w => {
        const [type, rs, cs] = w.split('-');
        const r = parseInt(rs, 10);
        const c = parseInt(cs, 10);
        const isH = type === 'H';
        return (
          <View
            key={`mw-${w}`}
            style={{
              position: 'absolute',
              left: isH ? c * cellSize : (c + 1) * cellSize - wallThick / 2,
              top: isH ? (r + 1) * cellSize - wallThick / 2 : r * cellSize,
              width: isH ? 2 * cellSize : wallThick,
              height: isH ? wallThick : 2 * cellSize,
              backgroundColor: darkMode ? '#CBD5E1' : '#475569',
              borderRadius: wallThick / 2,
              zIndex: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.4,
              shadowRadius: 2,
            }}
          />
        );
      })}
    </View>
  );
};

export default function WrongWayConfigScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const isVsBot = route.params?.isVsBot ?? true;

  const [mapType, setMapType] = useState(MAP_TYPES.DUEL);
  const [duelSize, setDuelSize] = useState(DUEL_SIZES.STANDARD);
  const [difficulty, setDifficulty] = useState(AI_DIFFICULTIES.NORMAL);
  const [timerMode, setTimerMode] = useState(TIMER_MODES.NONE);
  const [chaosMode, setChaosMode] = useState(false);
  const [dropMode, setDropMode] = useState(null); // null | 'rare' | 'often' | 'veryoften'
  const [hammerMode, setHammerMode] = useState(false);
  const [hammerDrops, setHammerDrops] = useState(1);
  const [barricades, setBarricades] = useState(10);
  const [darkMode, setDarkMode] = useState(true);

  // Initial Walls Preset (Seed 1 to 5000)
  const [includeWalls, setIncludeWalls] = useState(false);
  const [wallSeed, setWallSeed] = useState('1');

  const normalizedSeed = Math.max(1, Math.min(5000, parseInt(wallSeed, 10) || 1));

  const currentDims = mapType === MAP_TYPES.DUEL
    ? BOARD_DIMENSIONS[MAP_TYPES.DUEL][duelSize]
    : BOARD_DIMENSIONS[mapType];

  const previewPresetWalls = React.useMemo(() => {
    if (!includeWalls) return [];
    const startPos = getStartPositions(mapType, duelSize);
    const goalR = getGoalRows(mapType, duelSize);
    return generatePresetWalls(
      normalizedSeed,
      currentDims.rows,
      currentDims.cols,
      startPos.A,
      startPos.B,
      goalR.A,
      goalR.B,
      6
    );
  }, [includeWalls, normalizedSeed, mapType, duelSize, currentDims]);

  const updateSeed = (next) => {
    audio.play('click');
    const clamped = Math.max(1, Math.min(5000, next));
    setWallSeed(String(clamped));
  };

  useFocusEffect(
    React.useCallback(() => {
      getSettings().then(cfg => {
        if (typeof cfg.darkMode === 'boolean') {
          setDarkMode(cfg.darkMode);
        }
      });
    }, [])
  );

  const theme = darkMode ? THEME.dark : THEME.light;

  const handleStartGame = () => {
    audio.play('click');
    navigation.navigate('WrongWayGame', {
      isVsBot,
      difficulty,
      mapType,
      duelSize,
      timerMode,
      chaosMode,
      dropMode,
      hammerMode,
      hammerDrops,
      barricades,
      darkMode,
      includeWalls,
      wallSeed: normalizedSeed,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft stroke={theme.text} size={20} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            Match Setup
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* AI Difficulty Selector (Only if vs Bot) */}
        {isVsBot && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.subtle }]}>BOT DIFFICULTY</Text>
            <View style={styles.segmentedRow}>
              {[
                { id: AI_DIFFICULTIES.EASY, label: 'Easy', color: '#10B981' },
                { id: AI_DIFFICULTIES.NORMAL, label: 'Normal', color: '#3B82F6' },
                { id: AI_DIFFICULTIES.HARD, label: 'Hard', color: '#EF4444' },
              ].map(d => {
                const isSelected = difficulty === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.segmentBtn,
                      {
                        backgroundColor: isSelected ? d.color : theme.card,
                        borderColor: isSelected ? d.color : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setDifficulty(d.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        { color: isSelected ? '#FFF' : theme.text },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Map Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.subtle }]}>GAME MAP</Text>
          <View style={styles.choiceRow}>
            {/* Duel Map */}
            <TouchableOpacity
              style={[
                styles.mapChoiceCard,
                {
                  backgroundColor: mapType === MAP_TYPES.DUEL ? 'rgba(139, 92, 246, 0.15)' : theme.card,
                  borderColor: mapType === MAP_TYPES.DUEL ? theme.accent : theme.cardBorder,
                },
              ]}
              onPress={() => setMapType(MAP_TYPES.DUEL)}
              activeOpacity={0.8}
            >
              <Swords
                stroke={mapType === MAP_TYPES.DUEL ? theme.accent : theme.subtle}
                size={28}
                strokeWidth={2.2}
              />
              <Text style={[styles.mapChoiceTitle, { color: theme.text }]}>Duel Arena</Text>
              <Text style={[styles.mapChoiceDesc, { color: theme.subtle }]}>
                Start opposite, cross and block
              </Text>
            </TouchableOpacity>

            {/* Classic Race Map */}
            <TouchableOpacity
              style={[
                styles.mapChoiceCard,
                {
                  backgroundColor: mapType === MAP_TYPES.CLASSIC ? 'rgba(139, 92, 246, 0.15)' : theme.card,
                  borderColor: mapType === MAP_TYPES.CLASSIC ? theme.accent : theme.cardBorder,
                },
              ]}
              onPress={() => setMapType(MAP_TYPES.CLASSIC)}
              activeOpacity={0.8}
            >
              <Zap
                stroke={mapType === MAP_TYPES.CLASSIC ? theme.accent : theme.subtle}
                size={28}
                strokeWidth={2.2}
              />
              <Text style={[styles.mapChoiceTitle, { color: theme.text }]}>Classic Race</Text>
              <Text style={[styles.mapChoiceDesc, { color: theme.subtle }]}>
                9×13 vertical sprint to row 0
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Duel Size (If Duel map) */}
        {mapType === MAP_TYPES.DUEL && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.subtle }]}>FIELD SIZE</Text>
            <View style={styles.segmentedRow}>
              {[
                { id: DUEL_SIZES.BLITZ, label: '7 × 7 Blitz (Fast)' },
                { id: DUEL_SIZES.STANDARD, label: '9 × 9 Standard (Tactical)' },
              ].map(s => {
                const isSelected = duelSize === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.segmentBtn,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.card,
                        borderColor: isSelected ? theme.accent : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setDuelSize(s.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        { color: isSelected ? '#FFF' : theme.text },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Initial Maze Walls Preset Section */}
        <View style={styles.section}>
          <View style={styles.presetHeaderRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.sectionLabel, { color: theme.subtle, marginBottom: 2 }]}>
                INITIAL MAZE WALLS
              </Text>
              <Text style={[styles.presetSubtitle, { color: theme.text }]}>
                Include pre-placed bricks on board
              </Text>
            </View>
            <Switch
              value={includeWalls}
              onValueChange={val => {
                audio.play('click');
                setIncludeWalls(val);
              }}
              trackColor={{ false: theme.cellHover, true: theme.accent }}
              thumbColor={includeWalls ? '#FFF' : theme.subtle}
            />
          </View>

          {includeWalls && (
            <View style={[styles.presetCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {/* Live Mini Map Preview */}
              <View style={styles.miniMapContainer}>
                <MiniMapPreview
                  rows={currentDims.rows}
                  cols={currentDims.cols}
                  walls={previewPresetWalls}
                  darkMode={darkMode}
                />
                <Text style={[styles.presetBadgeText, { color: theme.accent }]}>
                  Preset #{normalizedSeed} of 5000 • {previewPresetWalls.length} Starting Barricades
                </Text>
              </View>

              {/* Seed Controller Row */}
              <View style={styles.seedControlRow}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.cellHover, borderColor: theme.cardBorder }]}
                  onPress={() => updateSeed(normalizedSeed - 10)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperText, { color: theme.text }]}>-10</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.cellHover, borderColor: theme.cardBorder }]}
                  onPress={() => updateSeed(normalizedSeed - 1)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperText, { color: theme.text }]}>-1</Text>
                </TouchableOpacity>

                <View style={[styles.seedInputWrap, { backgroundColor: theme.cellHover, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.seedPrefix, { color: theme.subtle }]}>#</Text>
                  <TextInput
                    style={[styles.seedInput, { color: theme.text }]}
                    value={String(wallSeed)}
                    onChangeText={text => setWallSeed(text.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="1"
                    placeholderTextColor={theme.subtle}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.cellHover, borderColor: theme.cardBorder }]}
                  onPress={() => updateSeed(normalizedSeed + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperText, { color: theme.text }]}>+1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.cellHover, borderColor: theme.cardBorder }]}
                  onPress={() => updateSeed(normalizedSeed + 10)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperText, { color: theme.text }]}>+10</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.randomBtn, { backgroundColor: theme.accent }]}
                  onPress={() => {
                    audio.play('click');
                    const rand = Math.floor(Math.random() * 5000) + 1;
                    setWallSeed(String(rand));
                  }}
                  activeOpacity={0.8}
                >
                  <Dices stroke="#FFF" size={15} />
                  <Text style={styles.randomBtnText}>Dice</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Timer Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.subtle }]}>TIMER OPTIONS</Text>
          <View style={styles.timerWrap}>
            {[
              { id: TIMER_MODES.NONE, label: 'No Timer' },
              { id: TIMER_MODES.CLASSIC_3, label: '3 min bank' },
              { id: TIMER_MODES.CLASSIC_5, label: '5 min bank' },
              { id: TIMER_MODES.BLITZ_5, label: '5s / turn' },
              { id: TIMER_MODES.BLITZ_8, label: '8s / turn' },
            ].map(t => {
              const isSelected = timerMode === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.timerChip,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.card,
                      borderColor: isSelected ? theme.accent : theme.cardBorder,
                    },
                  ]}
                  onPress={() => setTimerMode(t.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timerChipText,
                      { color: isSelected ? '#FFF' : theme.text },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Starting Barricades Slider/Counter */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.subtle }]}>STARTING BARRICADES</Text>
          <View style={[styles.counterRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={[styles.countBtn, { backgroundColor: theme.cellHover }]}
              onPress={() => setBarricades(b => Math.max(8, b - 1))}
            >
              <Text style={[styles.countBtnText, { color: theme.text }]}>−</Text>
            </TouchableOpacity>
            <View style={styles.countDisplay}>
              <Text style={[styles.countNumber, { color: theme.accent }]}>{barricades}</Text>
              <Text style={[styles.countUnit, { color: theme.subtle }]}>walls per player</Text>
            </View>
            <TouchableOpacity
              style={[styles.countBtn, { backgroundColor: theme.cellHover }]}
              onPress={() => setBarricades(b => Math.min(15, b + 1))}
            >
              <Text style={[styles.countBtnText, { color: theme.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modifiers: Chaos Crate, Random Walls, Hammer */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.subtle }]}>SPECIAL MODIFIERS</Text>

          {/* Chaos Crate */}
          <TouchableOpacity
            style={[
              styles.modifierItem,
              {
                backgroundColor: chaosMode ? 'rgba(139, 92, 246, 0.15)' : theme.card,
                borderColor: chaosMode ? theme.accent : theme.cardBorder,
              },
            ]}
            onPress={() => setChaosMode(c => !c)}
            activeOpacity={0.8}
          >
            <View style={[styles.modIconWrap, { backgroundColor: '#8B5CF6' }]}>
              <Package stroke="#FFF" size={20} strokeWidth={2.2} />
            </View>
            <View style={styles.modTextWrap}>
              <Text style={[styles.modTitle, { color: theme.text }]}>Chaos Crate Drop</Text>
              <Text style={[styles.modDesc, { color: theme.subtle }]}>
                A mystery crate lands on the board; step on it for +2 extra barricades!
              </Text>
            </View>
            <View style={[styles.checkCircle, chaosMode && { backgroundColor: theme.accent }]}>
              {chaosMode && <Text style={styles.checkMark}>✓</Text>}
            </View>
          </TouchableOpacity>

          {/* Random Walls */}
          <TouchableOpacity
            style={[
              styles.modifierItem,
              {
                backgroundColor: dropMode ? 'rgba(236, 72, 153, 0.12)' : theme.card,
                borderColor: dropMode ? '#EC4899' : theme.cardBorder,
              },
            ]}
            onPress={() => setDropMode(d => (d ? null : DROP_MODES.OFTEN))}
            activeOpacity={0.8}
          >
            <View style={[styles.modIconWrap, { backgroundColor: '#EC4899' }]}>
              <CloudRain stroke="#FFF" size={20} strokeWidth={2.2} />
            </View>
            <View style={styles.modTextWrap}>
              <Text style={[styles.modTitle, { color: theme.text }]}>Random Falling Walls</Text>
              <Text style={[styles.modDesc, { color: theme.subtle }]}>
                Walls drop from the sky at intervals to handicap the leader fairly.
              </Text>
            </View>
            <View style={[styles.checkCircle, dropMode && { backgroundColor: '#EC4899' }]}>
              {dropMode && <Text style={styles.checkMark}>✓</Text>}
            </View>
          </TouchableOpacity>

          {/* Hammer Mode */}
          <TouchableOpacity
            style={[
              styles.modifierItem,
              {
                backgroundColor: hammerMode ? 'rgba(245, 158, 11, 0.15)' : theme.card,
                borderColor: hammerMode ? '#F59E0B' : theme.cardBorder,
              },
            ]}
            onPress={() => setHammerMode(h => !h)}
            activeOpacity={0.8}
          >
            <View style={[styles.modIconWrap, { backgroundColor: '#F59E0B' }]}>
              <Hammer stroke="#FFF" size={20} strokeWidth={2.2} />
            </View>
            <View style={styles.modTextWrap}>
              <Text style={[styles.modTitle, { color: theme.text }]}>Hammer Smash</Text>
              <Text style={[styles.modDesc, { color: theme.subtle }]}>
                Pick up a golden hammer to smash and shatter any opponent's wall!
              </Text>
            </View>
            <View style={[styles.checkCircle, hammerMode && { backgroundColor: '#F59E0B' }]}>
              {hammerMode && <Text style={styles.checkMark}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>

        {/* Start Game Action Button */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStartGame}
          activeOpacity={0.85}
        >
          <Play stroke="#FFF" fill="#FFF" size={20} />
          <Text style={styles.startBtnText}>Start Match</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mapChoiceCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    textAlign: 'center',
    gap: 6,
  },
  mapChoiceTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    marginTop: 4,
  },
  mapChoiceDesc: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  timerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timerChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  timerChipText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  countBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
  },
  countDisplay: {
    alignItems: 'center',
  },
  countNumber: {
    fontFamily: FONTS.bold,
    fontSize: 26,
  },
  countUnit: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  modifierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
  modIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modTextWrap: {
    flex: 1,
  },
  modTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  modDesc: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 8,
    marginTop: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: '#FFF',
  },
  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  presetSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginTop: 1,
  },
  presetCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 12,
  },
  miniMapContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  presetBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  seedControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
  },
  stepperBtn: {
    paddingVertical: 7,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  seedInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 64,
    justifyContent: 'center',
  },
  seedPrefix: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    marginRight: 2,
  },
  seedInput: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    paddingVertical: 2,
    paddingHorizontal: 0,
    textAlign: 'center',
    minWidth: 38,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 10,
    gap: 4,
  },
  randomBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FFF',
  },
});
