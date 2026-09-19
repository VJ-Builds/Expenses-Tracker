/**
 * Wrong Way: Don't be mad - Victory Celebration Blast Component
 * Displays a colorful particle burst explosion with stars, sparkles, and
 * a glowing celebration badge before transitioning to the match settlement card.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { FONTS } from '../../../constants/theme';
import audio from '../engine/audioService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PARTICLE_COUNT = 32;
const SPARKLE_EMOJIS = ['✨', '⭐', '🌟', '🎉', '🎊', '💫', '🏆', '💎'];
const COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#FBBF24', '#06B6D4'];

export default function VictoryCelebration({
  visible,
  winner, // 'A' | 'B' | 'Team Red' | 'Team Blue'
  onComplete,
  darkMode = true,
}) {
  const blastAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Generate particle parameters once per mount
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
      const angle = (i / PARTICLE_COUNT) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
      const distance = 80 + Math.random() * 180;
      const size = 16 + Math.random() * 14;
      const color = COLORS[i % COLORS.length];
      const emoji = SPARKLE_EMOJIS[i % SPARKLE_EMOJIS.length];
      const rotation = Math.floor(Math.random() * 360);
      return { angle, distance, size, color, emoji, rotation };
    })
  ).current;

  useEffect(() => {
    if (!visible) {
      blastAnim.setValue(0);
      badgeScale.setValue(0);
      fadeAnim.setValue(1);
      return;
    }

    // Play victory sound and haptics
    audio.play(winner === 'A' || winner === 'Team Red' ? 'win' : 'click');
    audio.haptic('success');

    // Run parallel particle blast and badge bounce animations
    Animated.parallel([
      // 1. Particle outward explosion
      Animated.timing(blastAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
      // 2. Center badge spring pop-in
      Animated.sequence([
        Animated.spring(badgeScale, {
          toValue: 1.15,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Auto-transition to victory card after blast finishes
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        if (onComplete) onComplete();
      });
    }, 1600);

    return () => clearTimeout(timer);
  }, [visible, winner]);

  if (!visible) return null;

  const isPlayerWin = winner === 'A' || winner === 'Team Red';
  const titleText = isPlayerWin ? 'VICTORY!' : 'MATCH FINISHED!';
  const subText = isPlayerWin
    ? (winner === 'Team Red' ? 'Team Red Reached Goal!' : 'You Reached The Goal!')
    : (winner === 'Team Blue' ? 'Team Blue Won!' : 'Player 2 Reached The Goal!');

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={() => {
        if (onComplete) onComplete();
      }}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Animated Burst Particles */}
        {particles.map((p, index) => {
          const translateX = blastAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.cos(p.angle) * p.distance],
          });
          const translateY = blastAnim.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, Math.sin(p.angle) * p.distance * 0.7, Math.sin(p.angle) * p.distance + 40],
          });
          const opacity = blastAnim.interpolate({
            inputRange: [0, 0.1, 0.7, 1],
            outputRange: [0, 1, 0.9, 0],
          });
          const scale = blastAnim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0.3, 1.2, 0.5],
          });

          return (
            <Animated.View
              key={`particle-${index}`}
              style={[
                styles.particle,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                    { rotate: `${p.rotation}deg` },
                  ],
                  opacity,
                },
              ]}
            >
              <Text style={{ fontSize: p.size }}>{p.emoji}</Text>
            </Animated.View>
          );
        })}

        {/* Center Glowing Celebration Badge */}
        <Animated.View
          style={[
            styles.badgeWrap,
            {
              backgroundColor: isPlayerWin
                ? (darkMode ? 'rgba(239, 68, 68, 0.92)' : 'rgba(220, 38, 38, 0.95)')
                : (darkMode ? 'rgba(59, 130, 246, 0.92)' : 'rgba(37, 99, 235, 0.95)'),
              transform: [{ scale: badgeScale }],
              shadowColor: isPlayerWin ? '#EF4444' : '#3B82F6',
            },
          ]}
        >
          <Text style={styles.trophyIcon}>{isPlayerWin ? '🏆' : '⭐'}</Text>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.subtitle}>{subText}</Text>
          <View style={styles.tapTipBadge}>
            <Text style={styles.tapTipText}>Tap to continue</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  particle: {
    position: 'absolute',
  },
  badgeWrap: {
    paddingHorizontal: 28,
    paddingVertical: 22,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 16,
    maxWidth: SCREEN_WIDTH * 0.85,
  },
  trophyIcon: {
    fontSize: 48,
    marginBottom: 6,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  tapTipBadge: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  tapTipText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
  },
});
