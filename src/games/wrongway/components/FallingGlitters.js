/**
 * Wrong Way: Don't be mad - Falling Glitters & Sparkles Celebration
 * Renders a lush, full-screen shower of colorful glitters, stars,
 * emojis, and confetti cascading smoothly from top to bottom across
 * the entire screen for a fixed duration (default 3 seconds), then
 * gracefully fades out.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';

const PARTICLE_COUNT = 80;

const GLITTER_COLORS = [
  '#F59E0B', // Bright Gold
  '#EF4444', // Crimson Red
  '#3B82F6', // Electric Blue
  '#10B981', // Emerald Green
  '#8B5CF6', // Radiant Purple
  '#EC4899', // Hot Pink
  '#FBBF24', // Amber Spark
  '#06B6D4', // Cyan Glow
  '#A855F7', // Violet
  '#F43F5E', // Rose
  '#FFFFFF', // Diamond White
];

const EMOJIS = ['✨', '⭐', '🌟', '💫', '🎉', '🎊', '✨', '⭐'];
const STAR_SYMBOLS = ['✦', '★', '✧', '✷', '✦', '✪'];

function SingleGlitter({ config, screenHeight, isStopping }) {
  const fallAnim = useRef(new Animated.Value(config.initialProgress)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    let loopAnim = null;

    // Remaining duration for initial cycle
    const remainingFraction = Math.max(0.05, 1 - config.initialProgress);
    const firstDuration = Math.max(150, Math.round(config.duration * remainingFraction));

    const firstCycle = Animated.timing(fallAnim, {
      toValue: 1,
      duration: firstDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    const startContinuousLoop = () => {
      if (!isMounted || isStopping) return;
      fallAnim.setValue(0);
      loopAnim = Animated.timing(fallAnim, {
        toValue: 1,
        duration: config.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      loopAnim.start(({ finished }) => {
        if (finished && isMounted && !isStopping) {
          startContinuousLoop();
        }
      });
    };

    firstCycle.start(({ finished }) => {
      if (finished && isMounted) {
        startContinuousLoop();
      }
    });

    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: config.swayDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: -1,
          duration: config.swayDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    swayLoop.start();

    return () => {
      isMounted = false;
      firstCycle.stop();
      if (loopAnim) loopAnim.stop();
      swayLoop.stop();
    };
  }, [isStopping]);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, screenHeight + 60],
  });

  const translateX = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-config.swayRange, config.swayRange],
  });

  const rotate = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${config.startRot}deg`, `${config.startRot + config.rotSpeed}deg`],
  });

  const opacity = fallAnim.interpolate({
    inputRange: [0, 0.05, 0.90, 1],
    outputRange: [0, 1, 0.95, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: config.startX,
          transform: [{ translateX }, { translateY }, { rotate }],
          opacity,
        },
      ]}
    >
      {config.type === 'emoji' ? (
        <Text style={{ fontSize: config.size }}>{config.emoji}</Text>
      ) : config.type === 'star' ? (
        <Text
          style={{
            fontSize: config.size,
            color: config.color,
            textShadowColor: config.color,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          }}
        >
          {config.starChar}
        </Text>
      ) : config.type === 'circle' ? (
        <View
          style={{
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2,
            backgroundColor: config.color,
            shadowColor: config.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 6,
            elevation: 5,
          }}
        />
      ) : (
        <View
          style={{
            width: config.size * 1.6,
            height: config.size * 0.7,
            borderRadius: 2,
            backgroundColor: config.color,
            shadowColor: config.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 3,
          }}
        />
      )}
    </Animated.View>
  );
}

export default function FallingGlitters({
  active = true,
  count = PARTICLE_COUNT,
  duration = 3000,
  onComplete,
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Drop glitters for `duration` (3000ms), then smoothly fade out
  useEffect(() => {
    if (!active) return;

    setVisible(true);
    setIsStopping(false);
    fadeAnim.setValue(1);

    if (duration > 0) {
      const stopTimer = setTimeout(() => {
        setIsStopping(true);
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            setVisible(false);
            if (onComplete) onComplete();
          }
        });
      }, duration);

      return () => clearTimeout(stopTimer);
    }
  }, [active, duration]);

  // Create particles with stratified horizontal lanes to guarantee even distribution everywhere
  const particles = useMemo(() => {
    if (!screenWidth || screenWidth <= 0) return [];

    const effectiveWidth = Math.max(300, screenWidth - 24);
    const lanes = 16; // 16 horizontal bands across the whole screen

    return Array.from({ length: count }).map((_, i) => {
      // Stratified lane assignment + random jitter within lane
      const lane = i % lanes;
      const laneWidth = effectiveWidth / lanes;
      const startX = 12 + lane * laneWidth + Math.random() * (laneWidth - 4);

      // Staggered initial progress so glitters are already falling at various heights immediately
      const initialProgress = (i / count) * 0.95;

      // Festive fall duration (1.8s - 2.8s) so particles travel full screen within 3s window
      const fallDuration = 1800 + Math.random() * 1000;
      const swayRange = 10 + Math.random() * 20;
      const swayDuration = 900 + Math.random() * 800;
      const startRot = Math.floor(Math.random() * 360);
      const rotSpeed = 180 + Math.floor(Math.random() * 400);
      const color = GLITTER_COLORS[i % GLITTER_COLORS.length];

      // Particle types: 30% emoji sparkles, 25% star symbols, 25% glowing circles, 20% confetti ribbons
      const typeChoice = Math.random();
      let type = 'circle';
      let size = 8;
      if (typeChoice < 0.30) {
        type = 'emoji';
        size = 14 + Math.random() * 12;
      } else if (typeChoice < 0.55) {
        type = 'star';
        size = 13 + Math.random() * 11;
      } else if (typeChoice < 0.80) {
        type = 'circle';
        size = 6 + Math.random() * 7;
      } else {
        type = 'ribbon';
        size = 7 + Math.random() * 6;
      }

      const emoji = EMOJIS[i % EMOJIS.length];
      const starChar = STAR_SYMBOLS[i % STAR_SYMBOLS.length];

      return {
        id: `glitter-${i}`,
        startX,
        initialProgress,
        duration: fallDuration,
        swayRange,
        swayDuration,
        startRot,
        rotSpeed,
        color,
        type,
        size,
        emoji,
        starChar,
      };
    });
  }, [screenWidth, count]);

  if (!active || !visible || particles.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="none">
      {particles.map(p => (
        <SingleGlitter
          key={p.id}
          config={p}
          screenHeight={screenHeight}
          isStopping={isStopping}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 9999,
    elevation: 9999,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
