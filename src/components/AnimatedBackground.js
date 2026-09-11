import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ─── Orb configuration ──────────────────────────────────────────
// Each orb: color, size, starting position, animation durations, opacity
const ORB_CONFIG = [
  // Large coral primary orb — top-left sweep
  {
    color: '#FF6B6B',
    size: width * 0.85,
    startX: -width * 0.3,
    startY: -height * 0.1,
    toX: width * 0.1,
    toY: height * 0.15,
    durationX: 9000,
    durationY: 11000,
    opacity: 0.55,
  },
  // Medium orange — bottom-right sweep
  {
    color: '#FF8E53',
    size: width * 0.7,
    startX: width * 0.5,
    startY: height * 0.55,
    toX: width * 0.2,
    toY: height * 0.7,
    durationX: 11000,
    durationY: 8000,
    opacity: 0.45,
  },
  // Small deep violet accent — center float
  {
    color: '#C45AFF',
    size: width * 0.5,
    startX: width * 0.15,
    startY: height * 0.3,
    toX: width * 0.5,
    toY: height * 0.4,
    durationX: 13000,
    durationY: 15000,
    opacity: 0.35,
  },
  // Tiny bright cyan — top-right sparkle
  {
    color: '#4E65FF',
    size: width * 0.4,
    startX: width * 0.6,
    startY: -height * 0.05,
    toX: width * 0.4,
    toY: height * 0.1,
    durationX: 7000,
    durationY: 9500,
    opacity: 0.3,
  },
  // Very large soft peach — anchored bottom fade
  {
    color: '#FFB347',
    size: width * 1.1,
    startX: -width * 0.2,
    startY: height * 0.6,
    toX: width * 0.15,
    toY: height * 0.55,
    durationX: 16000,
    durationY: 12000,
    opacity: 0.25,
  },
];

// ─── Single animated orb ────────────────────────────────────────
const AnimatedOrb = ({ config }) => {
  const x = useSharedValue(config.startX);
  const y = useSharedValue(config.startY);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Floating X
    x.value = withRepeat(
      withSequence(
        withTiming(config.toX, { duration: config.durationX, easing: Easing.inOut(Easing.sin) }),
        withTiming(config.startX, { duration: config.durationX, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // Floating Y
    y.value = withRepeat(
      withSequence(
        withTiming(config.toY, { duration: config.durationY, easing: Easing.inOut(Easing.sin) }),
        withTiming(config.startY, { duration: config.durationY, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // Gentle breathe scale
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: config.durationX * 0.6, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: config.durationX * 0.6, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  const half = config.size / 2;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: config.size,
          height: config.size,
          borderRadius: half,
          backgroundColor: config.color,
          opacity: config.opacity,
        },
        animStyle,
      ]}
    />
  );
};

// ─── Rotating particle ring ─────────────────────────────────────
const PARTICLES = Array.from({ length: 8 }, (_, i) => i);

const ParticleRing = () => {
  const rotation = useSharedValue(0);
  const rotation2 = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 28000, easing: Easing.linear }),
      -1,
      false
    );
    rotation2.value = withRepeat(
      withTiming(-360, { duration: 18000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const ringStyle1 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const ringStyle2 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation2.value}deg` }],
  }));

  const cx = width / 2;
  const cy = height * 0.35;
  const r1 = width * 0.42;
  const r2 = width * 0.3;

  return (
    <>
      {/* Outer rotating ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: r1 * 2,
            height: r1 * 2,
            borderRadius: r1,
            left: cx - r1,
            top: cy - r1,
          },
          ringStyle1,
        ]}
      >
        {PARTICLES.map((i) => {
          const angle = (i / PARTICLES.length) * 2 * Math.PI;
          const px = r1 + Math.cos(angle) * r1 - 5;
          const py = r1 + Math.sin(angle) * r1 - 5;
          const pSize = i % 3 === 0 ? 10 : i % 2 === 0 ? 6 : 4;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: px,
                top: py,
                width: pSize,
                height: pSize,
                borderRadius: pSize / 2,
                backgroundColor: i % 2 === 0 ? '#FF6B6B' : '#FF8E53',
                opacity: 0.5,
              }}
            />
          );
        })}
      </Animated.View>

      {/* Inner counter-rotating ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: r2 * 2,
            height: r2 * 2,
            borderRadius: r2,
            left: cx - r2,
            top: cy - r2,
          },
          ringStyle2,
        ]}
      >
        {PARTICLES.map((i) => {
          const angle = (i / PARTICLES.length) * 2 * Math.PI;
          const px = r2 + Math.cos(angle) * r2 - 3;
          const py = r2 + Math.sin(angle) * r2 - 3;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: px,
                top: py,
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: '#C45AFF',
                opacity: 0.4,
              }}
            />
          );
        })}
      </Animated.View>
    </>
  );
};

// ─── Shimmer wave overlay ───────────────────────────────────────
const ShimmerWave = () => {
  const shimmerY = useSharedValue(-height * 0.5);

  useEffect(() => {
    shimmerY.value = withRepeat(
      withTiming(height * 1.2, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shimmerY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: width * 1.5,
          height: height * 0.25,
          left: -width * 0.25,
          backgroundColor: 'rgba(255,255,255,0.04)',
          transform: [{ skewY: '-20deg' }],
        },
        shimmerStyle,
      ]}
    />
  );
};

// ─── Main Component ─────────────────────────────────────────────
export default function AnimatedBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Warm off-white base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FEF0ED' }]} />

      {/* Render all orbs */}
      {ORB_CONFIG.map((cfg, i) => (
        <AnimatedOrb key={i} config={cfg} />
      ))}

      {/* Particle rings */}
      <ParticleRing />

      {/* Shimmer sweep */}
      <ShimmerWave />

      {/* Frosted glass blur — the magic ingredient that blends everything */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(255,250,248,0.52)' },
        ]}
      />
    </View>
  );
}
