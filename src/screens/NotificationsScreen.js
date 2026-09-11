import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, CheckCircle2, AlertTriangle, Info, Star } from 'lucide-react-native';

import { FONTS, RADIUS, SHADOWS } from '../constants/theme';
import { useNotifications } from '../context/NotificationContext';

const BG_APP = '#F7F8FA';
const TEXT_DARK = '#1C1C28';
const TEXT_MUTED = '#8F92A1';
const BRAND_PURPLE = '#FF6B6B'; // Sunset Horizon Primary

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { notifications, markAllAsRead, unreadCount } = useNotifications();

  // Mark all as read when opening the screen (or they can click a button)
  // Let's use a button so they can see the unread state first.

  const handleMarkAllRead = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    markAllAsRead();
  };

  const renderIcon = (type, read) => {
    const color = read ? TEXT_MUTED : (type === 'warning' ? '#F59E0B' : type === 'update' ? '#10B981' : BRAND_PURPLE);
    switch (type) {
      case 'warning': return <AlertTriangle stroke={color} size={24} />;
      case 'update': return <Star stroke={color} size={24} />;
      case 'info':
      default:
        return <Info stroke={color} size={24} />;
    }
  };

  const timeAgo = (isoString) => {
    const diff = (new Date() - new Date(isoString)) / 1000; // seconds
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft stroke={TEXT_DARK} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <CheckCircle2 stroke={BRAND_PURPLE} size={24} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} /> // Placeholder for alignment
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Bell stroke={BRAND_PURPLE} size={32} opacity={0.6} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>When you get alerts or updates, they'll show up here.</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <View key={notif.id} style={[styles.card, !notif.read && styles.unreadCard]}>
              <View style={[styles.iconWrap, { backgroundColor: notif.read ? '#F3F4F6' : BRAND_PURPLE + '14' }]}>
                {renderIcon(notif.type, notif.read)}
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, !notif.read && { color: TEXT_DARK }]}>{notif.title}</Text>
                  <Text style={styles.cardTime}>{timeAgo(notif.time)}</Text>
                </View>
                <Text style={styles.cardMessage}>{notif.message}</Text>
              </View>
              {!notif.read && <View style={styles.unreadDot} />}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG_APP },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: BG_APP,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: TEXT_DARK },
  
  content: { padding: 20, paddingBottom: 60 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    alignItems: 'flex-start',
    ...SHADOWS.card,
  },
  unreadCard: {
    backgroundColor: '#FAFAFC', // Slightly different background to highlight
    borderLeftWidth: 4,
    borderLeftColor: BRAND_PURPLE,
  },
  iconWrap: {
    width: 48, height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 14, color: TEXT_MUTED, flex: 1, marginRight: 8 },
  cardTime: { fontFamily: FONTS.medium, fontSize: 11, color: TEXT_MUTED },
  cardMessage: { fontFamily: FONTS.medium, fontSize: 13, color: TEXT_MUTED, lineHeight: 18 },
  
  unreadDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_PURPLE,
    position: 'absolute',
    top: 16,
    right: 16,
  },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND_PURPLE + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg, color: TEXT_DARK },
  emptySub: { fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, color: TEXT_MUTED, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
