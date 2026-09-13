import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import {
  ArrowLeft,
  Download,
  Pin,
  Palette,
  Folder,
  CheckSquare,
  FileText,
  Trash2,
  MoreVertical,
  Plus,
  X,
  Tag,
  DollarSign,
  Check,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { FONTS } from '../../constants/theme';
import {
  getNoteById,
  createNote,
  updateNote,
  softDeleteNote,
  getFolders,
  getCustomFolders,
  saveCustomFolder,
} from '../db/noteQueries';
import { syncUp } from '../../utils/syncManager';
import ExportModal from '../components/ExportModal';

const COLOR_PALETTES = [
  { hex: '#161622', name: 'Default Dark' },
  { hex: '#FFFFFF', name: 'Clean White' },
  { hex: '#EFF6FF', name: 'Ocean Blue' },
  { hex: '#F0FDF4', name: 'Emerald Green' },
  { hex: '#FEF3C7', name: 'Sun Yellow' },
  { hex: '#F3E8FF', name: 'Lavender Purple' },
  { hex: '#FFF1F2', name: 'Rose Pink' },
  { hex: '#F8FAFC', name: 'Cool Slate' },
];

export default function NoteEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const noteIdParam = route.params?.noteId || null;
  const initialType = route.params?.initialType || 'text';
  const initialFolder = route.params?.initialFolder || 'General';

  const cardViewRef = useRef(null);
  const checkInputRef = useRef(null);
  const offScreenCombinedRef = useRef(null);
  const offScreenTextRef = useRef(null);
  const offScreenChecklistRef = useRef(null);

  const initialNote = useRef(noteIdParam ? getNoteById(noteIdParam) : null).current;

  // Note state
  const [noteId, setNoteId] = useState(noteIdParam);
  const [title, setTitle] = useState(initialNote?.title || '');
  const [noteType, setNoteType] = useState(initialNote?.type || initialType);
  const [folder, setFolder] = useState(initialNote?.folder || initialFolder);
  const [tags, setTags] = useState(Array.isArray(initialNote?.tags) ? initialNote.tags : []);
  const [color, setColor] = useState(initialNote?.color || '#FFFFFF');
  const [isPinned, setIsPinned] = useState(Boolean(initialNote?.is_pinned));
  const [checklistData, setChecklistData] = useState(
    Array.isArray(initialNote?.checklist_data) ? initialNote.checklist_data : []
  );
  const [newItemText, setNewItemText] = useState('');

  // Uncontrolled high-performance ref for content: eliminates React bridge re-renders and setText() calls!
  const contentRef = useRef(initialNote?.content || '');
  const [lastSavedText, setLastSavedText] = useState(initialNote ? 'Saved' : 'New Note');

  // UI Modals
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [foldersList, setFoldersList] = useState([]);
  const [newEditorFolderInput, setNewEditorFolderInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [tagModalVisible, setTagModalVisible] = useState(false);

  // Load custom folders
  useEffect(() => {
    if (user?.id) {
      getCustomFolders(user.id).then(() => {
        const allFolders = getFolders(user.id);
        setFoldersList(allFolders);
      });
    }
  }, [user]);

  // Realtime Cloud Sync Debounce
  const syncTimerRef = useRef(null);
  const localSaveTimerRef = useRef(null);

  const stateRef = useRef({
    noteId,
    title,
    content: contentRef.current,
    noteType,
    folder,
    color,
    isPinned,
    checklistData,
    tags,
  });

  useEffect(() => {
    stateRef.current = {
      noteId,
      title,
      content: contentRef.current,
      noteType,
      folder,
      color,
      isPinned,
      checklistData,
      tags,
    };
  }, [noteId, title, noteType, folder, color, isPinned, checklistData, tags]);

  const scheduleRealtimeSync = useCallback(() => {
    if (!user) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncUp(user).catch(err => console.log('[Sync] Realtime note sync error:', err));
    }, 1000);
  }, [user]);

  // Immediate synchronous save to SQLite
  const performSave = useCallback((overrides = {}) => {
    if (!user?.id) return;
    if (localSaveTimerRef.current) {
      clearTimeout(localSaveTimerRef.current);
      localSaveTimerRef.current = null;
    }

    const s = {
      ...stateRef.current,
      content: contentRef.current,
      ...overrides,
    };

    // Avoid saving completely blank new note
    if (!s.noteId && !s.title.trim() && !s.content.trim() && (!s.checklistData || s.checklistData.length === 0)) {
      return;
    }

    if (!s.noteId) {
      // Create
      const created = createNote({
        userId: user.id,
        title: s.title,
        content: s.content,
        type: s.noteType,
        folder: s.folder,
        color: s.color,
        isPinned: s.isPinned,
        checklistData: s.checklistData,
        tags: s.tags,
      });
      if (created) {
        setNoteId(created.id);
        stateRef.current.noteId = created.id;
        setLastSavedText('Saved just now');
      }
    } else {
      // Update
      updateNote(s.noteId, {
        title: s.title,
        content: s.content,
        type: s.noteType,
        folder: s.folder,
        color: s.color,
        isPinned: s.isPinned,
        checklistData: s.checklistData,
        tags: s.tags,
      });
      setLastSavedText('Saved just now');
    }
    scheduleRealtimeSync();
  }, [user, scheduleRealtimeSync]);

  // Debounced save for high-frequency keystrokes and large paste operations (400ms)
  const debouncedSaveNote = useCallback((overrides = {}) => {
    stateRef.current = {
      ...stateRef.current,
      content: contentRef.current,
      ...overrides,
    };
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => {
      performSave();
    }, 400);
  }, [performSave]);

  const saveNote = performSave;

  useEffect(() => {
    return () => {
      if (localSaveTimerRef.current) {
        clearTimeout(localSaveTimerRef.current);
        performSave();
      }
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (user) syncUp(user).catch(() => {});
    };
  }, [user, performSave]);

  const handleTitleChange = (text) => {
    setTitle(text);
    debouncedSaveNote({ title: text });
  };

  const handleContentChange = (text) => {
    contentRef.current = text;
    debouncedSaveNote({ content: text });
  };

  const handleTogglePin = () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    performSave({ isPinned: nextPin });
  };

  const handleSelectColor = (selectedColor) => {
    setColor(selectedColor);
    setColorModalVisible(false);
    saveNote({ color: selectedColor });
  };

  const handleSelectFolder = (selectedFolder) => {
    setFolder(selectedFolder);
    setFolderModalVisible(false);
    saveNote({ folder: selectedFolder });
  };

  const handleAddNewFolder = async () => {
    const trimmed = newEditorFolderInput.trim();
    if (!trimmed) return;
    await saveCustomFolder(user?.id, trimmed);
    const updated = getFolders(user?.id);
    setFoldersList(updated);
    setFolder(trimmed);
    setFolderModalVisible(false);
    setNewEditorFolderInput('');
    saveNote({ folder: trimmed });
    if (user) syncUp(user).catch(() => {});
  };

  // Checklist Actions
  const handleAddChecklistItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    const newItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      text: trimmed,
      completed: false,
    };
    const updated = [...checklistData, newItem];
    setChecklistData(updated);
    setNewItemText('');
    saveNote({ checklistData: updated });
    // Keep focus so keyboard never collapses
    setTimeout(() => {
      checkInputRef.current?.focus();
    }, 40);
  };

  const handleToggleCheckItem = (id) => {
    const updated = checklistData.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklistData(updated);
    saveNote({ checklistData: updated });
  };

  const handleDeleteCheckItem = (id) => {
    const updated = checklistData.filter((item) => item.id !== id);
    setChecklistData(updated);
    saveNote({ checklistData: updated });
  };

  // Tag Actions
  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      const updated = [...tags, trimmed];
      setTags(updated);
      saveNote({ tags: updated });
    }
    setNewTagInput('');
    setTagModalVisible(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    saveNote({ tags: updated });
  };

  const handleDeleteNote = () => {
    Alert.alert(
      'Move to Trash',
      'This note will be moved to the Trash bin. You can restore it or permanently delete it from the Trash bin anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: () => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            if (noteId) {
              softDeleteNote(noteId);
              if (user) syncUp(user).catch(() => {});
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const currentNoteObject = {
    id: noteId,
    title,
    content: contentRef.current,
    type: noteType,
    folder,
    color,
    tags,
    checklist_data: checklistData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: color === '#FFFFFF' ? '#F3F6FB' : color + '15' }]}>
      <StatusBar barStyle="dark-content" />

      {/* Floating Glass Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            saveNote();
            if (user) syncUp(user).catch(() => {});
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft stroke="#0F172A" size={22} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Folder Selector Pill */}
        <TouchableOpacity
          style={styles.folderSelector}
          onPress={() => setFolderModalVisible(true)}
          activeOpacity={0.8}
        >
          <Folder stroke="#2563EB" size={14} />
          <Text style={styles.folderSelectorText}>{folder}</Text>
        </TouchableOpacity>

        {/* Right Actions: Color, Pin, Export, Delete */}
        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setColorModalVisible(true)}
            activeOpacity={0.7}
          >
            <Palette stroke="#475569" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isPinned && styles.actionBtnActive]}
            onPress={handleTogglePin}
            activeOpacity={0.7}
          >
            <Pin stroke={isPinned ? '#FF6B6B' : '#475569'} size={20} fill={isPinned ? '#FF6B6B' : 'transparent'} />
          </TouchableOpacity>

          {/* Download / Export Button (100% Free) */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.exportBtn]}
            onPress={() => setExportModalVisible(true)}
            activeOpacity={0.7}
          >
            <Download stroke="#2563EB" size={20} strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDeleteNote}
            activeOpacity={0.7}
          >
            <Trash2 stroke="#EF4444" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Note Type Switcher Pill (outside cardViewRef so it is NOT included in PNG image export) */}
          <View style={styles.typeSwitcher}>
            <TouchableOpacity
              style={[styles.typeBtn, noteType === 'text' && styles.typeBtnActive]}
              onPress={() => {
                setNoteType('text');
                saveNote({ type: 'text' });
              }}
              activeOpacity={0.8}
            >
              <FileText stroke={noteType === 'text' ? '#2563EB' : '#94A3B8'} size={15} />
              <Text style={[styles.typeBtnText, noteType === 'text' && styles.typeBtnTextActive]}>
                Text Note
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, noteType === 'checklist' && styles.typeBtnActive]}
              onPress={() => {
                setNoteType('checklist');
                saveNote({ type: 'checklist' });
              }}
              activeOpacity={0.8}
            >
              <CheckSquare stroke={noteType === 'checklist' ? '#2563EB' : '#94A3B8'} size={15} />
              <Text style={[styles.typeBtnText, noteType === 'checklist' && styles.typeBtnTextActive]}>
                Checklist
              </Text>
            </TouchableOpacity>
          </View>

          {/* Note View Container (Captured for Image Export) */}
          <View ref={cardViewRef} style={[styles.canvasCard, { backgroundColor: color }]}>
            {/* Note Title Input */}
            <TextInput
              style={styles.titleInput}
              placeholder="Title..."
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={handleTitleChange}
              multiline={false}
              returnKeyType="next"
            />

            {/* Editor Body: Text vs Checklist */}
            {noteType === 'text' ? (
              <TextInput
                key={`editor-body-${noteIdParam || 'new'}-${noteType}`}
                style={styles.bodyInput}
                placeholder="Start typing your thoughts, notes, ideas..."
                placeholderTextColor="#94A3B8"
                defaultValue={contentRef.current}
                onChangeText={handleContentChange}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
              />
            ) : (
              <View style={styles.checklistSection}>
                {/* Add Checklist Item Input */}
                <View style={styles.addCheckItemRow}>
                  <TextInput
                    ref={checkInputRef}
                    style={styles.addCheckInput}
                    placeholder="Add checklist item..."
                    placeholderTextColor="#94A3B8"
                    value={newItemText}
                    onChangeText={setNewItemText}
                    onSubmitEditing={handleAddChecklistItem}
                    blurOnSubmit={false}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.addCheckBtn}
                    onPress={handleAddChecklistItem}
                    activeOpacity={0.8}
                  >
                    <Plus stroke="#FFFFFF" size={18} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                {/* Checklist Items List */}
                <View style={styles.checklistItemsList}>
                  {checklistData.map((item) => (
                    <View key={item.id} style={styles.checkItemRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, item.completed && styles.checkboxChecked]}
                        onPress={() => handleToggleCheckItem(item.id)}
                        activeOpacity={0.7}
                      >
                        {item.completed && <Check stroke="#FFFFFF" size={13} strokeWidth={3} />}
                      </TouchableOpacity>

                      <TextInput
                        style={[styles.checkItemInput, item.completed && styles.checkItemInputDone]}
                        value={item.text}
                        onChangeText={(txt) => {
                          const updated = checklistData.map((i) =>
                            i.id === item.id ? { ...i, text: txt } : i
                          );
                          setChecklistData(updated);
                          saveNote({ checklistData: updated });
                        }}
                      />

                      <TouchableOpacity
                        style={styles.deleteItemBtn}
                        onPress={() => handleDeleteCheckItem(item.id)}
                        activeOpacity={0.7}
                      >
                        <X stroke="#94A3B8" size={16} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tags Section */}
            <View style={styles.tagsRow}>
              {tags.map((t, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{t}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(t)}>
                    <X stroke="#64748B" size={12} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addTagBtn}
                onPress={() => setTagModalVisible(true)}
                activeOpacity={0.8}
              >
                <Tag stroke="#2563EB" size={13} />
                <Text style={styles.addTagText}>Add Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Export Modal (PDF, TXT, Image) */}
      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        note={currentNoteObject}
        cardViewRef={cardViewRef}
        offScreenCombinedRef={offScreenCombinedRef}
        offScreenTextRef={offScreenTextRef}
        offScreenChecklistRef={offScreenChecklistRef}
      />

      {/* Color Palette Modal */}
      <Modal visible={colorModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Note Color</Text>
            <View style={styles.paletteGrid}>
              {COLOR_PALETTES.map((p) => (
                <TouchableOpacity
                  key={p.hex}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: p.hex },
                    color === p.hex && styles.colorCircleActive,
                  ]}
                  onPress={() => handleSelectColor(p.hex)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalBtnClose}
              onPress={() => setColorModalVisible(false)}
            >
              <Text style={styles.modalBtnTextCancel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Folder Picker Modal */}
      <Modal visible={folderModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Folder</Text>

            {/* Quick Add New Folder */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                placeholder="+ Create new folder"
                placeholderTextColor="#94A3B8"
                value={newEditorFolderInput}
                onChangeText={setNewEditorFolderInput}
              />
              <TouchableOpacity
                style={[styles.modalBtnConfirm, { paddingHorizontal: 16 }]}
                onPress={handleAddNewFolder}
              >
                <Text style={styles.modalBtnTextConfirm}>Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 220 }}>
              {foldersList.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.folderOption, folder === f && styles.folderOptionActive]}
                  onPress={() => handleSelectFolder(f)}
                >
                  <Folder stroke={folder === f ? '#2563EB' : '#64748B'} size={18} />
                  <Text style={[styles.folderOptionText, folder === f && styles.folderOptionTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalBtnClose}
              onPress={() => setFolderModalVisible(false)}
            >
              <Text style={styles.modalBtnTextCancel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tag Input Modal */}
      <Modal visible={tagModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Tag</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tag name (e.g. travel, urgent, ideas)"
              placeholderTextColor="#94A3B8"
              value={newTagInput}
              onChangeText={setNewTagInput}
              autoFocus
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setTagModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleAddTag}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnTextConfirm}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Off-screen dedicated export templates for high-res PNG downloads (Merged Option A + C) */}
      <View style={{ position: 'absolute', left: -9999, top: 0, opacity: 0 }} pointerEvents="none">
        {/* 1. Combined Template */}
        <View
          ref={offScreenCombinedRef}
          collapsable={false}
          style={[styles.offScreenExportCard, { backgroundColor: color || '#FFFFFF' }]}
        >
          <View style={styles.exportHeader}>
            <View style={styles.exportFolderBadge}>
              <Text style={styles.exportFolderText}>{folder || 'General'}</Text>
            </View>
            <Text style={styles.exportDateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <Text style={styles.exportTitleText}>{title || 'Untitled Note'}</Text>

          {!!(contentRef.current && contentRef.current.trim()) && (
            <View style={styles.exportSection}>
              {checklistData.length > 0 && (
                <View style={styles.exportSectionDivider}>
                  <FileText stroke="#2563EB" size={13} />
                  <Text style={styles.exportSectionTitle}>Notes</Text>
                </View>
              )}
              <Text style={styles.exportBodyText}>{contentRef.current.trim()}</Text>
            </View>
          )}

          {checklistData.length > 0 && (
            <View style={styles.exportSection}>
              {!!(contentRef.current && contentRef.current.trim()) && (
                <View style={styles.exportSectionDivider}>
                  <CheckSquare stroke="#2563EB" size={13} />
                  <Text style={styles.exportSectionTitle}>Checklist</Text>
                </View>
              )}
              <View style={styles.exportChecklist}>
                {checklistData.map((item) => (
                  <View key={item.id} style={styles.exportCheckItem}>
                    <View style={[styles.exportCheckbox, item.completed && styles.exportCheckboxChecked]}>
                      {item.completed && <Check stroke="#FFFFFF" size={11} strokeWidth={3} />}
                    </View>
                    <Text style={[styles.exportCheckText, item.completed && styles.exportCheckTextDone]}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {tags && tags.length > 0 && (
            <View style={styles.exportTagsRow}>
              {tags.map((t, idx) => (
                <View key={idx} style={styles.exportTagChip}>
                  <Text style={styles.exportTagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.exportFooter}>
            <Text style={styles.exportFooterText}>Exported from Notes • VJ Builds</Text>
          </View>
        </View>

        {/* 2. Text Only Template */}
        <View
          ref={offScreenTextRef}
          collapsable={false}
          style={[styles.offScreenExportCard, { backgroundColor: color || '#FFFFFF' }]}
        >
          <View style={styles.exportHeader}>
            <View style={styles.exportFolderBadge}>
              <Text style={styles.exportFolderText}>{folder || 'General'}</Text>
            </View>
            <Text style={styles.exportDateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.exportTitleText}>{title || 'Untitled Note'}</Text>
          <Text style={styles.exportBodyText}>{contentRef.current ? contentRef.current.trim() : '(No text content)'}</Text>
          {tags && tags.length > 0 && (
            <View style={styles.exportTagsRow}>
              {tags.map((t, idx) => (
                <View key={idx} style={styles.exportTagChip}>
                  <Text style={styles.exportTagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.exportFooter}>
            <Text style={styles.exportFooterText}>Exported from Notes • VJ Builds</Text>
          </View>
        </View>

        {/* 3. Checklist Only Template */}
        <View
          ref={offScreenChecklistRef}
          collapsable={false}
          style={[styles.offScreenExportCard, { backgroundColor: color || '#FFFFFF' }]}
        >
          <View style={styles.exportHeader}>
            <View style={styles.exportFolderBadge}>
              <Text style={styles.exportFolderText}>{folder || 'General'}</Text>
            </View>
            <Text style={styles.exportDateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.exportTitleText}>{title || 'Untitled Note'}</Text>
          <View style={styles.exportChecklist}>
            {checklistData.map((item) => (
              <View key={item.id} style={styles.exportCheckItem}>
                <View style={[styles.exportCheckbox, item.completed && styles.exportCheckboxChecked]}>
                  {item.completed && <Check stroke="#FFFFFF" size={11} strokeWidth={3} />}
                </View>
                <Text style={[styles.exportCheckText, item.completed && styles.exportCheckTextDone]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
          {tags && tags.length > 0 && (
            <View style={styles.exportTagsRow}>
              {tags.map((t, idx) => (
                <View key={idx} style={styles.exportTagChip}>
                  <Text style={styles.exportTagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.exportFooter}>
            <Text style={styles.exportFooterText}>Exported from Notes • VJ Builds</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  exportBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  folderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  folderSelectorText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#2563EB',
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  canvasCard: {
    borderRadius: 26,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    minHeight: 480,
  },
  typeSwitcher: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
    gap: 4,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  typeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  typeBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#64748B',
  },
  typeBtnTextActive: {
    fontFamily: FONTS.bold,
    color: '#2563EB',
  },
  titleInput: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.4,
    padding: 0,
  },
  bodyInput: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    minHeight: 240,
    padding: 0,
  },
  checklistSection: {
    marginBottom: 20,
  },
  addCheckItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    gap: 8,
  },
  addCheckInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 6,
  },
  addCheckBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistItemsList: {
    gap: 12,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkItemInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14.5,
    color: '#1E293B',
    padding: 0,
  },
  checkItemInputDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  deleteItemBtn: {
    padding: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagChipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#475569',
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addTagText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#2563EB',
  },
  synergyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  synergyText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#15803D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 18, 0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 16,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  colorCircleActive: {
    borderColor: '#2563EB',
    borderWidth: 3,
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  folderOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  folderOptionText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#334155',
  },
  folderOptionTextActive: {
    fontFamily: FONTS.bold,
    color: '#2563EB',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextCancel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#64748B',
  },
  modalBtnConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextConfirm: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalBtnClose: {
    marginTop: 14,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offScreenExportCard: {
    width: 380,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  exportFolderBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  exportFolderText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  exportDateText: {
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    color: '#94A3B8',
  },
  exportTitleText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  exportSection: {
    marginBottom: 16,
  },
  exportSectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  exportSectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  exportBodyText: {
    fontFamily: FONTS.regular,
    fontSize: 14.5,
    color: '#334155',
    lineHeight: 22,
  },
  exportChecklist: {
    gap: 10,
  },
  exportCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  exportCheckText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  exportCheckTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  exportTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 16,
  },
  exportTagChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exportTagText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#475569',
  },
  exportFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  exportFooterText: {
    fontFamily: FONTS.regular,
    fontSize: 10.5,
    color: '#94A3B8',
  },
});
