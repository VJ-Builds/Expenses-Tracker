/**
 * Wrong Way: Don't be mad - Constants & Configurations
 * Central definitions for board configurations, rules, timer modes, rank tiers, and visual themes.
 */

// ── Map & Board Types ──
export const MAP_TYPES = {
  DUEL: 'duel',       // Players start opposite and cross paths
  CLASSIC: 'classic', // Race upward side-by-side to row 0
  TWO_V_TWO: '2v2',   // 4 players (2 teams) on 9x9 grid
};

export const DUEL_SIZES = {
  BLITZ: 'blitz',       // 7x7 grid (fast action)
  STANDARD: 'standard', // 9x9 grid (tactical)
};

export const BOARD_DIMENSIONS = {
  [MAP_TYPES.DUEL]: {
    [DUEL_SIZES.BLITZ]: { rows: 7, cols: 7 },
    [DUEL_SIZES.STANDARD]: { rows: 9, cols: 9 },
  },
  [MAP_TYPES.CLASSIC]: { rows: 13, cols: 9 },
  [MAP_TYPES.TWO_V_TWO]: { rows: 9, cols: 9 },
};

// ── Starting Positions & Goals ──
export const getStartPositions = (mapType, duelSize = DUEL_SIZES.STANDARD) => {
  if (mapType === MAP_TYPES.DUEL) {
    const dim = BOARD_DIMENSIONS[MAP_TYPES.DUEL][duelSize];
    const mid = Math.floor(dim.cols / 2);
    return {
      A: { r: dim.rows - 1, c: mid }, // Player A (Red) starts at bottom center
      B: { r: 0, c: mid },            // Player B (Blue) starts at top center
    };
  }
  if (mapType === MAP_TYPES.CLASSIC) {
    const dim = BOARD_DIMENSIONS[MAP_TYPES.CLASSIC];
    return {
      A: { r: dim.rows - 1, c: 2 },   // Player A starts bottom left
      B: { r: dim.rows - 1, c: 6 },   // Player B starts bottom right
    };
  }
  if (mapType === MAP_TYPES.TWO_V_TWO) {
    const dim = BOARD_DIMENSIONS[MAP_TYPES.TWO_V_TWO];
    return {
      A1: { r: dim.rows - 1, c: 3 },
      A2: { r: dim.rows - 1, c: 5 },
      B1: { r: 0, c: 3 },
      B2: { r: 0, c: 5 },
    };
  }
  return { A: { r: 8, c: 4 }, B: { r: 0, c: 4 } };
};

export const getGoalRows = (mapType, duelSize = DUEL_SIZES.STANDARD) => {
  if (mapType === MAP_TYPES.DUEL) {
    const dim = BOARD_DIMENSIONS[MAP_TYPES.DUEL][duelSize];
    return {
      A: 0,              // Player A needs to reach row 0 (top)
      B: dim.rows - 1,   // Player B needs to reach bottom row
    };
  }
  if (mapType === MAP_TYPES.CLASSIC) {
    return {
      A: 0, // Both players race to row 0
      B: 0,
    };
  }
  if (mapType === MAP_TYPES.TWO_V_TWO) {
    const dim = BOARD_DIMENSIONS[MAP_TYPES.TWO_V_TWO];
    return {
      A1: 0,
      A2: 0,
      B1: dim.rows - 1,
      B2: dim.rows - 1,
    };
  }
  return { A: 0, B: 8 };
};

// ── Timer Modes ──
export const TIMER_MODES = {
  NONE: 'none',
  CLASSIC_3: 'classic-3', // 3 minutes total bank
  CLASSIC_5: 'classic-5', // 5 minutes total bank
  CLASSIC_8: 'classic-8', // 8 minutes total bank
  BLITZ_5: 'blitz-5',     // 5 seconds per turn
  BLITZ_8: 'blitz-8',     // 8 seconds per turn
  BLITZ_10: 'blitz-10',   // 10 seconds per turn
};

