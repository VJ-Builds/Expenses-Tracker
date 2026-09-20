import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Gamepad2,
  Trophy,
  Sparkles,
  Zap,
  Grid,
  Type,
  Flag,
  Play,
  Swords,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/theme';
import { GAMES_LIST } from '../constants/gamesRegistry';

export default function GamesHubScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Strategy', 'Puzzle', 'Memory', 'Arcade', 'Word'];

  const filteredGames = selectedCategory === 'All'
    ? GAMES_LIST
    : GAMES_LIST.filter(g => g.category === selectedCategory);

  const renderGameIcon = (iconName, color) => {
    const props = { stroke: '#FFFFFF', size: 22, strokeWidth: 2.2 };
    switch (iconName) {
      case 'Grid':
        return <Grid {...props} />;
      case 'Sparkles':
        return <Sparkles {...props} />;
      case 'Zap':
        return <Zap {...props} />;
      case 'Type':
        return <Type {...props} />;
      case 'Flag':
        return <Flag {...props} />;
      case 'Swords':
        return <Swords {...props} />;
      default:
        return <Gamepad2 {...props} />;
    }
  };

  const handleGamePress = (game) => {
    if (game.status === 'playable' && game.route) {
      navigation.navigate(game.route);
      return;
    }
    Alert.alert(
      `🎮 ${game.title}`,
      `"${game.title}" is queued up in our Games Hub!\n\n${game.description}\n\nLet's build this game first together!`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }]}>
      <StatusBar barStyle="dark-content" />
      {/* Ambient background glowing orbs */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.orb, styles.orb3]} />
      </View>

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft stroke="#0F172A" size={22} strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Games Hub</Text>
          <Text style={styles.topBarSubtitle}>Play, challenge your mind & relax</Text>
        </View>

        <View style={styles.trophyWrap}>
          <Trophy stroke="#F59E0B" size={20} strokeWidth={2.2} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome / Promo Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroIconWrap}>
            <Gamepad2 stroke="#8B5CF6" size={28} strokeWidth={2.2} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Arcade & Brain Games</Text>
            <Text style={styles.heroDesc}>
              Quick mini-games built directly into your app. Pick your favorite to get started!
            </Text>
          </View>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsRow}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2x2 Games Grid matching AppsHubScreen */}
        <View style={styles.grid}>
          {filteredGames.reduce((rows, game, idx) => {
            if (idx % 2 === 0) rows.push([game]);
            else rows[rows.length - 1].push(game);
            return rows;
          }, []).map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={styles.gridRow}>
              {row.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={styles.gameCard}
                  onPress={() => handleGamePress(game)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.gameIconWrap, { backgroundColor: game.color }]}>
                      {renderGameIcon(game.iconName, game.color)}
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: game.bgColor }]}>
                      <Text style={[styles.badgeText, { color: game.color }]}>
                        {game.category}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.gameTitle} numberOfLines={1}>
                    {game.title}
                  </Text>
                  <Text style={styles.gameSubtitle} numberOfLines={1}>
                    {game.subtitle}
                  </Text>
                  <Text style={styles.gameDesc} numberOfLines={2}>
                    {game.description}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={[styles.actionTag, { backgroundColor: game.bgColor }]}>
                      <Play stroke={game.color} size={11} fill={game.color} style={{ marginRight: 4 }} />
                      <Text style={[styles.actionTagText, { color: game.color }]}>
                        Play
                      </Text>
                    </View>
                    <View style={[styles.arrowWrap, { backgroundColor: game.bgColor }]}>
                      <ChevronRight stroke={game.color} size={16} strokeWidth={2.6} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {row.length === 1 && <View style={[styles.gameCard, { opacity: 0 }]} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 280,
    height: 280,
    backgroundColor: '#EDE9FE',
    top: -40,
    right: -60,
    opacity: 0.7,
  },
  orb2: {
    width: 240,
    height: 240,
    backgroundColor: '#FCE7F3',
    top: 260,
    left: -70,
    opacity: 0.55,
  },
  orb3: {
    width: 300,
    height: 300,
    backgroundColor: '#DBEAFE',
    bottom: -50,
    right: -70,
    opacity: 0.6,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  topBarCenter: {
    flex: 1,
    marginLeft: 14,
  },
  topBarTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  topBarSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 1,
  },
  trophyWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  heroIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#6D28D9',
    marginBottom: 3,
  },
  heroDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16.5,
  },
  categoryPillsRow: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryPillText: {
    fontFamily: FONTS.medium,
    fontSize: 12.5,
    color: '#64748B',
  },
  categoryPillTextActive: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  grid: {
    gap: 14,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  gameCard: {
    flex: 1,
    minHeight: 195,
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gameIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  gameTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15.5,
    color: '#0F172A',
    marginBottom: 2,
  },
  gameSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
  },
  gameDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  actionTagText: {
    fontFamily: FONTS.bold,
    fontSize: 10.5,
  },
  arrowWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
