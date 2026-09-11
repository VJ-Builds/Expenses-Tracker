import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { formatDate } from './dateHelpers';
import { getCategoryById } from '../constants/categories';

/**
 * Converts an array of expense objects to CSV string and saves it directly to user's phone folder.
 * @param {Array} expenses - list of expense rows from DB
 */
export const exportToCSV = async (expenses) => {
  if (!expenses || expenses.length === 0) {
    throw new Error('No expenses to export.');
  }

  const headers = ['Date', 'Category', 'Description', 'Amount (INR)', 'Recurring'];
  const rows = expenses.map((e) => {
    const category = getCategoryById(e.category_id);
    return [
      formatDate(e.date),
      category?.name || 'Other',
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      e.is_recurring ? 'Yes' : 'No',
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `expenses_export_${dateStr}.csv`;

  // 1. Try modern Expo SDK 54 Directory.pickDirectoryAsync to save directly into phone's Downloads folder
  try {
    const selectedDir = await Directory.pickDirectoryAsync();
    if (selectedDir && selectedDir.uri) {
      const createdFile = selectedDir.createFile(fileName, 'text/csv');
      createdFile.write(csvContent);
      Alert.alert('Download Complete 📥', `CSV file successfully saved to ${selectedDir.name || 'selected folder'}!\nFile: ${fileName}`);
      return;
    }
  } catch (e) {
    console.log('Directory picker skipped/cancelled, falling back to share dialog:', e);
  }

  // 2. Fallback: Save to Documents directory & open system file saver / share
  const csvFile = new File(Paths.document, fileName);
  csvFile.write(csvContent);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(csvFile.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Save CSV File to Downloads',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    Alert.alert('Download Complete 📥', `CSV file saved to Documents:\n${fileName}`);
  }
};
