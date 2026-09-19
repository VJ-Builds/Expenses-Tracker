/**
 * Wrong Way: Don't be mad - Interactive Tutorial & Rules Modal
 * 5-step visual guide explaining objective, movement, jumping, barricades, and the cardinal rule.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { FONTS } from '../../../constants/theme';
import { THEME } from '../constants/wrongWayConstants';

const TUTORIAL_STEPS = [
  {
    icon: '🎯',
    title: 'The Goal',
    subtitle: 'Race across the board',
    desc: 'Be the first player to guide your stone to the green goal row on the opposite side of the board to win!',
  },
  {
    icon: '🚶',
    title: 'Moving Your Stone',
    subtitle: 'Orthogonal steps',
    desc: 'On your turn, tap an adjacent cell (Up, Down, Left, or Right) to move your piece 1 step forward through the maze.',
  },
  {
    icon: '🦘',
    title: 'The Jump Rule',
    subtitle: 'Leap over your opponent',
    desc: 'When facing your opponent directly with no wall between, you can jump straight over them! If the square behind them is blocked by a wall or boundary, jump diagonally to either side.',
  },
  {
    icon: '🧱',
    title: 'Placing Barricades',
    subtitle: 'Block & divert',
    desc: 'Instead of moving, you can place a 2-cell barricade (Horizontal or Vertical) to slow down your opponent or protect your path.',
  },
  {
    icon: '🛡️',
    title: 'The Golden Rule',
    subtitle: 'Never completely trap',
    desc: 'You can never completely seal off any player from their goal. At least one open route must ALWAYS remain available!',
  },
];

export default function TutorialModal({
  visible,
  onClose,
  darkMode = true,
}) {
  const theme = darkMode ? THEME.dark : THEME.light;
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      setCurrentStep(0);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          {/* Progress Indicator */}
          <View style={styles.dotsRow}>
            {TUTORIAL_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === currentStep ? theme.accent : theme.cellHover,
                    width: i === currentStep ? 20 : 6,
                  },
                ]}
              />
            ))}
          </View>

          {/* Large Illustrated Icon */}
          <View style={[styles.iconCircle, { backgroundColor: theme.cellHover }]}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>
          <Text style={[styles.subtitle, { color: theme.accent }]}>{step.subtitle}</Text>
          <Text style={[styles.desc, { color: theme.textMuted }]}>{step.desc}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={[styles.backBtn, { borderColor: theme.cardBorder }]}
                onPress={handleBack}
              >
                <Text style={[styles.backBtnText, { color: theme.subtle }]}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: theme.accent }]}
              onPress={handleNext}
            >
              <Text style={styles.nextBtnText}>
                {isLast ? "Let's Play! 🚀" : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip link */}
          <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
            <Text style={[styles.skipText, { color: theme.subtle }]}>Skip Tutorial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepIcon: {
    fontSize: 34,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  desc: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  backBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFF',
  },
  skipBtn: {
    marginTop: 14,
    padding: 4,
  },
  skipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
});
