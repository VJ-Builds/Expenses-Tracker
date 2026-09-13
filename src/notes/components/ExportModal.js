import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FileText, Image as ImageIcon, File, X, Download, CheckSquare, ArrowLeft, Layers } from 'lucide-react-native';
import { FONTS } from '../../constants/theme';
import { exportNoteAsPdf, exportNoteAsTxt, exportNoteAsImage } from '../utils/noteExportHelpers';

export default function ExportModal({
  visible,
  onClose,
  note,
  cardViewRef,
  offScreenCombinedRef,
  offScreenTextRef,
  offScreenChecklistRef,
}) {
  const [loadingType, setLoadingType] = useState(null);
  const [imageSubMenu, setImageSubMenu] = useState(false);

  useEffect(() => {
    if (!visible) {
      setImageSubMenu(false);
    }
  }, [visible]);

  const hasText = !!(note?.content && note.content.trim());
  const hasChecklist = Array.isArray(note?.checklist_data) && note.checklist_data.length > 0;
  const hasBoth = hasText && hasChecklist;

  const handleExport = (type) => {
    if (loadingType) return;

    if (type === 'image' && hasBoth) {
      setImageSubMenu(true);
      return;
    }

    if (type === 'image') {
      const targetRef = hasChecklist && !hasText ? (offScreenChecklistRef || cardViewRef) : (offScreenTextRef || cardViewRef);
      executeImageExport(targetRef);
      return;
    }

    setLoadingType(type);
    onClose();
    setTimeout(async () => {
      try {
        if (type === 'pdf') {
          await exportNoteAsPdf(note);
        } else if (type === 'txt') {
          await exportNoteAsTxt(note);
        }
      } catch (err) {
        console.error('Export error:', err);
      } finally {
        setLoadingType(null);
      }
    }, 350);
  };

  const executeImageExport = (targetRef) => {
    setLoadingType('image');
    setImageSubMenu(false);
    onClose();
    setTimeout(async () => {
      try {
        await exportNoteAsImage(targetRef || cardViewRef, note?.title);
      } catch (err) {
        console.error('Export error:', err);
      } finally {
        setLoadingType(null);
      }
    }, 350);
  };

  const handleExportImageChoice = (choice) => {
    if (choice === 'combined') {
      executeImageExport(offScreenCombinedRef || cardViewRef);
    } else if (choice === 'checklist') {
      executeImageExport(offScreenChecklistRef || cardViewRef);
    } else {
      executeImageExport(offScreenTextRef || cardViewRef);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.glassContainer}>
          {imageSubMenu ? (
            /* Sub-Menu: Choose Image Content (Merged Option A + C) */
            <>
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => setImageSubMenu(false)}
                  style={styles.backBtn}
                  activeOpacity={0.7}
                >
                  <ArrowLeft stroke="#0F172A" size={20} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.title}>Export Image Options</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X stroke="#94A3B8" size={20} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                This note has both text and checklist items. Which image would you like to save?
              </Text>

              {/* Choice 1: Text Note Only */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExportImageChoice('text')}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#3B82F618' }]}>
                  <FileText stroke="#2563EB" size={22} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Text Note Only</Text>
                  <Text style={styles.optionDesc}>Clean high-res image of just your text note</Text>
                </View>
              </TouchableOpacity>

              {/* Choice 2: Checklist Only */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExportImageChoice('checklist')}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#10B98118' }]}>
                  <CheckSquare stroke="#10B981" size={22} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Checklist Only</Text>
                  <Text style={styles.optionDesc}>Clean high-res image of just your checklist items</Text>
                </View>
              </TouchableOpacity>

              {/* Choice 3: Combined (Option A) */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExportImageChoice('combined')}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#8B5CF618' }]}>
                  <Layers stroke="#8B5CF6" size={22} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Both (Combined Card)</Text>
                  <Text style={styles.optionDesc}>Structured card with text note & checklist together</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setImageSubMenu(false)}>
                <Text style={styles.cancelText}>Back to Formats</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Main Formats Menu: PDF, TXT, Image */
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                  <View style={styles.iconCircle}>
                    <Download stroke="#3B82F6" size={20} />
                  </View>
                  <Text style={styles.title}>Download Note</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X stroke="#94A3B8" size={20} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                Choose a format to download directly into your device storage. 100% free and offline.
              </Text>

              {/* Option 1: PDF */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExport('pdf')}
                activeOpacity={0.8}
                disabled={loadingType !== null}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#EF444418' }]}>
                  {loadingType === 'pdf' ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <FileText stroke="#EF4444" size={24} />
                  )}
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Download PDF Document</Text>
                  <Text style={styles.optionDesc}>Print-ready formatted document saved directly to Downloads</Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: TXT */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExport('txt')}
                activeOpacity={0.8}
                disabled={loadingType !== null}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#3B82F618' }]}>
                  {loadingType === 'txt' ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <File stroke="#3B82F6" size={24} />
                  )}
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Download Text (.txt)</Text>
                  <Text style={styles.optionDesc}>Clean plain text file saved directly to Downloads</Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Image (PNG) */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExport('image')}
                activeOpacity={0.8}
                disabled={loadingType !== null}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#10B98118' }]}>
                  {loadingType === 'image' ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <ImageIcon stroke="#10B981" size={24} />
                  )}
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Download Image (PNG)</Text>
                  <Text style={styles.optionDesc}>High-resolution card snapshot saved directly to Downloads</Text>
                </View>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 18, 0.65)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  glassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#3B82F618',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#111827',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 18,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 14,
  },
  optionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 3,
  },
  optionDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  cancelBtn: {
    marginTop: 6,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#475569',
  },
});
