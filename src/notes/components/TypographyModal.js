import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { X, Check, Type, RotateCcw } from 'lucide-react-native';
import {
  FONT_OPTIONS,
  DEFAULT_FONT_FAMILY,
  getNoteFontFamily,
} from '../constants/typography';

export default function TypographyModal({
  visible,
  onClose,
  fontFamily = DEFAULT_FONT_FAMILY,
  onChangeFontFamily,
}) {
  const currentFont = fontFamily || DEFAULT_FONT_FAMILY;

  const handleReset = () => {
    onChangeFontFamily(DEFAULT_FONT_FAMILY);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Top Drag Indicator */}
              <View style={styles.dragIndicator} />

              {/* Modal Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconWrap}>
                    <Type stroke="#2563EB" size={20} strokeWidth={2.4} />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Choose Font Style</Text>
                    <Text style={styles.headerSubtitle}>7 curated, 100% free fonts</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <X stroke="#64748B" size={20} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* ── Live Preview Card ── */}
                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewLabel}>LIVE PREVIEW</Text>
                    <TouchableOpacity
                      style={styles.resetBtn}
                      onPress={handleReset}
                      activeOpacity={0.7}
                    >
                      <RotateCcw stroke="#64748B" size={13} strokeWidth={2} />
                      <Text style={styles.resetBtnText}>Reset to Poppins</Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={[
                      styles.previewTitle,
                      {
                        fontFamily: getNoteFontFamily(currentFont, true),
                        fontSize: 22,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Note Heading Preview
                  </Text>

                  <Text
                    style={[
                      styles.previewBody,
                      {
                        fontFamily: getNoteFontFamily(currentFont, false),
                        fontSize: 15,
                      },
                    ]}
                  >
                    The quick brown fox jumps over the lazy dog. 12345
                  </Text>
                </View>

                {/* ── Font Options List ── */}
                <View style={styles.fontList}>
                  {FONT_OPTIONS.map((item) => {
                    const isSelected = item.id === currentFont;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.fontCard, isSelected && styles.fontCardActive]}
                        onPress={() => onChangeFontFamily(item.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.fontCardLeft}>
                          <View style={styles.fontCardHeader}>
                            <Text
                              style={[
                                styles.fontNameText,
                                { fontFamily: item.boldFont },
                                isSelected && styles.fontNameTextActive,
                              ]}
                            >
                              {item.label}
                            </Text>
                            <View style={[styles.categoryBadge, isSelected && styles.categoryBadgeActive]}>
                              <Text style={[styles.categoryBadgeText, isSelected && styles.categoryBadgeTextActive]}>
                                {item.category}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.fontPreviewSample,
                              { fontFamily: item.regularFont },
                            ]}
                            numberOfLines={1}
                          >
                            {item.previewText}
                          </Text>
                        </View>

                        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                          {isSelected && <Check stroke="#FFF" size={14} strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Bottom Apply & Close Button */}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <Text style={styles.doneBtnText}>Apply & Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 16 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  dragIndicator: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#64748B',
    marginTop: -2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  /* Preview Card */
  previewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resetBtnText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#64748B',
  },
  previewTitle: {
    color: '#0F172A',
    marginBottom: 4,
  },
  previewBody: {
    color: '#334155',
    lineHeight: 22,
  },

  /* Font Cards */
  fontList: {
    gap: 10,
  },
  fontCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  fontCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  fontCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  fontCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fontNameText: {
    fontSize: 17,
    color: '#0F172A',
  },
  fontNameTextActive: {
    color: '#1D4ED8',
  },
  categoryBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeActive: {
    backgroundColor: '#DBEAFE',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: '#64748B',
  },
  categoryBadgeTextActive: {
    color: '#2563EB',
  },
  fontPreviewSample: {
    fontSize: 13,
    color: '#64748B',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  /* Bottom Bar */
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  doneBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
});
