/**
 * Wrong Way: Don't be mad - Local Storage & Persistence Service
 * Manages player statistics, ELO ratings, match replays, player XP/level, and game preferences.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  STATS: 'ww_stats_v1',
  REPLAYS: 'ww_replay_history_v1',
  ELO: 'ww_elo_ratings_v1',
  XP: 'ww_player_xp_v1',
  SETTINGS: 'ww_settings_v1',
};

// ── Default State Templates ──
const DEFAULT_STATS = {
  games: 0,
  wins: 0,
  losses: 0,
  streak: 0,
  bestStreak: 0,
  byMode: {
    duel: { games: 0, wins: 0, losses: 0 },
    classic: { games: 0, wins: 0, losses: 0 },
    '2v2': { games: 0, wins: 0, losses: 0 },
  },
};

const DEFAULT_ELO = {
  duel: 1000,
  classic: 1000,
  history: [],
};

const DEFAULT_SETTINGS = {
  soundOn: true,
  hapticOn: true,
  darkMode: true,
};

// ── Level & XP Formulas ──
export function calculateLevel(totalXp = 0) {
  let lv = 1;
  let rem = Math.max(0, totalXp);
  while (lv < 100) {
    const needed = 35 * lv * lv;
    if (rem < needed) break;
    rem -= needed;
    lv++;
  }
  const nextLevelXp = 35 * lv * lv;
  return {
    level: lv,
    currentXp: rem,
    neededXp: nextLevelXp,
    progress: Math.min(1, Math.max(0, rem / nextLevelXp)),
  };
}

// ── Statistics Management ──
export async function getStats() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.STATS);
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

export async function recordMatchResult(won, mode = 'duel') {
  try {
    const current = await getStats();
    const modeKey = mode || 'duel';
    const modeStats = current.byMode[modeKey] || { games: 0, wins: 0, losses: 0 };

    const streak = won ? current.streak + 1 : 0;
    const bestStreak = Math.max(current.bestStreak, streak);

    const updated = {
      ...current,
      games: current.games + 1,
      wins: current.wins + (won ? 1 : 0),
      losses: current.losses + (won ? 0 : 1),
      streak,
      bestStreak,
      byMode: {
        ...current.byMode,
        [modeKey]: {
          games: modeStats.games + 1,
          wins: modeStats.wins + (won ? 1 : 0),
          losses: modeStats.losses + (won ? 0 : 1),
        },
      },
    };

    await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(updated));

    // Award XP
    const earnedXp = won ? 120 : 45;
    const xpData = await addXp(earnedXp);

    return { stats: updated, earnedXp, ...xpData };
  } catch (e) {
    console.warn('Failed to record match result:', e);
    return { stats: DEFAULT_STATS, earnedXp: 0, level: 1 };
  }
}

// ── ELO Rating Calculation ──
export async function getEloRatings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ELO);
    return raw ? { ...DEFAULT_ELO, ...JSON.parse(raw) } : DEFAULT_ELO;
  } catch {
    return DEFAULT_ELO;
  }
}

export async function updateEloRating(won, oppRating = 1000, mode = 'duel') {
  try {
    const current = await getEloRatings();
    const myRating = current[mode] || 1000;
    const K = 32;

    const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
    const delta = Math.round(K * ((won ? 1 : 0) - expected));
    const newRating = Math.max(100, myRating + delta);

    const updated = {
      ...current,
      [mode]: newRating,
      history: [
        { date: Date.now(), mode, delta, newRating, won },
        ...(current.history || []).slice(0, 29),
      ],
    };

    await AsyncStorage.setItem(KEYS.ELO, JSON.stringify(updated));
    return { oldRating: myRating, newRating, delta };
  } catch {
    return { oldRating: 1000, newRating: 1000, delta: 0 };
  }
}

// ── XP & Progression ──
export async function getXp() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.XP);
    const xp = raw ? parseInt(raw, 10) : 0;
    return calculateLevel(xp);
  } catch {
    return calculateLevel(0);
  }
}

export async function addXp(amount = 50) {
  try {
    const current = await AsyncStorage.getItem(KEYS.XP);
    const prevXp = current ? parseInt(current, 10) : 0;
    const nextXp = prevXp + amount;
    await AsyncStorage.setItem(KEYS.XP, String(nextXp));
    return calculateLevel(nextXp);
  } catch {
    return calculateLevel(0);
  }
}

// ── Replay History ──
export async function getReplays() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.REPLAYS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveReplay(replayData) {
  try {
    const current = await getReplays();
    const entry = {
      id: 'rep_' + Date.now(),
      date: Date.now(),
      ...replayData,
    };
    const updated = [entry, ...current].slice(0, 10); // Keep last 10 replays
    await AsyncStorage.setItem(KEYS.REPLAYS, JSON.stringify(updated));
    return entry;
  } catch (e) {
    console.warn('Failed to save match replay:', e);
    return null;
  }
}

// ── Settings ──
export async function getSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(patch) {
  try {
    const current = await getSettings();
    const updated = { ...current, ...patch };
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
