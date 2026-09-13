import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pin, CheckSquare, FileText, Lock } from 'lucide-react-native';
import { FONTS } from '../../constants/theme';

export default function GlassNoteCard({ note, onPress, onLongPress, isGridView = false }) {
  if (!note) return null;

  const isChecklist = note.type === 'checklist';
  const checklistItems = Array.isArray(note.checklist_data) ? note.checklist_data : [];
  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalChecklist = checklistItems.length;
  const percent = totalChecklist > 0 ? (completedCount / totalChecklist) * 100 : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  // Card accent tint based on note.color or default
  const cardColor = note.color && note.color !== '#161622' ? note.color : '#FFFFFF';

  if (isGridView) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.gridCard,
          { backgroundColor: cardColor },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
      >
        {/* Grid Header: Title & Pin */}
        <View style={styles.gridHeaderRow}>
          <Text style={styles.gridTitle} numberOfLines={1}>
            {note.title || 'Untitled Note'}
          </Text>
          <View style={styles.headerRightWrap}>
            {note.is_locked && <Lock stroke="#F59E0B" size={12} style={{ marginRight: 3 }} />}
            {note.is_pinned && (
              <View style={styles.pinIconWrap}>
                <Pin stroke="#FF6B6B" size={12} fill="#FF6B6B" />
              </View>
            )}
          </View>
        </View>

        {/* Grid Folder Pill */}
        <View style={styles.gridFolderWrap}>
          <View style={styles.folderBadge}>
            <Text style={styles.folderText} numberOfLines={1}>{note.folder || 'General'}</Text>
          </View>
        </View>

        {/* Grid Body: Fixed flex with overflow hidden */}
        <View style={styles.gridBodyWrap}>
          {isChecklist ? (
            <View style={styles.checklistWrap}>
              {checklistItems.slice(0, 2).map((item, idx) => (
                <View key={item.id || idx} style={styles.checkRow}>
                  <View style={[styles.miniBox, item.completed && styles.miniBoxChecked]}>
                    {item.completed && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text
                    style={[styles.checkText, item.completed && styles.checkTextDone]}
                    numberOfLines={1}
                  >
                    {item.text}
                  </Text>
                </View>
              ))}
              {totalChecklist > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${percent}%` }]} />
                  </View>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.contentSnippet} numberOfLines={3}>
              {note.content ? note.content.trim() : 'No text content'}
            </Text>
          )}
        </View>

        {/* Grid Footer: Date & Tags */}
        <View style={styles.footerRow}>
          <Text style={styles.dateText}>{formatDate(note.updated_at || note.created_at)}</Text>
          <View style={styles.tagsContainer}>
            {Array.isArray(note.tags) && note.tags.length > 0 && (
              <View style={styles.tagPill}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {note.tags[0].startsWith('#') ? note.tags[0] : `#${note.tags[0]}`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── List View Layout (Folder on top-right of title, uniform height) ──
  return (
    <TouchableOpacity
      style={[
        styles.card,
        styles.listCard,
        { backgroundColor: cardColor },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Top row: Title on left, Folder & Pin on right */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {note.title || 'Untitled Note'}
        </Text>
        <View style={styles.headerRightWrap}>
          {note.is_locked && <Lock stroke="#F59E0B" size={13} style={{ marginRight: 4 }} />}
          {note.is_pinned && (
            <View style={styles.pinIconWrap}>
              <Pin stroke="#FF6B6B" size={13} fill="#FF6B6B" style={{ marginRight: 5 }} />
            </View>
          )}
          <View style={styles.folderBadge}>
            <Text style={styles.folderText} numberOfLines={1}>{note.folder || 'General'}</Text>
          </View>
        </View>
      </View>

      {/* List Body: Text snippet or checklist preview */}
      <View style={styles.listBodyWrap}>
        {isChecklist ? (
          <View style={styles.listChecklistSnippet}>
            <CheckSquare stroke="#2563EB" size={13} style={{ marginTop: 1, marginRight: 6 }} />
            <Text style={styles.listChecklistText} numberOfLines={1}>
              {checklistItems.length > 0
                ? `${completedCount}/${totalChecklist} done • ${checklistItems[0]?.text || ''}`
                : 'Empty checklist'}
            </Text>
          </View>
        ) : (
          <Text style={styles.listContentSnippet} numberOfLines={2}>
            {note.content ? note.content.trim() : 'No text content'}
          </Text>
        )}
      </View>

      {/* List Footer: Date & Tags */}
      <View style={styles.footerRow}>
        <Text style={styles.dateText}>{formatDate(note.updated_at || note.created_at)}</Text>
        
        <View style={styles.tagsContainer}>
          {Array.isArray(note.tags) && note.tags.slice(0, 2).map((t, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagText}>{t.startsWith('#') ? t : `#${t}`}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: 'space-between',
  },
  // Exact uniform height for all List cards
  listCard: {
    height: 120,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 12,
  },
  // Exact uniform height for all Grid cards
  gridCard: {
    height: 168,
    padding: 13,
    marginBottom: 12,
  },

  // ── List View Header: Title on left, Folder & Pin on right ──
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  listTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15.5,
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },
  headerRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.09)',
    maxWidth: 90,
  },
  folderText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pinIconWrap: {
    transform: [{ rotate: '45deg' }],
  },

  // ── List View Body ──
  listBodyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  listContentSnippet: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
  listChecklistSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listChecklistText: {
    fontFamily: FONTS.medium,
    fontSize: 12.5,
    color: '#475569',
    flex: 1,
  },

  // ── Grid View Header & Body ──
  gridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  gridTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14.5,
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },
  gridFolderWrap: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 6,
  },
  gridBodyWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  contentSnippet: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  checklistWrap: {
    gap: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBoxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  checkText: {
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    color: '#334155',
    flex: 1,
  },
  checkTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 1.5,
  },

  // ── Shared Footer ──
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  dateText: {
    fontFamily: FONTS.medium,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  tagPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    maxWidth: 60,
  },
  tagText: {
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    color: '#64748B',
  },
});
