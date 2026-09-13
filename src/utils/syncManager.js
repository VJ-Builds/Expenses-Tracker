import { supabase } from '../config/supabase';
import NetInfo from '@react-native-community/netinfo';
import { getDb } from '../db/schema';
import { getMonthlyBudgetsJson, saveMonthlyBudgetsJson } from '../db/queries';
import { getCustomFolders, saveCustomFolder, parseNoteRow } from '../notes/db/noteQueries';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = '@expenses_last_sync_at';
const PENDING_SYNC_KEY = '@expenses_pending_sync';

// Clock skew retry helper for PostgREST PGRST303 ("JWT issued at future")
const executeWithClockSkewRetry = async (queryFn, maxRetries = 2, delayMs = 2000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await queryFn();
      if (res && res.error) {
        const isClockSkew =
          res.error.code === 'PGRST303' ||
          (res.error.message && res.error.message.toLowerCase().includes('future'));
        if (isClockSkew && attempt < maxRetries) {
          console.log(`[Sync] Clock skew detected (${res.error.code || 'JWT issued at future'}). Retrying in ${delayMs / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }
      return res;
    } catch (err) {
      const isClockSkew =
        err?.code === 'PGRST303' ||
        (err?.message && err.message.toLowerCase().includes('future'));
      if (isClockSkew && attempt < maxRetries) {
        console.log(`[Sync] Clock skew exception (${err?.code || 'JWT issued at future'}). Retrying in ${delayMs / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
};

export const getExpenseExportPayload = (user) => {
  if (!user || !user.id) return null;
  const db = getDb();
  
  const expenses = db.getAllSync(
    `SELECT e.id, e.category_id, e.amount, e.currency, e.payment_method, e.description, e.date, c.name as category_name
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = ?`,
    [user.id]
  );
  
  const categories = db.getAllSync(
    `SELECT id, name, icon, color, user_id, sort_order FROM categories 
     WHERE user_id = ? OR user_id IS NULL
     ORDER BY 
       CASE WHEN id = 10 OR LOWER(name) = 'other' THEN 1 ELSE 0 END ASC,
       sort_order ASC, 
       id ASC;`,
    [user.id]
  );

  const paymentMethods = db.getAllSync(
    `SELECT id, name, icon, color, user_id, sort_order FROM payment_methods 
     WHERE user_id = ? OR user_id IS NULL
     ORDER BY 
       CASE WHEN LOWER(name) = 'other' THEN 1 ELSE 0 END ASC,
       sort_order ASC, 
       id ASC;`,
    [user.id]
  );
  
  const monthlyBudgets = getMonthlyBudgetsJson(user.id);

  // Pure ExpenseIQ payload (stored in Supabase data_json column)
  return {
    app: 'ExpenseIQ',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    user: {
      username: user.username,
      email: user.email,
    },
    monthlyBudgets,
    categories,
    paymentMethods,
    expenses,
  };
};

export const getNotesExportPayload = async (user) => {
  if (!user || !user.id) return null;
  const db = getDb();
  let notes = [];
  try {
    const rawNotes = db.getAllSync(`SELECT * FROM notes WHERE user_id = ?`, [user.id]);
    notes = rawNotes.map(parseNoteRow);
  } catch (e) {
    console.error('Error fetching notes for sync:', e);
  }
  let customFolders = [];
  try {
    customFolders = await getCustomFolders(user.id);
  } catch (e) {
    console.error('Error fetching custom folders for sync:', e);
  }
  // Dedicated Notes payload (stored in Supabase notes_data column)
  return {
    app: 'Notes',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    customFolders,
    notes,
  };
};

export const getExportPayload = getExpenseExportPayload;


export const syncUp = async (user) => {
  if (!user || !user.email) return { success: false, message: 'No user session' };
  
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    await AsyncStorage.setItem(PENDING_SYNC_KEY, 'true');
    return { success: false, message: 'Offline' };
  }
  
  try {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const pendingRaw = await AsyncStorage.getItem('@expenses_pending_auth');
      if (pendingRaw) {
        try {
          const { email, password } = JSON.parse(pendingRaw);
          const signInRes = await supabase.auth.signInWithPassword({ email, password });
          if (signInRes.data?.session) {
            session = signInRes.data.session;
            await AsyncStorage.removeItem('@expenses_pending_auth');
          }
        } catch (e) {}
      }
    }
    if (!session?.user) return { success: false, message: 'Not authenticated with cloud' };
    
    const expensePayload = getExpenseExportPayload(user);
    const notesPayload = await getNotesExportPayload(user);
    if (!expensePayload) return { success: false, message: 'Failed to generate payload' };

    // Try upserting with separate columns: data_json (ExpenseIQ) & notes_data (Notes)
    let { error } = await executeWithClockSkewRetry(async () => {
      return await supabase.from('user_sync_data').upsert({
        user_id: session.user.id,
        email: session.user.email,
        username: user.username,
        data_json: expensePayload,
        notes_data: notesPayload,
        last_synced_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    });

    // Fallback if Supabase user_sync_data table does not yet have notes_data column
    if (error && (error.code === 'PGRST204' || error.message?.includes('notes_data') || error.details?.includes('notes_data'))) {
      console.warn('[Sync] notes_data column not found in Supabase user_sync_data. Falling back to data_json only.');
      const fallbackRes = await executeWithClockSkewRetry(async () => {
        return await supabase.from('user_sync_data').upsert({
          user_id: session.user.id,
          email: session.user.email,
          username: user.username,
          data_json: expensePayload,
          last_synced_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      });
      error = fallbackRes?.error;
    }
    
    if (error) throw error;
    
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    await AsyncStorage.setItem(PENDING_SYNC_KEY, 'false');
    return { success: true };
  } catch (err) {
    console.error('Sync Up Error:', err);
    return { success: false, message: err.message };
  }
};

export const syncDown = async (user) => {
  if (!user || !user.id || !user.email) return { success: false, message: 'No user session' };
  
  const state = await NetInfo.fetch();
  if (!state.isConnected) return { success: false, message: 'Offline' };
  
  try {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const pendingRaw = await AsyncStorage.getItem('@expenses_pending_auth');
      if (pendingRaw) {
        try {
          const { email, password } = JSON.parse(pendingRaw);
          const signInRes = await supabase.auth.signInWithPassword({ email, password });
          if (signInRes.data?.session) {
            session = signInRes.data.session;
            await AsyncStorage.removeItem('@expenses_pending_auth');
          }
        } catch (e) {}
      }
    }
    if (!session?.user) return { success: false, message: 'Not authenticated with cloud' };
    
    let syncRes = await executeWithClockSkewRetry(async () => {
      return await supabase
        .from('user_sync_data')
        .select('data_json, notes_data, last_synced_at')
        .eq('user_id', session.user.id)
        .single();
    });

    if (syncRes.error && (syncRes.error.code === 'PGRST204' || syncRes.error.message?.includes('notes_data') || syncRes.error.details?.includes('notes_data'))) {
      syncRes = await executeWithClockSkewRetry(async () => {
        return await supabase
          .from('user_sync_data')
          .select('data_json, last_synced_at')
          .eq('user_id', session.user.id)
          .single();
      });
    }
    
    const { data, error } = syncRes;
      
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
    if (!data || (!data.data_json && !data.notes_data)) return { success: true, message: 'No cloud data to sync' };
    
    // Check if we already synced this
    const localLastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (localLastSync && new Date(data.last_synced_at) <= new Date(localLastSync)) {
      return { success: true, message: 'Already up to date' };
    }
    
    let backupData = data.data_json || {};
    if (typeof backupData === 'string') {
      try { backupData = JSON.parse(backupData); } catch (e) {}
    }
    let notesData = data.notes_data;
    if (typeof notesData === 'string') {
      try { notesData = JSON.parse(notesData); } catch (e) {}
    }
    const db = getDb();
    
    db.withTransactionSync(() => {
      if (backupData && (backupData.expenses || backupData.categories)) {
        // Clean old data first since we are mirroring the exact state
        db.runSync('DELETE FROM expenses WHERE user_id = ?', [user.id]);
        db.runSync('DELETE FROM category_budgets WHERE user_id = ?', [user.id]);
        db.runSync('DELETE FROM categories WHERE user_id = ?', [user.id]);
        db.runSync('DELETE FROM payment_methods WHERE user_id = ?', [user.id]);
        
        // Restore month-wise budgets
        if (backupData.monthlyBudgets && typeof backupData.monthlyBudgets === 'object') {
          saveMonthlyBudgetsJson(user.id, backupData.monthlyBudgets);
        } else if (backupData.user && backupData.user.monthly_budget) {
          const currentMonth = new Date().toISOString().slice(0, 7);
          saveMonthlyBudgetsJson(user.id, {
            [currentMonth]: { overall: Number(backupData.user.monthly_budget) || 0, categories: {} },
          });
        }
        
        if (Array.isArray(backupData.categories)) {
          for (const cat of backupData.categories) {
            db.runSync(
              'INSERT OR REPLACE INTO categories (id, user_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
              [cat.id, cat.user_id || user.id, cat.name, cat.icon, cat.color, cat.sort_order ?? 0]
            );
          }
        }

        if (Array.isArray(backupData.paymentMethods)) {
          for (const pm of backupData.paymentMethods) {
            db.runSync(
              'INSERT OR REPLACE INTO payment_methods (id, user_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
              [pm.id, pm.user_id || user.id, pm.name, pm.icon, pm.color, pm.sort_order ?? 0]
            );
          }
        }

        if (Array.isArray(backupData.expenses)) {
          for (const exp of backupData.expenses) {
            db.runSync(
              `INSERT OR REPLACE INTO expenses
                 (id, user_id, category_id, amount, currency, payment_method, description, date, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
              [
                exp.id,
                user.id,
                exp.category_id,
                exp.amount,
                exp.currency || 'INR',
                exp.payment_method || 'Cash',
                exp.description || null,
                exp.date,
              ]
            );
          }
        }
      }

      // Restore notes: from dedicated notes_data column, or legacy data_json.notes
      let notesList = notesData?.notes || (Array.isArray(notesData) ? notesData : backupData?.notes);
      if (typeof notesList === 'string') {
        try { notesList = JSON.parse(notesList); } catch (e) {}
      }
      if (Array.isArray(notesList)) {
        db.runSync('DELETE FROM notes WHERE user_id = ?', [user.id]);
        for (const n of notesList) {
          db.runSync(
            `INSERT OR REPLACE INTO notes 
              (id, user_id, title, content, type, folder, tags, color, is_pinned, is_archived, is_trashed, is_locked, checklist_data, reminder_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              n.id,
              user.id,
              n.title || '',
              n.content || '',
              n.type || 'text',
              n.folder || 'General',
              typeof n.tags === 'string' ? n.tags : JSON.stringify(n.tags || []),
              n.color || '#FFFFFF',
              n.is_pinned ? 1 : 0,
              n.is_archived ? 1 : 0,
              n.is_trashed ? 1 : 0,
              n.is_locked ? 1 : 0,
              typeof n.checklist_data === 'string' ? n.checklist_data : JSON.stringify(n.checklist_data || []),
              n.reminder_at || null,
              n.created_at || new Date().toISOString(),
              n.updated_at || new Date().toISOString()
            ]
          );
        }
      }
    });

    // Restore custom folders if present in notes_data
    if (notesData?.customFolders && Array.isArray(notesData.customFolders)) {
      for (const folder of notesData.customFolders) {
        await saveCustomFolder(user.id, folder);
      }
    }
    
    await AsyncStorage.setItem(LAST_SYNC_KEY, data.last_synced_at);
    const importedCount = (backupData?.expenses?.length || 0) + (notesData?.notes?.length || 0);
    return { success: true, imported: importedCount };
  } catch (err) {
    console.error('Sync Down Error:', err);
    return { success: false, message: err.message };
  }
};

export const autoSync = async (user) => {
  if (!user || !user.email) return { success: false, message: 'No user session' };
  
  const state = await NetInfo.fetch();
  if (!state.isConnected) return { success: false, message: 'Offline' };

  try {
    const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (pending === 'true') {
      const upRes = await syncUp(user);
      if (upRes.success) {
        await AsyncStorage.setItem(PENDING_SYNC_KEY, 'false');
      }
      return upRes;
    }
    
    // Check if cloud has newer data
    const downRes = await syncDown(user);
    if (downRes.success && (downRes.message === 'Already up to date' || downRes.message === 'No cloud data to sync')) {
      // If local already matches cloud timestamp, or cloud is empty, push local state to cloud
      return await syncUp(user);
    }
    return downRes;
  } catch (err) {
    console.error('autoSync error:', err);
    return { success: false, message: err.message };
  }
};
