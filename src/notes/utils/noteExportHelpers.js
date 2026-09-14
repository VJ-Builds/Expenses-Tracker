import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { convertRichTextToHtml, stripRichTags } from './richTextParser';

const SAVED_DOWNLOAD_DIR_KEY = '@notes_saved_download_dir_uri';

/**
 * Format date nicely for exports
 */
const formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr || Date.now());
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr || '';
  }
};

/**
 * Convert number to Roman numerals (e.g. 1 -> i, 2 -> ii, 3 -> iii)
 */
export const getRomanNumeral = (num) => {
  const lookup = [
    { value: 1000, str: 'm' },
    { value: 900, str: 'cm' },
    { value: 500, str: 'd' },
    { value: 400, str: 'cd' },
    { value: 100, str: 'c' },
    { value: 90, str: 'xc' },
    { value: 50, str: 'l' },
    { value: 40, str: 'xl' },
    { value: 10, str: 'x' },
    { value: 9, str: 'ix' },
    { value: 5, str: 'v' },
    { value: 4, str: 'iv' },
    { value: 1, str: 'i' },
  ];
  let roman = '';
  let n = Math.max(1, Math.floor(num));
  for (const item of lookup) {
    while (n >= item.value) {
      roman += item.str;
      n -= item.value;
    }
  }
  return roman || 'i';
};

/**
 * Convert string to UTF-8 Uint8Array prepended with UTF-8 Byte Order Mark (BOM: 0xEF, 0xBB, 0xBF)
 * This guarantees plain text (.txt) files are recognized and decoded as UTF-8 by all text editors,
 * preventing special characters like '➢', '✓', '★', '☆', '•' from turning into mojibake ('âž¢', etc.).
 */
export const stringToUtf8BytesWithBom = (str) => {
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  let textBytes;
  if (typeof TextEncoder !== 'undefined') {
    textBytes = new TextEncoder().encode(str);
  } else {
    const unescaped = unescape(encodeURIComponent(str));
    textBytes = new Uint8Array(unescaped.length);
    for (let i = 0; i < unescaped.length; i++) {
      textBytes[i] = unescaped.charCodeAt(i);
    }
  }
  const combined = new Uint8Array(bom.length + textBytes.length);
  combined.set(bom, 0);
  combined.set(textBytes, bom.length);
  return combined;
};

/**
 * Prompt user to select destination folder (Downloads) using Storage Access Framework.
 * Remembers the chosen directory so user only has to select once!
 */
export const getTargetDirectory = async (forcePrompt = false) => {
  try {
    if (!forcePrompt) {
      const savedUri = await AsyncStorage.getItem(SAVED_DOWNLOAD_DIR_KEY);
      if (savedUri) {
        try {
          const dir = new Directory(savedUri);
          if (dir && dir.uri) {
            return dir;
          }
        } catch (e) {
          console.log('Saved directory invalid, clearing:', e);
          await AsyncStorage.removeItem(SAVED_DOWNLOAD_DIR_KEY);
        }
      }
    }

    const selectedDir = await Directory.pickDirectoryAsync();
    if (selectedDir && selectedDir.uri) {
      await AsyncStorage.setItem(SAVED_DOWNLOAD_DIR_KEY, selectedDir.uri);
      return selectedDir;
    }
    return null;
  } catch (e) {
    console.log('Directory selection error:', e);
    return null;
  }
};

/**
 * Safely writes data to targetDir, falling back to a fresh directory picker
 * if the cached directory permission was revoked or expired.
 */
const saveFileToDirectory = async (fileName, mimeType, writeData) => {
  let dir = await getTargetDirectory();
  if (!dir) return null;

  try {
    const file = dir.createFile(fileName, mimeType);
    file.write(writeData);
    return dir;
  } catch (safErr) {
    console.log('Error writing to cached directory, retrying with fresh picker:', safErr);
    await AsyncStorage.removeItem(SAVED_DOWNLOAD_DIR_KEY);
    dir = await getTargetDirectory(true);
    if (dir) {
      const file = dir.createFile(fileName, mimeType);
      file.write(writeData);
      return dir;
    }
    return null;
  }
};

/**
 * Robust in-memory Base64 to Uint8Array converter (avoids any file permission checks)
 */
