import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Plus,
  Pin,
  FileText,
  Folder,
  Trash2,
  Archive,
  Grid,
  List as ListIcon,
  X,
  Sparkles,
  RotateCcw,
  Lock,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { FONTS } from '../../constants/theme';
import {
  getNotes,
  getFolders,
  getCustomFolders,
  saveCustomFolder,
  deleteFolder,
  getFolderNoteCounts,
  togglePin,
  softDeleteNote,
  restoreNote,
  permanentlyDeleteNote,
  emptyTrash,
  createNote,
} from '../db/noteQueries';
import GlassNoteCard from '../components/GlassNoteCard';
import { syncUp, syncDown } from '../../utils/syncManager';

export default function NotesListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState(['All', 'General', 'Work', 'Personal', 'Ideas', 'Finance']);
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(false);

  // Trash View State
  const [isTrashView, setIsTrashView] = useState(false);
  const [trashedNotes, setTrashedNotes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Folder management state
  const [manageFoldersModal, setManageFoldersModal] = useState(false);
  const [folderCounts, setFolderCounts] = useState({});

  // New folder modal
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Long press options modal
  const [selectedNote, setSelectedNote] = useState(null);
  const [optionsModal, setOptionsModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    await getCustomFolders(user.id);
    const loadedNotes = getNotes(user.id, {
      folder: selectedFolder,
      search: searchQuery,
      isArchived: 0,
      isTrashed: 0,
    });
    setNotes(loadedNotes);

    const loadedTrash = getNotes(user.id, {
      search: searchQuery,
      isArchived: 0,
      isTrashed: 1,
    });
    setTrashedNotes(loadedTrash);

    const userFolders = getFolders(user.id);
    const combined = ['All', ...userFolders.filter(f => f !== 'All')];
    setFolders(combined);

    const counts = getFolderNoteCounts(user.id);
    setFolderCounts(counts || {});
  }, [user, selectedFolder, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (user) {
        await syncDown(user);
        await syncUp(user);
      }
      await loadData();
    } catch (e) {
      console.log('Refresh sync error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const pinnedNotes = notes.filter(n => n.is_pinned);
  const unpinnedNotes = notes.filter(n => !n.is_pinned);

  const handleCreateNew = (type = 'text') => {
    navigation.navigate('NoteEditor', {
      noteId: null,
      initialType: type,
      initialFolder: selectedFolder !== 'All' ? selectedFolder : 'General',
    });
  };

  const handleAddFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setNewFolderModal(false);
      return;
    }
    await saveCustomFolder(user?.id, trimmed);
    const userFolders = getFolders(user?.id);
    const combined = ['All', ...userFolders.filter(f => f !== 'All')];
    setFolders(combined);
    setSelectedFolder(trimmed);
    setNewFolderName('');
    setNewFolderModal(false);
    if (user) syncUp(user).catch(() => {});
  };

  const handleDeleteFolder = (folderName) => {
    if (!folderName || folderName.toLowerCase() === 'general' || folderName.toLowerCase() === 'all') {
      Alert.alert('Protected Folder', 'The General folder is the default fallback and cannot be deleted.');
      return;
    }
    const count = folderCounts[folderName] || 0;
    Alert.alert(
      `Delete "${folderName}" folder?`,
      count > 0
        ? `This folder contains ${count} ${count === 1 ? 'note' : 'notes'}. All notes inside will be safely moved to "General".`
        : `Are you sure you want to delete the "${folderName}" folder?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Folder',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteFolder(user?.id, folderName);
            const combined = ['All', ...updated.filter(f => f !== 'All')];
            setFolders(combined);
            if (selectedFolder === folderName) {
              setSelectedFolder('All');
            }
            await loadData();
            if (user) syncUp(user).catch(() => {});
          },
        },
      ]
    );
  };

  const handleTogglePin = (note) => {
    togglePin(note.id);
    setOptionsModal(false);
    loadData();
    if (user) syncUp(user).catch(() => {});
  };

  const handleDelete = (note) => {
    Alert.alert('Move to Trash', 'This note will be moved to the Trash bin. You can restore it or delete it forever anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: () => {
          softDeleteNote(note.id);
          setOptionsModal(false);
          loadData();
          if (user) syncUp(user).catch(() => {});
        },
      },
    ]);
  };

  const handleRestoreNote = (note) => {
    restoreNote(note.id);
    loadData();
    if (user) syncUp(user).catch(() => {});
    Alert.alert('Note Restored', `"${note.title || 'Note'}" has been restored to ${note.folder || 'General'}.`);
  };

  const handlePermanentDelete = (note) => {
    Alert.alert(
      'Delete Forever?',
      `Are you sure you want to permanently delete "${note.title || 'this note'}"? It will be removed forever from your device and cloud storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            permanentlyDeleteNote(note.id);
            loadData();
            if (user) syncUp(user).catch(() => {});
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (trashedNotes.length === 0) return;
    Alert.alert(
      'Empty Trash?',
      `Are you sure you want to permanently delete all ${trashedNotes.length} notes in the Trash bin? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: () => {
            emptyTrash(user.id);
            loadData();
            if (user) syncUp(user).catch(() => {});
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) }]}>
      <StatusBar barStyle="dark-content" />

      {/* Ambient background glowing orbs */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
      </View>

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (isTrashView) {
              setIsTrashView(false);
            } else {
              navigation.navigate('AppsHub');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft stroke="#0F172A" size={22} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isTrashView ? 'Trash Bin' : 'Notes'}
          </Text>
          <View style={[styles.countBadge, isTrashView && { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.countText, isTrashView && { color: '#DC2626' }]}>
              {isTrashView ? trashedNotes.length : notes.length}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerBtn, searchOpen && styles.headerBtnActive]}
            onPress={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <Search stroke={searchOpen ? '#2563EB' : '#0F172A'} size={20} strokeWidth={2.2} />
          </TouchableOpacity>

          {!isTrashView && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setIsGridView(!isGridView)}
              activeOpacity={0.7}
            >
              {isGridView ? (
                <ListIcon stroke="#0F172A" size={20} strokeWidth={2.2} />
              ) : (
                <Grid stroke="#0F172A" size={20} strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          )}

          {isTrashView ? (
            trashedNotes.length > 0 && (
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
                onPress={handleEmptyTrash}
                activeOpacity={0.7}
              >
                <Trash2 stroke="#DC2626" size={19} strokeWidth={2.2} />
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={[styles.headerBtn, trashedNotes.length > 0 && styles.trashHeaderBtnWithItems]}
              onPress={() => setIsTrashView(true)}
              activeOpacity={0.7}
            >
              <Trash2 stroke={trashedNotes.length > 0 ? '#EF4444' : '#64748B'} size={19} strokeWidth={2} />
              {trashedNotes.length > 0 && (
                <View style={styles.trashBadge}>
                  <Text style={styles.trashBadgeText}>{trashedNotes.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <View style={styles.searchBarWrap}>
          <Search stroke="#94A3B8" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder={isTrashView ? 'Search in Trash...' : 'Search notes, checklists, tags...'}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X stroke="#94A3B8" size={16} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Trash Notice Banner OR Folder filter pills */}
      {isTrashView ? (
        <View style={styles.trashBanner}>
          <View style={styles.trashBannerIcon}>
            <Trash2 stroke="#DC2626" size={16} />
          </View>
          <Text style={styles.trashBannerText}>
            Items in Trash can be restored or permanently removed forever.
          </Text>
        </View>
      ) : (
        <View style={styles.folderRow}>
          <FlatList
            data={folders}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.folderListContent}
            renderItem={({ item }) => {
              const isSelected = selectedFolder === item;
              return (
                <TouchableOpacity
                  style={[styles.folderPill, isSelected && styles.folderPillActive]}
                  onPress={() => setSelectedFolder(item)}
                  onLongPress={() => {
                    if (item !== 'All') {
                      setManageFoldersModal(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.folderPillText, isSelected && styles.folderPillTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <View style={styles.folderActionsWrap}>
                <TouchableOpacity
                  style={styles.addFolderBtn}
                  onPress={() => setNewFolderModal(true)}
                  activeOpacity={0.8}
                >
                  <Plus stroke="#2563EB" size={15} />
                  <Text style={styles.addFolderText}>Folder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manageFolderBtn}
                  onPress={() => setManageFoldersModal(true)}
                  activeOpacity={0.8}
                >
                  <Folder stroke="#475569" size={13} />
                  <Text style={styles.manageFolderText}>Manage</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {/* Notes List Content */}
      <FlatList
        data={isTrashView ? trashedNotes : (isGridView ? notes : [...pinnedNotes, ...unpinnedNotes])}
        key={isGridView && !isTrashView ? 'GRID' : 'LIST'}
        numColumns={isGridView && !isTrashView ? 2 : 1}
        columnWrapperStyle={isGridView && !isTrashView ? styles.gridRow : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
        renderItem={({ item }) => {
          if (isTrashView) {
            return (
              <View style={styles.trashedCardContainer}>
                <GlassNoteCard
                  note={item}
                  onPress={() => {
                    Alert.alert(
                      item.title || 'Trashed Note',
                      'What would you like to do with this trashed note?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Restore Note', onPress: () => handleRestoreNote(item) },
                        { text: 'Delete Forever', style: 'destructive', onPress: () => handlePermanentDelete(item) },
                      ]
                    );
                  }}
                  onLongPress={() => {
                    Alert.alert(
                      item.title || 'Trashed Note',
                      'What would you like to do with this trashed note?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Restore Note', onPress: () => handleRestoreNote(item) },
                        { text: 'Delete Forever', style: 'destructive', onPress: () => handlePermanentDelete(item) },
                      ]
                    );
                  }}
                />
                {/* Inline Trash Quick Actions */}
                <View style={styles.trashCardFooter}>
                  <TouchableOpacity
                    style={styles.trashRestoreBtn}
                    onPress={() => handleRestoreNote(item)}
                    activeOpacity={0.7}
                  >
                    <RotateCcw stroke="#2563EB" size={14} strokeWidth={2.2} />
                    <Text style={styles.trashRestoreText}>Restore</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.trashDeleteBtn}
                    onPress={() => handlePermanentDelete(item)}
                    activeOpacity={0.7}
                  >
                    <Trash2 stroke="#EF4444" size={14} strokeWidth={2.2} />
                    <Text style={styles.trashDeleteText}>Delete Forever</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={isGridView ? styles.gridCardWrap : null}>
              <GlassNoteCard
                note={item}
                isGridView={isGridView && !isTrashView}
                onPress={() => navigation.navigate('NoteEditor', { noteId: item.id })}
                onLongPress={() => {
                  setSelectedNote(item);
                  setOptionsModal(true);
                }}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          isTrashView ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Trash2 stroke="#94A3B8" size={32} />
              </View>
              <Text style={styles.emptyTitle}>Trash is empty</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No trashed notes match your search'
                  : 'Notes you move to trash will appear here until permanently deleted.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyCtaBtn, { backgroundColor: '#64748B' }]}
                onPress={() => setIsTrashView(false)}
                activeOpacity={0.85}
              >
                <ArrowLeft stroke="#FFFFFF" size={18} />
                <Text style={styles.emptyCtaText}>Back to Notes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Sparkles stroke="#2563EB" size={32} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No notes found' : 'No notes in this folder'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try a different search keyword'
                  : 'Capture your thoughts, daily plans, or shopping checklists in seconds.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={() => handleCreateNew('text')}
                activeOpacity={0.85}
              >
                <Plus stroke="#FFFFFF" size={18} />
                <Text style={styles.emptyCtaText}>Create First Note</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Floating Action Capture Button (FAB) - Single + button */}
      {!isTrashView && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fabBtn, styles.fabPrimary]}
            onPress={() => handleCreateNew('text')}
            activeOpacity={0.85}
          >
            <Plus stroke="#FFFFFF" size={26} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      )}

      {/* New Folder Modal */}
      <Modal visible={newFolderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <Text style={styles.modalSub}>Organize your notes by topic or project</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Folder name (e.g. Travel, Finance, Work)"
              placeholderTextColor="#94A3B8"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setNewFolderModal(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleAddFolder}>
                <Text style={styles.modalBtnTextConfirm}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Folders Modal */}
      <Modal visible={manageFoldersModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '82%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Manage Folders</Text>
                <Text style={styles.modalSub}>Delete or organize your folders</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setManageFoldersModal(false)}
              >
                <X stroke="#64748B" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.manageFolderInfoBox}>
              <Text style={styles.manageFolderInfoText}>
                Deleting a folder will safely move all its notes to General so no notes are lost.
              </Text>
            </View>

            <FlatList
              data={folders.filter(f => f !== 'All')}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300, marginVertical: 8 }}
              renderItem={({ item }) => {
                const count = folderCounts[item] || 0;
                const isGeneral = item.toLowerCase() === 'general';
                return (
                  <View style={styles.manageFolderItem}>
                    <View style={styles.manageFolderItemLeft}>
                      <View style={[styles.manageFolderIconWrap, isGeneral && styles.manageFolderIconWrapGeneral]}>
                        <Folder stroke={isGeneral ? '#2563EB' : '#475569'} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.manageFolderName}>{item}</Text>
                          {isGeneral && (
                            <View style={styles.generalBadge}>
                              <Lock stroke="#2563EB" size={10} style={{ marginRight: 2 }} />
                              <Text style={styles.generalBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.manageFolderCountText}>
                          {count} {count === 1 ? 'note' : 'notes'}
                        </Text>
                      </View>
                    </View>

                    {!isGeneral ? (
                      <TouchableOpacity
                        style={styles.folderDeleteBtn}
                        onPress={() => handleDeleteFolder(item)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 stroke="#EF4444" size={17} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.folderProtectedWrap}>
                        <Lock stroke="#94A3B8" size={16} />
                      </View>
                    )}
                  </View>
                );
              }}
            />

            <View style={styles.manageModalActions}>
              <TouchableOpacity
                style={styles.manageAddFolderBtn}
                onPress={() => {
                  setManageFoldersModal(false);
                  setNewFolderModal(true);
                }}
                activeOpacity={0.8}
              >
                <Plus stroke="#2563EB" size={16} />
                <Text style={styles.manageAddFolderText}>Add New Folder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={() => setManageFoldersModal(false)}
              >
                <Text style={styles.modalBtnTextConfirm}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Long Press Note Options Modal */}
      <Modal visible={optionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedNote?.title || 'Note Options'}
            </Text>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleTogglePin(selectedNote)}
            >
              <Pin stroke="#2563EB" size={20} />
              <Text style={styles.optionRowText}>
                {selectedNote?.is_pinned ? 'Unpin from Top' : 'Pin to Top'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handleDelete(selectedNote)}
            >
              <Trash2 stroke="#EF4444" size={20} />
              <Text style={[styles.optionRowText, { color: '#EF4444' }]}>Move to Trash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtnCancel}
              onPress={() => setOptionsModal(false)}
            >
              <Text style={styles.modalBtnTextCancel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 280,
    height: 280,
    backgroundColor: '#DBEAFE',
    top: -40,
    right: -60,
    opacity: 0.6,
  },
  orb2: {
    width: 240,
    height: 240,
    backgroundColor: '#EDE9FE',
    bottom: 80,
    left: -60,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  countText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#2563EB',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  folderRow: {
    marginBottom: 14,
  },
  folderListContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  folderPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  folderPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  folderPillText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#64748B',
  },
  folderPillTextActive: {
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
  },
  addFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
  },
  addFolderText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#2563EB',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCardWrap: {
    width: '48.5%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyCtaText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 24 : 36,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabBtn: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  fabPrimary: {
    width: 58,
    height: 58,
    backgroundColor: '#2563EB',
  },
  fabSecondary: {
    width: 46,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalBtnTextCancel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#64748B',
  },
  modalBtnConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  modalBtnTextConfirm: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionRowText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#0F172A',
  },
  trashBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  trashBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  trashHeaderBtnWithItems: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  trashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  trashBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashBannerText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  trashedCardContainer: {
    marginBottom: 6,
  },
  trashCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: -8,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  trashRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  trashRestoreText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#2563EB',
  },
  trashDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  trashDeleteText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#EF4444',
  },
  folderActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manageFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  manageFolderText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#475569',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalCloseBtn: {
    padding: 4,
  },
  manageFolderInfoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  manageFolderInfoText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  manageFolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  manageFolderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  manageFolderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageFolderIconWrapGeneral: {
    backgroundColor: '#EFF6FF',
  },
  manageFolderName: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  generalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  generalBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  manageFolderCountText: {
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  folderDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  folderProtectedWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageModalActions: {
    marginTop: 12,
    gap: 8,
  },
  manageAddFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  manageAddFolderText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13.5,
    color: '#2563EB',
  },
});
