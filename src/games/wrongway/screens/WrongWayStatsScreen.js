/**
 * Wrong Way: Don't be mad - Player Profile, Ranks & Replay History Screen
 * Displays player level & XP bar, ELO ratings, rank tier badges, statistics breakdown,
 * and list of match replays with interactive step playback.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  ArrowLeft,
  Trophy,
  Flame,
  Percent,
  Play,
  Film,
  Zap,
} from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../../constants/theme';
import {
  THEME,
  getRankTier,
  RANK_TIERS,
} from '../constants/wrongWayConstants';
import {
  getStats,
  getEloRatings,
  getXp,
  getReplays,
  getSettings,
} from '../engine/storageService';

import ReplayViewerModal from '../components/ReplayViewerModal';

export default function WrongWayStatsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [darkMode, setDarkMode] = useState(true);
  const theme = darkMode ? THEME.dark : THEME.light;

  const initialTab = route.params?.tab || 'stats';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [stats, setStats] = useState(null);
  const [elo, setElo] = useState(null);
  const [xpData, setXpData] = useState(null);
  const [replays, setReplays] = useState([]);

  const [selectedReplay, setSelectedReplay] = useState(null);

  const loadData = async () => {
    const s = await getStats();
    const e = await getEloRatings();
    const x = await getXp();
    const r = await getReplays();
    const cfg = await getSettings();
    setStats(s);
    setElo(e);
    setXpData(x);
    setReplays(r);
    if (typeof cfg.darkMode === 'boolean') {
      setDarkMode(cfg.darkMode);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const duelRating = elo?.duel || 1000;
  const currentTier = getRankTier(duelRating);

  const totalGames = stats?.games || 0;
  const totalWins = stats?.wins || 0;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft stroke={theme.text} size={20} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>Career & Rankings</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Player Level & XP Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.tierHeroRow}>
            <View style={[styles.tierHeroBadge, { backgroundColor: currentTier.color + '22' }]}>
              <Text style={styles.tierHeroEmoji}>{currentTier.icon}</Text>
            </View>

            <View style={styles.tierTextWrap}>
              <View style={styles.tierNameRow}>
                <Text style={[styles.tierHeroName, { color: currentTier.color }]}>
                  {currentTier.name}
                </Text>
                <Text style={[styles.tierHeroElo, { color: theme.text }]}>
                  {duelRating} ELO
                </Text>
              </View>
              <Text style={[styles.levelTitle, { color: theme.textMuted }]}>
                Player Level {xpData?.level || 1}
              </Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpBarWrap}>
            <View style={styles.xpTextRow}>
              <Text style={[styles.xpLabel, { color: theme.subtle }]}>XP PROGRESS</Text>
              <Text style={[styles.xpCount, { color: theme.text }]}>
                {xpData?.currentXp || 0} / {xpData?.neededXp || 100} XP
              </Text>
            </View>
            <View style={[styles.xpTrack, { backgroundColor: theme.cellHover }]}>
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${Math.round((xpData?.progress || 0) * 100)}%`,
                    backgroundColor: theme.accent,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Tab Switcher: Stats vs Replays */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'stats' && { backgroundColor: theme.accent },
            ]}
            onPress={() => setActiveTab('stats')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'stats' ? '#FFF' : theme.subtle },
              ]}
            >
              Performance Stats
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'replays' && { backgroundColor: theme.accent },
            ]}
            onPress={() => setActiveTab('replays')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'replays' ? '#FFF' : theme.subtle },
              ]}
            >
              Match Replays ({replays.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: Performance Stats */}
        {activeTab === 'stats' ? (
          <View>
            {/* Quick Metrics 2x2 Grid */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Trophy stroke="#3B82F6" size={20} />
                <Text style={[styles.metricVal, { color: theme.text }]}>{totalWins}</Text>
                <Text style={[styles.metricLbl, { color: theme.subtle }]}>Total Wins</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Percent stroke="#10B981" size={20} />
                <Text style={[styles.metricVal, { color: theme.text }]}>{winRate}%</Text>
                <Text style={[styles.metricLbl, { color: theme.subtle }]}>Win Rate</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Flame stroke="#F59E0B" size={20} />
                <Text style={[styles.metricVal, { color: theme.text }]}>{stats?.streak || 0}</Text>
                <Text style={[styles.metricLbl, { color: theme.subtle }]}>Current Streak</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Zap stroke="#8B5CF6" size={20} />
                <Text style={[styles.metricVal, { color: theme.text }]}>{stats?.bestStreak || 0}</Text>
                <Text style={[styles.metricLbl, { color: theme.subtle }]}>Best Streak</Text>
              </View>
            </View>

            {/* Mode Breakdown */}
            <Text style={[styles.sectionHeading, { color: theme.subtle }]}>MODE BREAKDOWN</Text>
            {['duel', 'classic', '2v2'].map(modeKey => {
              const m = stats?.byMode?.[modeKey] || { games: 0, wins: 0, losses: 0 };
              const modeRate = m.games > 0 ? Math.round((m.wins / m.games) * 100) : 0;
              const modeLabel = modeKey === 'duel' ? 'Duel Arena (1v1)' : modeKey === 'classic' ? 'Classic Race' : '2v2 Team Arena';

              return (
                <View
                  key={modeKey}
                  style={[styles.breakdownRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View>
                    <Text style={[styles.breakdownTitle, { color: theme.text }]}>{modeLabel}</Text>
                    <Text style={[styles.breakdownSub, { color: theme.subtle }]}>
                      {m.wins}W • {m.losses}L • {m.games} Games
                    </Text>
                  </View>
                  <View style={styles.rateBadge}>
                    <Text style={[styles.rateText, { color: theme.accent }]}>{modeRate}% Win</Text>
                  </View>
                </View>
              );
            })}

            {/* Rank Ladder Reference */}
            <Text style={[styles.sectionHeading, { color: theme.subtle }]}>RANK TIERS</Text>
            <View style={[styles.ladderCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {RANK_TIERS.map(t => {
                const isCurrent = currentTier.id === t.id;
                return (
                  <View key={t.id} style={styles.ladderRow}>
                    <Text style={styles.ladderEmoji}>{t.icon}</Text>
                    <Text style={[styles.ladderName, { color: t.color }, isCurrent && { fontWeight: 'bold' }]}>
                      {t.name}
                    </Text>
                    <Text style={[styles.ladderRange, { color: theme.subtle }]}>
                      {t.max > 9000 ? `${t.min}+` : `${t.min} - ${t.max}`} ELO
                    </Text>
                    {isCurrent && (
                      <View style={[styles.currentTierBadge, { backgroundColor: t.color }]}>
                        <Text style={styles.currentTierBadgeText}>YOU</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          /* TAB 2: Match Replays */
          <View>
            {replays.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Film stroke={theme.subtle} size={36} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Replays Yet</Text>
                <Text style={[styles.emptySub, { color: theme.subtle }]}>
                  Finished matches are automatically recorded and saved here for review!
                </Text>
              </View>
            ) : (
              replays.map((rep, idx) => (
                <TouchableOpacity
                  key={rep.id || idx}
                  style={[styles.replayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  onPress={() => setSelectedReplay(rep)}
                  activeOpacity={0.8}
                >
                  <View style={styles.replayLeft}>
                    <View
                      style={[
                        styles.replayIconWrap,
                        { backgroundColor: rep.winner === 'A' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)' },
                      ]}
                    >
                      <Text style={styles.replayEmoji}>{rep.winner === 'A' ? '🔴' : '🔵'}</Text>
                    </View>
                    <View>
                      <Text style={[styles.replayMode, { color: theme.text }]}>
                        {rep.mapType === 'duel' ? 'Duel Match' : 'Classic Race'} • {rep.winner === 'A' ? 'Red Won' : 'Blue Won'}
                      </Text>
                      <Text style={[styles.replayDate, { color: theme.subtle }]}>
                        {new Date(rep.date).toLocaleDateString()} • {(rep.moveHist || rep.moves || []).length} Moves
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.watchBtn, { backgroundColor: theme.accent }]}>
                    <Play stroke="#FFF" fill="#FFF" size={14} />
                    <Text style={styles.watchBtnText}>Watch</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Interactive Replay Viewer Modal */}
      <ReplayViewerModal
        visible={!!selectedReplay}
        replay={selectedReplay}
        onClose={() => setSelectedReplay(null)}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 17,
  },
  profileCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  tierHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  tierHeroBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierHeroEmoji: {
    fontSize: 28,
  },
  tierTextWrap: {
    flex: 1,
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierHeroName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  tierHeroElo: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  levelTitle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginTop: 2,
  },
  xpBarWrap: {
    gap: 6,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  xpCount: {
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  metricVal: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    marginTop: 4,
  },
  metricLbl: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  breakdownTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  breakdownSub: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 2,
  },
  rateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  rateText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  ladderCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  ladderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  ladderEmoji: {
    fontSize: 16,
  },
  ladderName: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    width: 90,
  },
  ladderRange: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    flex: 1,
  },
  currentTierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentTierBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FFF',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginTop: 6,
  },
  emptySub: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
  },
  replayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  replayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  replayIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayEmoji: {
    fontSize: 16,
  },
  replayMode: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  replayDate: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 2,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  watchBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FFF',
  },
});
