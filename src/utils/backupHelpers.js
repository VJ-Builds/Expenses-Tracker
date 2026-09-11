import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { getDb } from '../db/schema';
import { getMonthlyBudgetsJson, saveMonthlyBudgetsJson } from '../db/queries';

/**
 * Export all user data (expenses, categories, category budgets) directly into user's public folder (Downloads).
 * Uses modern Expo SDK 54 Directory & File APIs.
 */
export const exportUserDataBackup = async (user) => {
  if (!user || !user.id) {
    Alert.alert('Error', 'User session not found.');
    return;
  }

  try {
    const db = getDb();

    // 1. Fetch expenses
    const expenses = db.getAllSync(
      `SELECT e.id, e.category_id, e.amount, e.currency, e.payment_method, e.description, e.date, c.name as category_name
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ?
       ORDER BY e.date DESC;`,
      [user.id]
    );

    // 2. Fetch custom categories
    const categories = db.getAllSync(
      `SELECT id, name, icon, color, sort_order FROM categories 
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY 
         CASE WHEN id = 10 OR LOWER(name) = 'other' THEN 1 ELSE 0 END ASC,
         sort_order ASC, 
         id ASC;`,
      [user.id]
    );

    // 3. Fetch custom payment methods
    const paymentMethods = db.getAllSync(
      `SELECT id, name, icon, color, sort_order FROM payment_methods 
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY 
         CASE WHEN LOWER(name) = 'other' THEN 1 ELSE 0 END ASC,
         sort_order ASC, 
         id ASC;`,
      [user.id]
    );

    // 4. Fetch monthly budgets JSON
    const monthlyBudgets = getMonthlyBudgetsJson(user.id);

    const backupPayload = {
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

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `ExpenseIQ_Backup_${dateStr}.json`;
    const jsonContent = JSON.stringify(backupPayload, null, 2);

    // 1. Try modern Expo SDK 54 Directory.pickDirectoryAsync to save directly into phone's Downloads folder
    try {
      const selectedDir = await Directory.pickDirectoryAsync();
      if (selectedDir && selectedDir.uri) {
        const createdFile = selectedDir.createFile(fileName, 'application/json');
        createdFile.write(jsonContent);
        Alert.alert('Download Complete 📥', `Backup file successfully saved to ${selectedDir.name || 'selected folder'}!\nFile: ${fileName}`);
        return;
      }
    } catch (e) {
      console.log('Directory picker skipped/cancelled, falling back to share dialog:', e);
    }

    // 2. Fallback: Save to Documents directory & open system file saver / share
    const backupFile = new File(Paths.document, fileName);
    backupFile.write(jsonContent);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(backupFile.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Backup File to Downloads',
        UTI: 'public.json',
      });
    } else {
      Alert.alert('Download Complete 📥', `File saved to Documents:\n${fileName}`);
    }
  } catch (error) {
    console.error('Export Backup Error:', error);
    Alert.alert('Export Failed', error.message || 'Unable to generate backup file.');
  }
};

/**
 * Prompt user to select a JSON backup file and import data into the local SQLite database.
 */
export const importUserDataBackup = async (user, onSuccess) => {
  if (!user || !user.id) {
    Alert.alert('Error', 'User session not found.');
    return;
  }

  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return; // User cancelled picking file
    }

    const pickedFile = result.assets[0];
    const backupFile = new File(pickedFile.uri);
    const fileContent = await backupFile.text();

    let backupData;
    try {
      backupData = JSON.parse(fileContent);
    } catch (e) {
      Alert.alert('Invalid File', 'The selected file is not a valid JSON backup file.');
      return;
    }

    if (!backupData || !Array.isArray(backupData.expenses)) {
      Alert.alert('Invalid Backup Format', 'The file does not contain valid ExpenseIQ data.');
      return;
    }

    const db = getDb();
    let importedCount = 0;

    // Begin database import
    db.withTransactionSync(() => {
      // Import month-wise budgets if provided
      if (backupData.monthlyBudgets && typeof backupData.monthlyBudgets === 'object') {
        saveMonthlyBudgetsJson(user.id, backupData.monthlyBudgets);
      } else if (backupData.user && backupData.user.monthly_budget) {
        // Fallback for legacy backups
        const currentMonth = new Date().toISOString().slice(0, 7);
        saveMonthlyBudgetsJson(user.id, {
          [currentMonth]: { overall: Number(backupData.user.monthly_budget) || 0, categories: {} },
        });
      }


      // Import payment methods if provided
      if (Array.isArray(backupData.paymentMethods)) {
        for (const pm of backupData.paymentMethods) {
          db.runSync(
            'INSERT OR REPLACE INTO payment_methods (id, user_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [pm.id, user.id, pm.name, pm.icon, pm.color, pm.sort_order ?? 0]
          );
        }
      }

      // Import expenses
      for (const exp of backupData.expenses) {
        if (exp.amount && exp.date) {
          db.runSync(
            `INSERT INTO expenses
               (user_id, category_id, amount, currency, payment_method, description, date, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
            [
              user.id,
              exp.category_id || 10,
              exp.amount,
              exp.currency || 'INR',
              exp.payment_method || 'Cash',
              exp.description || null,
              exp.date,
            ]
          );
          importedCount++;
        }
      }
    });

    Alert.alert(
      'Backup Restored! 🎉',
      `Successfully imported ${importedCount} expense records into your account.`,
      [
        {
          text: 'OK',
          onPress: () => {
            if (onSuccess) onSuccess();
          },
        },
      ]
    );
  } catch (error) {
    console.error('Import Backup Error:', error);
    Alert.alert('Import Failed', error.message || 'An error occurred while importing backup.');
  }
};
