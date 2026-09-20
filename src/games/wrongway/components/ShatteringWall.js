/**
 * Wrong Way: Don't be mad - Shattering Wall Collapse Effect Component
 * Renders a satisfying, visceral destruction animation when a wall is smashed with a hammer.
 * Features:
 * - Hammer strike impact with quick downward swing
 * - Radial shockwave flash
 * - 8 distinct jagged stone chunks with physical gravity, tumble rotation, and outward burst
 * - Flying dust/spark rubble particles
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

export default function ShatteringWall({
  wallKey,
  cellSize,
  wallThickness = 7.5,
  color = '#94A3B8',
  onComplete,
}) {
  const anim = useRef(new Animated.Value(0)).current;

  // Parse wall properties: e.g. "H-2-3" or "V-4-5"
  const { type, r, c } = useMemo(() => {
    if (!wallKey) return { type: 'H', r: 0, c: 0 };
    const parts = wallKey.split('-');
    return {
      type: parts[0] || 'H',
      r: parseInt(parts[1] || '0', 10),
      c: parseInt(parts[2] || '0', 10),
    };
  }, [wallKey]);

  const isH = type === 'H';
  const totalLength = 2 * cellSize;

  // Bounding box of original wall
  const wallBox = useMemo(() => {
    if (isH) {
      return {
        left: c * cellSize,
        top: (r + 1) * cellSize - wallThickness / 2,
        width: totalLength,
        height: wallThickness,
      };
    }
    return {
      left: (c + 1) * cellSize - wallThickness / 2,
      top: r * cellSize,
      width: wallThickness,
      height: totalLength,
    };
  }, [isH, r, c, cellSize, wallThickness, totalLength]);

  // Center of the wall
  const centerX = isH ? wallBox.left + totalLength / 2 : wallBox.left + wallThickness / 2;
  const centerY = isH ? wallBox.top + wallThickness / 2 : wallBox.top + totalLength / 2;

  // Generate 8 stone chunks
  const chunks = useMemo(() => {
    const count = 8;
    return Array.from({ length: count }).map((_, i) => {
      const dir = i < 4 ? -1 : 1;
      const distFromCenter = Math.abs(i - 3.5);

      let pLeft = 0;
      let pTop = 0;
      let pWidth = 0;
      let pHeight = 0;

      if (isH) {
        const segWidth = totalLength / count;
        pLeft = wallBox.left + i * segWidth;
        pWidth = segWidth * 1.05;
        pHeight = wallThickness * (0.85 + (i % 3) * 0.15);
        pTop = wallBox.top + (wallThickness - pHeight) / 2;
      } else {
        const segHeight = totalLength / count;
        pTop = wallBox.top + i * segHeight;
        pHeight = segHeight * 1.05;
        pWidth = wallThickness * (0.85 + (i % 3) * 0.15);
        pLeft = wallBox.left + (wallThickness - pWidth) / 2;
      }

      // Physics trajectories
      const vx = dir * (8 + distFromCenter * 5) + (i % 2 === 0 ? -3 : 3);
      const jumpY = -8 - (i % 3) * 4;
      const dropY = 22 + (i % 4) * 6 + Math.random() * 8;
      const rotDeg = dir * (45 + (i % 4) * 30);

      return {
        id: `chk-${i}`,
        left: pLeft,
        top: pTop,
        width: pWidth,
        height: pHeight,
        vx,
        jumpY,
        dropY,
        rotDeg,
        borderRadius: (i % 3) + 1,
      };
    });
  }, [isH, totalLength, wallThickness, wallBox]);

  // Generate 6 rubble sparks / dust dots
  const sparks = useMemo(() => {
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    return angles.map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const dist = 14 + (i % 3) * 8;
      return {
        id: `spk-${i}`,
        dx: Math.cos(rad) * dist,
        dy: Math.sin(rad) * dist,
        size: 3 + (i % 3),
      };
    });
  }, []);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });
  }, []);

  // Hammer swing & impact animation (0 -> 0.3)
  const hammerTranslateY = anim.interpolate({
    inputRange: [0, 0.15, 0.35, 1],
    outputRange: [-22, 0, -4, -4],
  });
  const hammerRotate = anim.interpolate({
    inputRange: [0, 0.15, 0.35, 1],
    outputRange: ['-35deg', '0deg', '-10deg', '-10deg'],
  });
  const hammerScale = anim.interpolate({
    inputRange: [0, 0.15, 0.35, 1],
    outputRange: [0.8, 1.4, 0.9, 0],
  });
  const hammerOpacity = anim.interpolate({
    inputRange: [0, 0.15, 0.35, 0.45, 1],
    outputRange: [1, 1, 0.9, 0, 0],
  });

  // Shockwave radial pulse
  const shockScale = anim.interpolate({
    inputRange: [0, 0.15, 0.6, 1],
    outputRange: [0.2, 1, 2.6, 2.6],
  });
  const shockOpacity = anim.interpolate({
    inputRange: [0, 0.12, 0.55, 1],
    outputRange: [0, 0.95, 0, 0],
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Expanding Shockwave Flash at Impact Center */}
      <Animated.View
        style={[
          styles.shockwave,
          {
            left: centerX - 20,
            top: centerY - 20,
            transform: [{ scale: shockScale }],
            opacity: shockOpacity,
          },
        ]}
      />

      {/* Hammer Strike Impact Icon */}
      <Animated.View
        style={[
          styles.hammerImpact,
          {
            left: centerX - 14,
            top: centerY - 16,
            transform: [
              { translateY: hammerTranslateY },
              { rotate: hammerRotate },
              { scale: hammerScale },
            ],
            opacity: hammerOpacity,
          },
        ]}
      >
        <Text style={styles.hammerEmoji}>🔨</Text>
      </Animated.View>

      {/* Bursting Rubble Sparks & Dust Dots */}
      {sparks.map(s => {
        const sparkX = anim.interpolate({
          inputRange: [0, 0.15, 0.7, 1],
          outputRange: [0, s.dx * 0.4, s.dx, s.dx * 1.1],
        });
        const sparkY = anim.interpolate({
          inputRange: [0, 0.15, 0.7, 1],
          outputRange: [0, s.dy * 0.4, s.dy + 8, s.dy + 14],
        });
        const sparkOpacity = anim.interpolate({
          inputRange: [0, 0.15, 0.6, 1],
          outputRange: [0, 1, 0.8, 0],
        });

        return (
          <Animated.View
            key={s.id}
            style={[
              styles.spark,
              {
                left: centerX - s.size / 2,
                top: centerY - s.size / 2,
                width: s.size,
                height: s.size,
                borderRadius: s.size / 2,
                backgroundColor: color,
                transform: [{ translateX: sparkX }, { translateY: sparkY }],
                opacity: sparkOpacity,
              },
            ]}
          />
        );
      })}

      {/* 8 Tumbling Fractured Stone Chunks */}
      {chunks.map(chk => {
        const transX = anim.interpolate({
          inputRange: [0, 0.18, 0.65, 1],
          outputRange: [0, chk.vx * 0.35, chk.vx * 0.85, chk.vx],
        });
        const transY = anim.interpolate({
          inputRange: [0, 0.18, 0.55, 1],
          outputRange: [0, chk.jumpY, chk.dropY * 0.65, chk.dropY],
        });
        const rot = anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${chk.rotDeg}deg`],
        });
        const chunkScale = anim.interpolate({
          inputRange: [0, 0.2, 0.7, 1],
          outputRange: [1, 1.12, 0.85, 0.35],
        });
        const chunkOpacity = anim.interpolate({
          inputRange: [0, 0.45, 0.9, 1],
          outputRange: [1, 0.95, 0.4, 0],
        });

        return (
          <Animated.View
            key={chk.id}
            style={[
              styles.chunk,
              {
                left: chk.left,
                top: chk.top,
                width: chk.width,
                height: chk.height,
                borderRadius: chk.borderRadius,
                backgroundColor: color,
                transform: [
                  { translateX: transX },
                  { translateY: transY },
                  { rotate: rot },
                  { scale: chunkScale },
                ],
                opacity: chunkOpacity,
              },
            ]}
          >
            {/* Crack edge highlight */}
            <View style={styles.chunkInner} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shockwave: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    zIndex: 40,
  },
  hammerImpact: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 45,
  },
  hammerEmoji: {
    fontSize: 26,
    textShadowColor: '#F59E0B',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  spark: {
    position: 'absolute',
    zIndex: 38,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
    elevation: 4,
  },
  chunk: {
    position: 'absolute',
    zIndex: 35,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
    overflow: 'hidden',
  },
  chunkInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
