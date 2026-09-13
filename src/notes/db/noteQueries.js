import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../../db/schema';

/**
 * Generate a collision-resistant unique ID for notes
 */
export const generateNoteId = () => {
  return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
};

/**
 * Helper to parse JSON fields safely
 */
export const parseNoteRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    is_pinned: Boolean(row.is_pinned),
    is_archived: Boolean(row.is_archived),
    is_trashed: Boolean(row.is_trashed),
    is_locked: Boolean(row.is_locked),
    tags: safeJsonParse(row.tags, []),
    checklist_data: safeJsonParse(row.checklist_data, []),
  };
};

const safeJsonParse = (str, fallback) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

/**
 * Fetch all notes for a user with optional filters
 */
export const getNotes = (userId, options = {}) => {
  const db = getDb();
  const {
    folder,
    tag,
    search,
    isArchived = 0,
    isTrashed = 0,
  } = options;

  let query = `
    SELECT * FROM notes 
    WHERE user_id = ? 
      AND is_trashed = ? 
      AND is_archived = ?
  `;
  const params = [userId, isTrashed ? 1 : 0, isArchived ? 1 : 0];

  if (folder && folder !== 'All') {
    query += ` AND folder = ?`;
    params.push(folder);
  }

  if (tag) {
    query += ` AND tags LIKE ?`;
    params.push(`%${tag}%`);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (title LIKE ? OR content LIKE ? OR checklist_data LIKE ?)`;
    params.push(term, term, term);
  }

  query += ` ORDER BY is_pinned DESC, updated_at DESC;`;

  try {
    const rows = db.getAllSync(query, params);
    return rows.map(parseNoteRow);
  } catch (e) {
    console.error('Error fetching notes:', e);
    return [];
  }
};

/**
 * Fetch a single note by ID
 */
export const getNoteById = (id) => {
  const db = getDb();
  try {
    const row = db.getFirstSync(`SELECT * FROM notes WHERE id = ?;`, [id]);
    return parseNoteRow(row);
  } catch (e) {
    console.error('Error getting note by id:', e);
    return null;
  }
};

/**
 * Create a new note
 */
export const createNote = ({
  id = generateNoteId(),
  userId = 1,
  title = '',
  content = '',
  type = 'text',
  folder = 'General',
  tags = [],
  color = '#161622',
  isPinned = false,
  isLocked = false,
  checklistData = [],
  reminderAt = null,
}) => {
  const db = getDb();
  const now = new Date().toISOString();
  
  const tagsJson = JSON.stringify(tags || []);
  const checklistJson = JSON.stringify(checklistData || []);

  db.runSync(
    `INSERT INTO notes (
      id, user_id, title, content, type, folder, tags, color, 
      is_pinned, is_archived, is_trashed, is_locked, checklist_data, reminder_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?);`,
    [
      id,
      userId,
      title,
      content,
      type,
      folder || 'General',
      tagsJson,
      color || '#161622',
      isPinned ? 1 : 0,
      isLocked ? 1 : 0,
      checklistJson,
      reminderAt,
      now,
      now
    ]
  );

  return getNoteById(id);
};

/**
 * Update an existing note
 */
export const updateNote = (id, updates = {}) => {
  const db = getDb();
  const existing = getNoteById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const title = updates.title !== undefined ? updates.title : existing.title;
  const content = updates.content !== undefined ? updates.content : existing.content;
  const type = updates.type !== undefined ? updates.type : existing.type;
  const folder = updates.folder !== undefined ? updates.folder : existing.folder;
  const color = updates.color !== undefined ? updates.color : existing.color;
  const reminderAt = updates.reminderAt !== undefined ? updates.reminderAt : existing.reminder_at;
  const isPinned = updates.isPinned !== undefined ? (updates.isPinned ? 1 : 0) : (existing.is_pinned ? 1 : 0);
  const isLocked = updates.isLocked !== undefined ? (updates.isLocked ? 1 : 0) : (existing.is_locked ? 1 : 0);

  const tagsJson = updates.tags !== undefined ? JSON.stringify(updates.tags) : JSON.stringify(existing.tags);
  const checklistJson = updates.checklistData !== undefined ? JSON.stringify(updates.checklistData) : JSON.stringify(existing.checklist_data);

  db.runSync(
    `UPDATE notes SET 
      title = ?, content = ?, type = ?, folder = ?, tags = ?, color = ?, 
      is_pinned = ?, is_locked = ?, checklist_data = ?, reminder_at = ?, updated_at = ?
     WHERE id = ?;`,
    [
      title,
      content,
      type,
      folder,
      tagsJson,
      color,
      isPinned,
      isLocked,
      checklistJson,
      reminderAt,
      now,
      id
    ]
  );

  return getNoteById(id);
};

/**
 * Toggle pinned status
 */
export const togglePin = (id) => {
  const db = getDb();
  const note = getNoteById(id);
  if (!note) return null;
  const newPin = note.is_pinned ? 0 : 1;
  const now = new Date().toISOString();
  db.runSync(`UPDATE notes SET is_pinned = ?, updated_at = ? WHERE id = ?;`, [newPin, now, id]);
  return !note.is_pinned;
};

/**
 * Toggle archive status
 */
export const toggleArchive = (id) => {
  const db = getDb();
  const note = getNoteById(id);
  if (!note) return null;
  const newArchive = note.is_archived ? 0 : 1;
  const now = new Date().toISOString();
  db.runSync(`UPDATE notes SET is_archived = ?, is_pinned = 0, updated_at = ? WHERE id = ?;`, [newArchive, now, id]);
  return !note.is_archived;
};

/**
 * Soft delete (move to trash)
 */
export const softDeleteNote = (id) => {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(`UPDATE notes SET is_trashed = 1, is_pinned = 0, updated_at = ? WHERE id = ?;`, [now, id]);
  return true;
};

/**
 * Restore from trash
 */
export const restoreNote = (id) => {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(`UPDATE notes SET is_trashed = 0, updated_at = ? WHERE id = ?;`, [now, id]);
  return true;
};

/**
 * Permanently delete
 */
export const permanentlyDeleteNote = (id) => {
  const db = getDb();
  db.runSync(`DELETE FROM notes WHERE id = ?;`, [id]);
  return true;
};

/**
 * Empty trash
 */
export const emptyTrash = (userId) => {
  const db = getDb();
  db.runSync(`DELETE FROM notes WHERE user_id = ? AND is_trashed = 1;`, [userId]);
  return true;
};

// In-memory cache for custom folders and deleted folders per user
const cachedCustomFoldersByUser = {};
const cachedDeletedFoldersByUser = {};

/**
 * Fetch custom folders saved by the user from AsyncStorage
 */
export const getCustomFolders = async (userId) => {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(`@notes_custom_folders_${userId}`);
    const list = raw ? JSON.parse(raw) : [];
    cachedCustomFoldersByUser[userId] = list;
    return list;
  } catch (e) {
    return cachedCustomFoldersByUser[userId] || [];
  }
};

/**
 * Fetch deleted/hidden folders from AsyncStorage
 */
export const getDeletedFolders = async (userId) => {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(`@notes_deleted_folders_${userId}`);
    const list = raw ? JSON.parse(raw) : [];
    cachedDeletedFoldersByUser[userId] = list;
    return list;
  } catch (e) {
    return cachedDeletedFoldersByUser[userId] || [];
  }
};

/**
 * Persist a newly created custom folder
 */
export const saveCustomFolder = async (userId, folderName) => {
  if (!userId || !folderName) return getFolders(userId);
  const trimmed = folderName.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return getFolders(userId);

  try {
    // If it was previously deleted, un-delete it
    const deleted = await getDeletedFolders(userId);
    if (deleted.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      const updatedDeleted = deleted.filter(f => f.toLowerCase() !== trimmed.toLowerCase());
      cachedDeletedFoldersByUser[userId] = updatedDeleted;
      await AsyncStorage.setItem(`@notes_deleted_folders_${userId}`, JSON.stringify(updatedDeleted));
    }

    const current = await getCustomFolders(userId);
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      cachedCustomFoldersByUser[userId] = updated;
      await AsyncStorage.setItem(`@notes_custom_folders_${userId}`, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Error saving custom folder:', e);
  }
  return getFolders(userId);
};

/**
 * Delete a folder (both custom and pre-existing defaults except General)
 * Reassigns any notes in this folder to 'General' so they are not lost.
 */
export const deleteFolder = async (userId, folderName) => {
  if (!userId || !folderName || folderName.toLowerCase() === 'general' || folderName.toLowerCase() === 'all') {
    return getFolders(userId);
  }
  const db = getDb();
  const now = new Date().toISOString();

  // 1. Move notes in this folder to 'General'
  try {
    db.runSync(
      `UPDATE notes SET folder = 'General', updated_at = ? WHERE user_id = ? AND folder = ?;`,
      [now, userId, folderName]
    );
  } catch (e) {
    console.error('Error reassigning notes on folder delete:', e);
  }

  // 2. Remove from custom folders list if present
  try {
    const current = await getCustomFolders(userId);
    const updated = current.filter(f => f.toLowerCase() !== folderName.toLowerCase());
    cachedCustomFoldersByUser[userId] = updated;
    await AsyncStorage.setItem(`@notes_custom_folders_${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting from custom folders:', e);
  }

  // 3. Add to deleted folders list so default folders (Work, Personal, Ideas, Finance) stay deleted
  try {
    const deleted = await getDeletedFolders(userId);
    if (!deleted.includes(folderName)) {
      const updatedDeleted = [...deleted, folderName];
      cachedDeletedFoldersByUser[userId] = updatedDeleted;
      await AsyncStorage.setItem(`@notes_deleted_folders_${userId}`, JSON.stringify(updatedDeleted));
    }
  } catch (e) {
    console.error('Error saving deleted folder:', e);
  }

  return getFolders(userId);
};

export const deleteCustomFolder = deleteFolder;

/**
 * Get distinct folders for user (defaults + custom + existing in DB minus deleted)
 */
export const getFolders = (userId) => {
  const db = getDb();
  const defaults = ['General', 'Work', 'Personal', 'Ideas', 'Finance'];
  const custom = (userId && cachedCustomFoldersByUser[userId]) || [];
  const deleted = (userId && cachedDeletedFoldersByUser[userId]) || [];

  try {
    const rows = db.getAllSync(
      `SELECT DISTINCT folder FROM notes WHERE user_id = ? AND is_trashed = 0 AND folder IS NOT NULL;`,
      [userId]
    );
    const existing = rows.map(r => r.folder).filter(Boolean);
    const merged = Array.from(new Set([...defaults, ...custom, ...existing]));
    return merged.filter(f => !deleted.includes(f));
  } catch (e) {
    return Array.from(new Set([...defaults, ...custom])).filter(f => !deleted.includes(f));
  }
};

/**
 * Get note counts per folder
 */
export const getFolderNoteCounts = (userId) => {
  const db = getDb();
  try {
    const rows = db.getAllSync(
      `SELECT folder, COUNT(*) as cnt FROM notes WHERE user_id = ? AND is_trashed = 0 AND is_archived = 0 GROUP BY folder;`,
      [userId]
    );
    const map = {};
    for (const r of rows) {
      if (r.folder) map[r.folder] = r.cnt;
    }
    return map;
  } catch (e) {
    return {};
  }
};

/**
 * Get note counts
 */
export const getNoteStats = (userId) => {
  const db = getDb();
  try {
    const active = db.getFirstSync(
      `SELECT COUNT(*) as cnt FROM notes WHERE user_id = ? AND is_trashed = 0 AND is_archived = 0;`,
      [userId]
    )?.cnt || 0;

    const pinned = db.getFirstSync(
      `SELECT COUNT(*) as cnt FROM notes WHERE user_id = ? AND is_trashed = 0 AND is_archived = 0 AND is_pinned = 1;`,
      [userId]
    )?.cnt || 0;

    const archived = db.getFirstSync(
      `SELECT COUNT(*) as cnt FROM notes WHERE user_id = ? AND is_trashed = 0 AND is_archived = 1;`,
      [userId]
    )?.cnt || 0;

    const trashed = db.getFirstSync(
      `SELECT COUNT(*) as cnt FROM notes WHERE user_id = ? AND is_trashed = 1;`,
      [userId]
    )?.cnt || 0;

    return { active, pinned, archived, trashed };
  } catch (e) {
    return { active: 0, pinned: 0, archived: 0, trashed: 0 };
  }
};
