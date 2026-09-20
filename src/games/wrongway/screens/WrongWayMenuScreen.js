/**
 * Wrong Way: Don't be mad - Main Menu Screen
 * Game Hub for Wrong Way: launch Vs Bot, Local Pass & Play, 2v2, Stats, Replays, and Tutorial.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import {
  ArrowLeft,
  Bot,
  Users,
  Swords,
  Trophy,
  History,
  HelpCircle,
  Volume2,
  VolumeX,
  Smartphone,
  Moon,
  Sun,
  ChevronRight,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../../constants/theme';
import { THEME, getRankTier, MAP_TYPES } from '../constants/wrongWayConstants';
import { getStats, getEloRatings, getXp, getSettings, updateSettings } from '../engine/storageService';
import audio from '../engine/audioService';
import TutorialModal from '../components/TutorialModal';

export default function WrongWayMenuScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [darkMode, setDarkMode] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticOn, setHapticOn] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  const [stats, setStats] = useState(null);
  const [elo, setElo] = useState(null);
  const [xpData, setXpData] = useState(null);

  const theme = darkMode ? THEME.dark : THEME.light;

  const loadProfile = async () => {
    const s = await getStats();
    const e = await getEloRatings();
    const x = await getXp();
    const cfg = await getSettings();

    setStats(s);
    setElo(e);
    setXpData(x);
    setSoundOn(cfg.soundOn);
    setHapticOn(cfg.hapticOn);
    setDarkMode(cfg.darkMode);
    audio.setSoundEnabled(cfg.soundOn);
    audio.setHapticEnabled(cfg.hapticOn);
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const toggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    audio.setSoundEnabled(next);
    await updateSettings({ soundOn: next });
    if (next) audio.play('click');
  };

  const toggleHaptics = async () => {
    const next = !hapticOn;
    setHapticOn(next);
    audio.setHapticEnabled(next);
    await updateSettings({ hapticOn: next });
    if (next) audio.haptic('medium');
  };

  const toggleTheme = async () => {
    const next = !darkMode;
    setDarkMode(next);
    await updateSettings({ darkMode: next });
    audio.haptic('light');
  };

  const duelRating = elo?.duel || 1000;
  const currentTier = getRankTier(duelRating);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft stroke={theme.text} size={20} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.settingsRow}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={toggleSound}
            >
              {soundOn ? (
                <Volume2 stroke={theme.accent} size={18} strokeWidth={2.2} />
              ) : (
                <VolumeX stroke={theme.subtle} size={18} strokeWidth={2.2} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={toggleHaptics}
            >
              <Smartphone stroke={hapticOn ? theme.accent : theme.subtle} size={18} strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={toggleTheme}
            >
              {darkMode ? (
                <Sun stroke="#F59E0B" size={18} strokeWidth={2.2} />
              ) : (
                <Moon stroke={theme.accent} size={18} strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Branding Header */}
        <View style={styles.heroSection}>
          <View style={styles.badgeRow}>
            <View style={[styles.pillBadge, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Text style={[styles.pillText, { color: theme.accent }]}>TACTICAL STRATEGY</Text>
            </View>
          </View>

          <Text style={[styles.gameTitle, { color: theme.text }]}>Wrong Way</Text>
          <Text style={[styles.gameSubtitle, { color: theme.accent }]}>Don't be mad</Text>
          <Text style={[styles.gameTagline, { color: theme.textMuted }]}>
            Maze your opponent, block paths, and race to the finish line!
          </Text>
        </View>

        {/* Player Profile & Rank Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={() => navigation.navigate('WrongWayStats')}
          activeOpacity={0.8}
        >
          <View style={styles.profileLeft}>
            <View style={[styles.tierIconBadge, { backgroundColor: currentTier.color + '22' }]}>
              <Text style={styles.tierEmoji}>{currentTier.icon}</Text>
            </View>
            <View>
              <View style={styles.rankTitleRow}>
                <Text style={[styles.rankName, { color: currentTier.color }]}>
                  {currentTier.name}
                </Text>
                <Text style={[styles.rankElo, { color: theme.text }]}>
                  {duelRating} ELO
                </Text>
              </View>
              <Text style={[styles.levelLabel, { color: theme.subtle }]}>
                Level {xpData?.level || 1} • {stats?.wins || 0} Wins
              </Text>
            </View>
          </View>

          <ChevronRight stroke={theme.subtle} size={20} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Primary Game Mode Actions */}
        <View style={styles.menuSection}>
          {/* Vs Bot (Play against AI) */}
          <TouchableOpacity
            style={[styles.menuItemCard, styles.cardFeatured]}
            onPress={() => {
              audio.play('click');
              navigation.navigate('WrongWayConfig', { isVsBot: true });
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#8B5CF6' }]}>
              <Bot stroke="#FFF" size={26} strokeWidth={2.2} />
            </View>
            <View style={styles.menuItemTextWrap}>
              <View style={styles.itemTitleBadgeRow}>
                <Text style={styles.itemTitleLight}>Play vs Computer</Text>
                <View style={styles.hotBadge}>
                  <Text style={styles.hotBadgeText}>SOLO</Text>
                </View>
              </View>
              <Text style={styles.itemDescLight}>
                Challenge smart AI with Easy, Normal, or Tournament Hard difficulties.
              </Text>
            </View>
            <ChevronRight stroke="#FFF" size={22} strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Pass & Play (Local 2 Players) */}
          <TouchableOpacity
            style={[styles.menuItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => {
              audio.play('click');
              navigation.navigate('WrongWayConfig', { isVsBot: false });
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#EF4444' }]}>
              <Users stroke="#FFF" size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.menuItemTextWrap}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Pass & Play (2 Players)</Text>
              <Text style={[styles.itemDesc, { color: theme.textMuted }]}>
                Face a friend on the same phone. Take turns placing walls and moving.
              </Text>
            </View>
            <ChevronRight stroke={theme.subtle} size={20} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* 2 vs 2 Team Battle */}
          <TouchableOpacity
            style={[styles.menuItemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => {
              audio.play('click');
              navigation.navigate('WrongWay2v2');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#3B82F6' }]}>
              <Swords stroke="#FFF" size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.menuItemTextWrap}>
              <View style={styles.itemTitleBadgeRow}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>2 vs 2 Team Arena</Text>
                <View style={[styles.hotBadge, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.hotBadgeText}>TEAM</Text>
                </View>
              </View>
              <Text style={[styles.itemDesc, { color: theme.textMuted }]}>
                4 players, 2 teams. Coordinate shared barricades and cross paths.
              </Text>
            </View>
            <ChevronRight stroke={theme.subtle} size={20} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Secondary Hub Links */}
        <View style={styles.subGrid}>
          {/* Replays */}
          <TouchableOpacity
            style={[styles.subCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => navigation.navigate('WrongWayStats', { tab: 'replays' })}
            activeOpacity={0.8}
          >
            <History stroke={theme.accent} size={22} strokeWidth={2.2} />
            <Text style={[styles.subCardTitle, { color: theme.text }]}>Replays</Text>
            <Text style={[styles.subCardDesc, { color: theme.subtle }]}>Review games</Text>
          </TouchableOpacity>

          {/* How to Play */}
          <TouchableOpacity
            style={[styles.subCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => setShowTutorial(true)}
            activeOpacity={0.8}
          >
            <HelpCircle stroke="#10B981" size={22} strokeWidth={2.2} />
            <Text style={[styles.subCardTitle, { color: theme.text }]}>Rules</Text>
            <Text style={[styles.subCardDesc, { color: theme.subtle }]}>How to play</Text>
          </TouchableOpacity>

          {/* Stats & Rank */}
          <TouchableOpacity
            style={[styles.subCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => navigation.navigate('WrongWayStats')}
            activeOpacity={0.8}
          >
            <Trophy stroke="#F59E0B" size={22} strokeWidth={2.2} />
            <Text style={[styles.subCardTitle, { color: theme.text }]}>Rankings</Text>
            <Text style={[styles.subCardDesc, { color: theme.subtle }]}>Leaderboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Tutorial Modal */}
      <TutorialModal
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
        darkMode={darkMode}
      />
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
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginVertical: 10,
  },
  badgeRow: {
    marginBottom: 6,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  gameTitle: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    letterSpacing: -0.5,
  },
  gameSubtitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    marginTop: -2,
    marginBottom: 6,
  },
  gameTagline: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    marginTop: 14,
    marginBottom: 18,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierEmoji: {
    fontSize: 22,
  },
  rankTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  rankElo: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  levelLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 2,
  },
  menuSection: {
    gap: 12,
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 14,
  },
  cardFeatured: {
    backgroundColor: '#7C3AED',
    borderColor: '#8B5CF6',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  menuIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTextWrap: {
    flex: 1,
  },
  itemTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitleLight: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#FFF',
  },
  itemDescLight: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
    lineHeight: 16,
  },
  itemTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  itemDesc: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  hotBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hotBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FFF',
  },
  subGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  subCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  subCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    marginTop: 4,
  },
  subCardDesc: {
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
});
