/**
 * Wrong Way: Don't be mad - Sound & Haptic Service
 * Triggers audio and haptic feedback for game events with fail-safe fallbacks.
 */

import { Vibration, Platform } from 'react-native';

class AudioService {
  constructor() {
    this.soundEnabled = true;
    this.hapticEnabled = true;
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  setHapticEnabled(enabled) {
    this.hapticEnabled = enabled;
  }

  /**
   * Play haptic feedback for tactile satisfaction.
   */
  haptic(type = 'light') {
    if (!this.hapticEnabled) return;
    try {
      if (Platform.OS === 'android') {
        switch (type) {
          case 'heavy':
            Vibration.vibrate([0, 45, 30, 45]);
            break;
          case 'medium':
            Vibration.vibrate(25);
            break;
          case 'success':
            Vibration.vibrate([0, 30, 40, 60]);
            break;
          case 'error':
            Vibration.vibrate([0, 50, 40, 50]);
            break;
          case 'light':
          default:
            Vibration.vibrate(12);
            break;
        }
      } else {
        // iOS vibration fallback
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Play procedural / synth game sounds.
   */
  play(soundName) {
    if (!this.soundEnabled) return;
    switch (soundName) {
      case 'move':
        this.haptic('light');
        break;
      case 'wall':
        this.haptic('medium');
        break;
      case 'pickup':
        this.haptic('success');
        break;
      case 'break':
        this.haptic('heavy');
        break;
      case 'win':
        this.haptic('success');
        break;
      case 'lose':
        this.haptic('error');
        break;
      case 'click':
      default:
        this.haptic('light');
        break;
    }
  }
}

export const audio = new AudioService();
export default audio;
