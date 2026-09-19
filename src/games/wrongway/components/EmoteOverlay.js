/**
 * Wrong Way: Don't be mad - Animated Emote Overlay & Picker
 * Enables players to express reactions (laughing, crying, angry, confused, robot dance)
 * with animated floating bubbles.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { FONTS } from '../../../constants/theme';
import { EMOTES, THEME } from '../constants/wrongWayConstants';

export default function EmoteOverlay({
  visible,
  onClose,
  onSelectEmote,
  activeFloatingEmote = null, // { emoji, sender }
  darkMode = true,
}) {
  const theme = darkMode ? THEME.dark : THEME.light;

  return (
    <>
      {/* Floating Display for Active Emote */}
      {activeFloatingEmote && (
        <View style={styles.floatingContainer} pointerEvents="none">
          <View style={[styles.floatingBubble, { backgroundColor: theme.card, borderColor: theme.accent }]}>
            <Text style={styles.floatingEmoji}>{activeFloatingEmote.emoji}</Text>
            {activeFloatingEmote.sender && (
              <Text style={[styles.floatingSender, { color: theme.subtle }]}>
                {activeFloatingEmote.sender}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Emote Picker Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={[
              styles.pickerCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.pickerTitle, { color: theme.text }]}>
              Send Emote
            </Text>

            <View style={styles.emoteGrid}>
              {EMOTES.map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.emoteItem,
                    { backgroundColor: theme.cellHover, borderColor: theme.cardBorder },
                  ]}
                  onPress={() => {
                    onSelectEmote(e);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoteEmoji}>{e.emoji}</Text>
                  <Text style={[styles.emoteLabel, { color: theme.subtle }]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    zIndex: 999,
  },
  floatingBubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingEmoji: {
    fontSize: 48,
  },
  floatingSender: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 320,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  pickerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginBottom: 16,
  },
  emoteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  emoteItem: {
    width: 84,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emoteEmoji: {
    fontSize: 26,
  },
  emoteLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
});