export const TIMER_SECONDS = {
  [TIMER_MODES.CLASSIC_3]: 180,
  [TIMER_MODES.CLASSIC_5]: 300,
  [TIMER_MODES.CLASSIC_8]: 480,
  [TIMER_MODES.BLITZ_5]: 5,
  [TIMER_MODES.BLITZ_8]: 8,
  [TIMER_MODES.BLITZ_10]: 10,
};

// ── Drop Modes ──
export const DROP_MODES = {
  RARE: 'rare',            // Random wall every 30-40s
  OFTEN: 'often',          // Random wall every 20-25s
  VERY_OFTEN: 'veryoften', // Random wall every 10-15s
};

export const AI_DIFFICULTIES = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
};

// ── Player Themes & Colors ──
export const PLAYER_COLORS = {
  A: {
    primary: '#EF4444',
    dark: '#991B1B',
    glow: 'rgba(239, 68, 68, 0.45)',
    name: 'Red',
  },
  B: {
    primary: '#3B82F6',
    dark: '#1E40AF',
    glow: 'rgba(59, 130, 246, 0.45)',
    name: 'Blue',
  },
  A1: { primary: '#EF4444', dark: '#991B1B', name: 'Red 1' },
  A2: { primary: '#F87171', dark: '#B91C1C', name: 'Red 2' },
  B1: { primary: '#3B82F6', dark: '#1E40AF', name: 'Blue 1' },
  B2: { primary: '#60A5FA', dark: '#2563EB', name: 'Blue 2' },
};

// ── Visual Tokens & Aesthetics ──
export const THEME = {
  dark: {
    bg: '#0A0F1D',
    card: '#131C31',
    cardBorder: '#1F2C4C',
    boardBg: '#10172A',
    boardGrid: '#1E293B',
    cellBg: '#151F36',
    cellHover: '#1E2D50',
    wallColor: '#E2E8F0',
    wallShadow: 'rgba(0,0,0,0.6)',
    steelWall: '#94A3B8',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    subtle: '#64748B',
    accent: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.35)',
    goalGlow: '#10B981',
  },
  light: {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    boardBg: '#EDF2F7',
    boardGrid: '#CBD5E1',
    cellBg: '#FFFFFF',
    cellHover: '#E2E8F0',
    wallColor: '#334155',
    wallShadow: 'rgba(0,0,0,0.2)',
    steelWall: '#64748B',
    text: '#0F172A',
    textMuted: '#64748B',
    subtle: '#94A3B8',
    accent: '#7C3AED',
    accentGlow: 'rgba(124, 58, 237, 0.25)',
    goalGlow: '#059669',
  }
};

// ── ELO Rank Tiers ──
export const RANK_TIERS = [
  { id: 'wood', name: 'Wood', min: 0, max: 799, color: '#854D0E', icon: '🪵' },
  { id: 'bronze', name: 'Bronze', min: 800, max: 999, color: '#CD7F32', icon: '🥉' },
  { id: 'silver', name: 'Silver', min: 1000, max: 1199, color: '#94A3B8', icon: '🥈' },
  { id: 'gold', name: 'Gold', min: 1200, max: 1399, color: '#F59E0B', icon: '🥇' },
  { id: 'platinum', name: 'Platinum', min: 1400, max: 1599, color: '#06B6D4', icon: '💎' },
  { id: 'diamond', name: 'Diamond', min: 1600, max: 1799, color: '#A855F7', icon: '💠' },
  { id: 'champion', name: 'Champion', min: 1800, max: 99999, color: '#EF4444', icon: '👑' },
];

export const getRankTier = (rating = 1000) => {
  return RANK_TIERS.find(t => rating >= t.min && rating <= t.max) || RANK_TIERS[2];
};

// ── Emotes ──
export const EMOTES = [
  { id: 'laugh', emoji: '😂', label: 'Haha!' },
  { id: 'cry', emoji: '😭', label: 'Oh no!' },
  { id: 'angry', emoji: '😡', label: 'Grrr!' },
  { id: 'confused', emoji: '🤔', label: 'Hmm?' },
  { id: 'party', emoji: '🎉', label: 'GG!' },
  { id: 'robot', emoji: '🤖', label: 'Beep!' },
];
