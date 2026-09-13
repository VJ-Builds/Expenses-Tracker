import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import {
  Wallet,
  FileText,
  LayoutGrid,
  PlusSquare,
  ChevronRight,
  Lightbulb,
  Clock,
  Bell,
  Settings,
  User as UserIcon,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { FONTS } from '../constants/theme';
import { getNoteStats } from '../notes/db/noteQueries';
import { getDb } from '../db/schema';

export default function AppsHubScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 4 : 8);
  const navHeight = 56 + bottomInset;
  const [activeTab, setActiveTab] = useState('MyApps');
  const [expenseCount, setExpenseCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);

  useEffect(() => {
    try {
      if (user?.id) {
        const stats = getNoteStats(user.id);
        setNotesCount(stats.active + stats.pinned);

        const db = getDb();
        const expRow = db.getFirstSync(
          `SELECT COUNT(*) as cnt FROM expenses WHERE user_id = ?;`,
          [user.id]
        );
        if (expRow) setExpenseCount(expRow.cnt);
      }
    } catch (e) {
      console.error('Error loading hub stats:', e);
    }
  }, [user]);

  const initials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : 'VB';

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* Ambient background glowing orbs */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.orb, styles.orb3]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: navHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>My Apps</Text>
            <Text style={styles.headerSubtitle}>Access your tools and stay productive</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Menu')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 2x2 App Grid */}
        <View style={styles.grid}>
          {/* Row 1: Primary Apps */}
          <View style={styles.gridRow}>
            {/* Card 1: Expense Tracker */}
            <TouchableOpacity
              style={[styles.appCard, styles.cardExpense]}
              onPress={() => navigation.navigate('Main')}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.appIconWrap, { backgroundColor: '#10B981' }]}>
                  <Wallet stroke="#FFFFFF" size={24} strokeWidth={2.2} />
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.badgeText, { color: '#10B981' }]}>Financial</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Expense Tracker</Text>
              <Text style={styles.cardDesc}>
                Track your expenses, manage your budget and build better habits.
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.arrowWrap}>
                  <ChevronRight stroke="#10B981" size={18} strokeWidth={2.5} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Card 2: Notes */}
            <TouchableOpacity
              style={[styles.appCard, styles.cardNotes]}
              onPress={() => navigation.navigate('NotesList')}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.appIconWrap, { backgroundColor: '#2563EB' }]}>
                  <FileText stroke="#FFFFFF" size={24} strokeWidth={2.2} />
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.badgeText, { color: '#2563EB' }]}>Productivity</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Notes</Text>
              <Text style={styles.cardDesc}>
                Capture your thoughts, ideas and important information.
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.arrowWrap}>
                  <ChevronRight stroke="#2563EB" size={18} strokeWidth={2.5} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2: Secondary / Expansion Apps */}
          <View style={styles.gridRow}>
            {/* Card 3: More Apps */}
            <TouchableOpacity
              style={[styles.appCard, styles.cardMore]}
              onPress={() =>
                Alert.alert(
                  'Coming Soon! 🚀',
                  'We are building more productivity tools for the VJ Builds suite. Stay tuned!'
                )
              }
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.appIconWrap, { backgroundColor: '#8B5CF6' }]}>
                  <LayoutGrid stroke="#FFFFFF" size={24} strokeWidth={2.2} />
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#F3E8FF' }]}>
                  <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>Coming Soon</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>More Apps</Text>
              <Text style={styles.cardDesc}>
                We’re working on more useful apps to make your day better.
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.arrowWrap}>
                  <ChevronRight stroke="#8B5CF6" size={18} strokeWidth={2.5} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Card 4: Add New App */}
            <TouchableOpacity
              style={[styles.appCard, styles.cardAdd]}
              onPress={() =>
                Alert.alert(
                  'Custom Tools 💡',
                  'Custom modular apps and plugin creation will be unlocked in an upcoming update.'
                )
              }
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.appIconWrap, { backgroundColor: '#F97316' }]}>
                  <PlusSquare stroke="#FFFFFF" size={24} strokeWidth={2.2} />
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.badgeText, { color: '#F97316' }]}>Coming Soon</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Add New App</Text>
              <Text style={styles.cardDesc}>
                Create your own app or add a new tool.
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.arrowWrap}>
                  <ChevronRight stroke="#F97316" size={18} strokeWidth={2.5} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Promo Glassmorphic Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoIconCircle}>
            <Lightbulb stroke="#38BDF8" size={28} strokeWidth={2.2} />
          </View>
          <View style={styles.promoTextWrap}>
            <Text style={styles.promoTitle}>One App, Multiple Tools</Text>
            <Text style={styles.promoDesc}>
              Switch between different apps, all in one place. Stay organized and get more done!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { height: navHeight, paddingBottom: bottomInset, paddingTop: 4 }]}>
        {/* Tab 1: My Apps */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('MyApps')}
          activeOpacity={0.8}
        >
          <LayoutGrid
            stroke={activeTab === 'MyApps' ? '#2563EB' : '#94A3B8'}
            size={22}
            strokeWidth={activeTab === 'MyApps' ? 2.5 : 2}
          />
          <Text style={[styles.navLabel, activeTab === 'MyApps' && styles.navLabelActive]}>
            My Apps
          </Text>
          {activeTab === 'MyApps' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        {/* Tab 2: Recent */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            Alert.alert(
              'Recent Activity ⏱️',
              `• Expense Tracker: ${expenseCount} expenses logged\n• Notes App: ${notesCount} active notes`
            );
          }}
          activeOpacity={0.8}
        >
          <Clock stroke="#94A3B8" size={22} strokeWidth={2} />
          <Text style={styles.navLabel}>Recent</Text>
        </TouchableOpacity>

        {/* Tab 3: Notifications */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.8}
        >
          <Bell stroke="#94A3B8" size={22} strokeWidth={2} />
          <Text style={styles.navLabel}>Notifications</Text>
        </TouchableOpacity>

        {/* Tab 4: Settings */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Menu')}
          activeOpacity={0.8}
        >
          <Settings stroke="#94A3B8" size={22} strokeWidth={2} />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#DBEAFE',
    top: -50,
    right: -70,
    opacity: 0.6,
  },
  orb2: {
    width: 260,
    height: 260,
    backgroundColor: '#EDE9FE',
    top: 300,
    left: -80,
    opacity: 0.5,
  },
  orb3: {
    width: 320,
    height: 320,
    backgroundColor: '#FEF3C7',
    bottom: -60,
    right: -80,
    opacity: 0.45,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  avatarBtn: {
    padding: 3,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  grid: {
    marginBottom: 22,
    gap: 14,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  appCard: {
    flex: 1,
    minHeight: 184,
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  appIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
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
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  arrowWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 22,
    padding: 18,
    gap: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  promoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  promoTextWrap: {
    flex: 1,
  },
  promoTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14.5,
    color: '#0369A1',
    marginBottom: 3,
  },
  promoDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#0284C7',
    lineHeight: 16.5,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  navLabelActive: {
    fontFamily: FONTS.semiBold,
    color: '#2563EB',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
});