const base64ToUint8Array = (base64Str) => {
  const cleanBase64 = (base64Str || '').replace(/[\r\n\s]/g, '');
  if (typeof atob === 'function') {
    const binary = atob(cleanBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  let bufferLength = cleanBase64.length * 0.75;
  if (cleanBase64.endsWith('==')) bufferLength -= 2;
  else if (cleanBase64.endsWith('=')) bufferLength -= 1;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const enc1 = lookup[cleanBase64.charCodeAt(i)];
    const enc2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const enc3 = lookup[cleanBase64.charCodeAt(i + 2)];
    const enc4 = lookup[cleanBase64.charCodeAt(i + 3)];
    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (p < bufferLength) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (p < bufferLength) bytes[p++] = ((enc3 & 3) << 6) | (enc4 & 63);
  }
  return bytes;
};

/**
 * 1. Download note as a formatted .TXT file directly into phone's Downloads folder
 * Seamlessly includes BOTH Text Note content AND Checklist items if both exist.
 */
export const exportNoteAsTxt = async (note) => {
  try {
    const safeNote = note || {};
    const sanitizedTitle = (safeNote.title || 'Note')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30) || 'Note';
    const fileName = `${sanitizedTitle}_${Date.now()}.txt`;

    let textContent = `=========================================\n`;
    textContent += `${(safeNote.title || 'Untitled Note').toUpperCase()}\n`;
    textContent += `=========================================\n`;
    textContent += `Folder: ${safeNote.folder || 'General'}\n`;
    textContent += `Date: ${formatDate(safeNote.updated_at || safeNote.created_at)}\n`;
    if (safeNote.tags && safeNote.tags.length > 0) {
      textContent += `Tags: ${safeNote.tags.join(', ')}\n`;
    }
    textContent += `-----------------------------------------\n\n`;

    const hasText = !!(safeNote.content && safeNote.content.trim());
    const hasChecklist = Array.isArray(safeNote.checklist_data) && safeNote.checklist_data.length > 0;

    if (hasText) {
      textContent += `${stripRichTags(safeNote.content.trim())}\n\n`;
    }

    if (hasChecklist) {
      if (hasText) {
        textContent += `CHECKLIST:\n`;
        textContent += `-----------------------------------------\n`;
      }
      const cStyle = safeNote.checklist_style || 'checkbox';
      safeNote.checklist_data.forEach((item, idx) => {
        let prefix = item.completed ? '[X]' : '[ ]';
        if (cStyle === 'bullet') prefix = '•';
        else if (cStyle === 'number') prefix = `${idx + 1}.`;
        else if (cStyle === 'star') prefix = item.completed ? '★' : '☆';
        else if (cStyle === 'arrow') prefix = '➢';
        else if (cStyle === 'roman') prefix = `${getRomanNumeral(idx + 1)}.`;
        else if (cStyle === 'check') prefix = '✓';
        textContent += `${prefix} ${item.text}\n`;
      });
      textContent += `\n`;
    }

    if (!hasText && !hasChecklist) {
      textContent += `(Empty note)\n\n`;
    }

    textContent += `-----------------------------------------\n`;
    textContent += `Exported from Notes - VJ Builds\n`;

    // 1. Direct download to chosen folder (Downloads) via Storage Access Framework with UTF-8 BOM
    const utf8Bytes = stringToUtf8BytesWithBom(textContent);
    const savedDir = await saveFileToDirectory(fileName, 'text/plain; charset=utf-8', utf8Bytes);
    if (savedDir) {
      Alert.alert(
        'Download Complete 📥',
        `Text file successfully saved to ${savedDir.name || 'Downloads'}!\n\nFile: ${fileName}`
      );
      return true;
    }

    // 2. Fallback for iOS
    if (Platform.OS === 'ios') {
      const cacheFile = new File(Paths.cache, fileName);
      cacheFile.write(utf8Bytes);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(cacheFile.uri, {
          mimeType: 'text/plain; charset=utf-8',
          dialogTitle: `Save: ${safeNote.title || 'Note'}`,
          UTI: 'public.plain-text',
        });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error downloading TXT note:', error);
    Alert.alert('Download Error', 'Failed to save text file: ' + (error?.message || error));
    return false;
  }
};

/**
 * 2. Download note as a PDF document directly into phone's Downloads folder
 * Seamlessly includes BOTH Text Note content AND Checklist items if both exist.
 */
export const exportNoteAsPdf = async (note) => {
  try {
    const safeNote = note || {};
    const title = safeNote.title || 'Untitled Note';
    const folder = safeNote.folder || 'General';
    const dateStr = formatDate(safeNote.updated_at || safeNote.created_at);
    const tags = Array.isArray(safeNote.tags) ? safeNote.tags : [];

    const sanitizedTitle = (title || 'Note')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30) || 'Note';
    const fileName = `${sanitizedTitle}_${Date.now()}.pdf`;

    let savedDir = null;

    // 1. Try HTML Print to PDF with base64 (avoids file permission issues)
    try {
      const hasText = !!(safeNote.content && safeNote.content.trim());
      const hasChecklist = Array.isArray(safeNote.checklist_data) && safeNote.checklist_data.length > 0;

      let bodyHtml = '';

      if (hasText) {
        const formattedContent = convertRichTextToHtml(safeNote.content.trim());
        bodyHtml += `<div class="note-body" style="text-align: ${safeNote.text_align || 'left'}; color: ${safeNote.ink_color || '#334155'};">${formattedContent}</div>`;
      }

      if (hasChecklist) {
        if (hasText) {
          bodyHtml += `
            <div class="section-divider"></div>
            <div class="section-title">Checklist</div>
          `;
        }
        const cStyle = safeNote.checklist_style || 'checkbox';
        bodyHtml += `<div class="checklist-wrap">`;
        safeNote.checklist_data.forEach((item, idx) => {
          let markerHtml = '';
          if (cStyle === 'bullet') {
            markerHtml = `<span class="bullet-dot" style="font-size: 18px; line-height: 1; margin-right: 8px;">•</span>`;
          } else if (cStyle === 'number') {
            markerHtml = `<span class="num-marker" style="font-weight: 700; color: #0F172A; min-width: 22px;">${idx + 1}.</span>`;
          } else if (cStyle === 'star') {
            markerHtml = `<span class="star-marker" style="font-size: 16px; color: ${item.completed ? '#94A3B8' : '#F59E0B'}; margin-right: 8px;">${item.completed ? '★' : '☆'}</span>`;
          } else if (cStyle === 'arrow') {
            markerHtml = `<span class="arrow-marker" style="font-weight: 700; color: #2563EB; margin-right: 8px;">➢</span>`;
          } else if (cStyle === 'roman') {
            markerHtml = `<span class="roman-marker" style="font-weight: 700; color: #0F172A; min-width: 24px; margin-right: 4px;">${getRomanNumeral(idx + 1)}.</span>`;
          } else if (cStyle === 'check') {
            markerHtml = `<span class="check-marker" style="font-weight: 700; color: ${item.completed ? '#94A3B8' : '#10B981'}; margin-right: 8px;">✓</span>`;
          } else {
            markerHtml = `<div class="checkbox">${item.completed ? '✓' : ''}</div>`;
          }

          const itemColor = item.completed ? '#94A3B8' : (item.color || safeNote.checklist_ink_color || safeNote.ink_color || '#1E293B');
          const itemWeight = item.isBold ? 'font-weight: 700;' : '';
          const itemStyle = item.isItalic ? 'font-style: italic;' : '';
          const itemDeco = item.completed ? 'text-decoration: line-through;' : (item.isUnderline ? 'text-decoration: underline;' : (item.isStrike ? 'text-decoration: line-through;' : ''));

          bodyHtml += `
            <div class="check-item ${item.completed ? 'completed' : ''}">
              ${markerHtml}
              <div class="check-text ${item.completed ? 'completed-text' : ''}" style="color: ${itemColor}; ${itemWeight} ${itemStyle} ${itemDeco}">${escapeHtml(item.text)}</div>
            </div>
          `;
        });
        bodyHtml += `</div>`;
      }

      if (!hasText && !hasChecklist) {
        bodyHtml = `<div class="note-body" style="color: #94A3B8; font-style: italic;">(Empty note)</div>`;
      }

      const fontFamilyKey = safeNote.font_family || 'Poppins';
      const bodyFontSize = Number(safeNote.font_size) || 16;
      const titleFontSize = Math.min(Math.round(bodyFontSize * 1.4), 36);

      const fontCssMap = {
        Poppins: "'Poppins', -apple-system, sans-serif",
        Inter: "'Inter', -apple-system, sans-serif",
        Outfit: "'Outfit', -apple-system, sans-serif",
        Lora: "'Lora', Georgia, serif",
        Playfair: "'Playfair Display', Didot, serif",
        JetBrainsMono: "'JetBrains Mono', Consolas, Monaco, monospace",
        Caveat: "'Caveat', cursive, sans-serif",
      };
      const chosenFontFamily = fontCssMap[fontFamilyKey] || "'Poppins', -apple-system, sans-serif";

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${escapeHtml(title)}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;600&family=Lora:wght@400;600&family=Outfit:wght@400;600&family=Playfair+Display:wght@400;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: ${chosenFontFamily}; color: #1C1C28; background: #FFFFFF; padding: 36px; margin: 0; line-height: 1.6; }
            .header { border-bottom: 2px solid #F0F1F5; padding-bottom: 18px; margin-bottom: 24px; }
            .folder-badge { display: inline-block; background: #EEF2FF; color: #2563EB; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; font-family: -apple-system, sans-serif; }
            h1 { font-size: ${titleFontSize}px; font-weight: 800; color: #0F172A; margin: 0 0 8px 0; font-family: ${chosenFontFamily}; }
            .meta { font-size: 12px; color: #64748B; font-family: -apple-system, sans-serif; }
            .tags-wrap { margin-top: 8px; }
            .tag { display: inline-block; background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; margin-right: 6px; font-family: -apple-system, sans-serif; }
            .note-body { font-size: ${bodyFontSize}px; color: #334155; white-space: pre-wrap; line-height: 1.7; font-family: ${chosenFontFamily}; }
            .section-divider { margin: 24px 0 16px 0; border-top: 1px dashed #CBD5E1; }
            .section-title { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.6px; margin: 0 0 12px 0; font-family: -apple-system, sans-serif; }
            .checklist-wrap { display: flex; flex-direction: column; gap: 10px; }
            .check-item { display: flex; align-items: center; gap: 12px; font-size: ${bodyFontSize}px; color: #1E293B; font-family: ${chosenFontFamily}; }
            .check-item.completed .check-text, .completed-text { text-decoration: line-through; color: #94A3B8; }
            .checkbox { width: 18px; height: 18px; border: 2px solid #CBD5E1; border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #FFFFFF; background: #FFFFFF; }
            .check-item.completed .checkbox { background: #10B981; border-color: #10B981; }
            .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #94A3B8; text-align: center; font-family: -apple-system, sans-serif; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="folder-badge">${escapeHtml(folder)}</div>
            <h1>${escapeHtml(title)}</h1>
            <div class="meta"><span>📅 ${dateStr}</span></div>
            ${tags.length > 0 ? `<div class="tags-wrap">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
          </div>
          ${bodyHtml}
          <div class="footer">Exported from Notes • VJ Builds</div>
        </body>
        </html>
      `;

      // Use base64: true to receive the PDF stream directly in memory
      const result = await Print.printToFileAsync({ html, base64: true });
      if (result?.base64) {
        const pdfBytes = base64ToUint8Array(result.base64);
        savedDir = await saveFileToDirectory(fileName, 'application/pdf', pdfBytes);
      }
    } catch (printErr) {
      console.warn('PrintToFileAsync failed, falling back to pure JS PDF stream:', printErr);
    }

    // 2. Fallback to offline pure JS PDF builder if printToFileAsync failed or wasn't saved
    if (!savedDir) {
      const fallbackPdf = buildPureJsPdf(safeNote, dateStr);
      savedDir = await saveFileToDirectory(fileName, 'application/pdf', fallbackPdf);
    }

    if (savedDir) {
      Alert.alert(
        'Download Complete 📥',
        `PDF document successfully saved to ${savedDir.name || 'Downloads'}!\n\nFile: ${fileName}`
      );
      return true;
    }

    // iOS fallback
    if (Platform.OS === 'ios') {
      const fallbackPdf = buildPureJsPdf(safeNote, dateStr);
      const cachePdf = new File(Paths.cache, fileName);
      cachePdf.write(fallbackPdf);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(cachePdf.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save PDF: ${title}`,
          UTI: 'com.adobe.pdf',
        });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error downloading PDF note:', error);
    Alert.alert('Download Error', 'Failed to save PDF: ' + (error?.message || error));
    return false;
  }
};

/**
 * 3. Download note as a PNG image directly into phone's Downloads folder
 */
export const exportNoteAsImage = async (viewRef, noteTitle = 'Note') => {
  try {
    if (!viewRef || !viewRef.current) {
      Alert.alert('Notice', 'Card view is not ready for image capture.');
      return false;
    }

    const sanitizedTitle = (noteTitle || 'Note')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30) || 'Note';
    const fileName = `${sanitizedTitle}_${Date.now()}.png`;

    // Use result: 'base64' to get image directly in memory without file system permission checks
    const base64Data = await captureRef(viewRef, {
      format: 'png',
      quality: 1.0,
      result: 'base64',
    });

    if (base64Data) {
      const imgBytes = base64ToUint8Array(base64Data);
      const savedDir = await saveFileToDirectory(fileName, 'image/png', imgBytes);
      if (savedDir) {
        Alert.alert(
          'Download Complete 📥',
          `Image note successfully saved to ${savedDir.name || 'Downloads'}!\n\nFile: ${fileName}`
        );
        return true;
      }
    }

    // iOS fallback
    if (Platform.OS === 'ios') {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Save Image: ${noteTitle}`,
          UTI: 'public.png',
        });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error saving image of note:', error);
    Alert.alert('Download Error', 'Failed to save image: ' + (error?.message || error));
    return false;
  }
};

const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * PDF Text escaping for raw PDF 1.4 streams
 */
const escapePdfText = (str) => {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
};

/**
 * Text wrapper to wrap text lines for PDF canvas rendering
 */
const wrapText = (text, maxChars = 75) => {
  if (!text) return [];
  const lines = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      lines.push(para);
    } else {
      const words = para.split(' ');
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxChars) {
          lines.push(cur);
          cur = w;
        } else {
          cur = cur ? cur + ' ' + w : w;
        }
      }
      if (cur) lines.push(cur);
    }
  }
  return lines;
};

/**
 * Pure JavaScript standard PDF 1.4 generator.
 * Seamlessly includes BOTH Text Note content AND Checklist items if both exist.
 */
const buildPureJsPdf = (note, dateStr) => {
  const title = note?.title || 'Untitled Note';
  const folder = note?.folder || 'General';
  const tags = Array.isArray(note?.tags) && note.tags.length > 0 ? note.tags.join(', ') : '';

  const bodyLines = [];
  const hasText = !!(note?.content && note.content.trim());
  const hasChecklist = Array.isArray(note?.checklist_data) && note.checklist_data.length > 0;

  if (hasText) {
    bodyLines.push(...wrapText(stripRichTags(note.content.trim()), 72));
  }

  if (hasChecklist) {
    if (hasText) {
      bodyLines.push('');
      bodyLines.push('--- Checklist ---');
    }
    const cStyle = note?.checklist_style || 'checkbox';
    note.checklist_data.forEach((item, idx) => {
      let mark = item.completed ? '[X]' : '[ ]';
      if (cStyle === 'bullet') mark = '•';
      else if (cStyle === 'number') mark = `${idx + 1}.`;
      else if (cStyle === 'star') mark = item.completed ? '★' : '☆';
      else if (cStyle === 'arrow') mark = '➢';
      else if (cStyle === 'roman') mark = `${getRomanNumeral(idx + 1)}.`;
      else if (cStyle === 'check') mark = '✓';
      const wrapped = wrapText(`${mark} ${item.text}`, 70);
      bodyLines.push(...wrapped);
    });
  }

  if (!hasText && !hasChecklist) {
    bodyLines.push('(Empty note)');
  }

  // Build PDF stream commands
  let streamContent = 'BT\n';
  streamContent += '/F1 18 Tf\n50 750 Td\n(' + escapePdfText(title) + ') Tj\n';
  streamContent += '/F2 10 Tf\n0 -22 Td\n(Folder: ' + escapePdfText(folder) + '   |   Date: ' + escapePdfText(dateStr) + ') Tj\n';
  if (tags) {
    streamContent += '0 -16 Td\n(Tags: ' + escapePdfText(tags) + ') Tj\n';
  }
  streamContent += '0 -16 Td\n(----------------------------------------------------------------------------------) Tj\n';
  streamContent += '/F2 11 Tf\n';

  let yOffset = -22;
  const maxLines = Math.min(bodyLines.length, 36);
  for (let i = 0; i < maxLines; i++) {
    streamContent += '0 ' + yOffset + ' Td\n(' + escapePdfText(bodyLines[i]) + ') Tj\n';
    yOffset = -18;
  }
  if (bodyLines.length > 36) {
    streamContent += '0 ' + yOffset + ' Td\n(... [continued]) Tj\n';
  }

  streamContent += '0 -30 Td\n/F2 9 Tf\n(Exported from Notes - VJ Builds) Tj\n';
  streamContent += 'ET\n';

  // Calculate byte length
  let streamLen = 0;
  for (let i = 0; i < streamContent.length; i++) {
    const code = streamContent.charCodeAt(i);
    streamLen += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : 3;
  }

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  const addObj = (objStr) => {
    offsets.push(pdf.length);
    pdf += objStr + '\n';
  };

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj');
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj('6 0 obj\n<< /Length ' + streamLen + ' >>\nstream\n' + streamContent + 'endstream\nendobj');

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 7\n';
  pdf += '0000000000 65535 f \n';
  for (let i = 0; i < 6; i++) {
    pdf += offsets[i].toString().padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
  return pdf;
};
