import React from 'react';
import { Text } from 'react-native';

/**
 * Rich Text Parser & Formatter for Notes App
 * Supports: Bold (**), Italic (*), Underline (<u>), Strikethrough (~~),
 * Font Size (<size=XX>), and Ink/Font Color (<color=#HEX>).
 */

/**
 * Wrap or toggle tags around a selected text range
 */
export const applyRichFormatToSelection = (fullText, selection, formatType, formatValue) => {
  const text = fullText || '';
  const { start, end } = selection || { start: 0, end: 0 };
  const min = Math.min(start, end);
  const max = Math.max(start, end);

  if (min === max) {
    // No text selected: insert sample placeholder or empty tags
    let openTag = '';
    let closeTag = '';
    let placeholder = 'text';

    switch (formatType) {
      case 'bold':
        openTag = '**';
        closeTag = '**';
        placeholder = 'bold';
        break;
      case 'italic':
        openTag = '*';
        closeTag = '*';
        placeholder = 'italic';
        break;
      case 'underline':
        openTag = '<u>';
        closeTag = '</u>';
        placeholder = 'underline';
        break;
      case 'strike':
        openTag = '~~';
        closeTag = '~~';
        placeholder = 'strikeout';
        break;
      case 'color':
        openTag = `<color=${formatValue}>`;
        closeTag = '</color>';
        placeholder = 'colored text';
        break;
      case 'size':
        openTag = `<size=${formatValue}>`;
        closeTag = '</size>';
        placeholder = 'sized text';
        break;
      default:
        return { newText: text, newSelection: selection };
    }

    const insertion = `${openTag}${placeholder}${closeTag}`;
    const newText = text.slice(0, min) + insertion + text.slice(min);
    const newSelection = {
      start: min + openTag.length,
      end: min + openTag.length + placeholder.length,
    };
    return { newText, newSelection };
  }

  // Text is selected: wrap the selected text
  const selectedContent = text.slice(min, max);
  let openTag = '';
  let closeTag = '';

  switch (formatType) {
    case 'bold':
      openTag = '**';
      closeTag = '**';
      break;
    case 'italic':
      openTag = '*';
      closeTag = '*';
      break;
    case 'underline':
      openTag = '<u>';
      closeTag = '</u>';
      break;
    case 'strike':
      openTag = '~~';
      closeTag = '~~';
      break;
    case 'color':
      openTag = `<color=${formatValue}>`;
      closeTag = '</color>';
      break;
    case 'size':
      openTag = `<size=${formatValue}>`;
      closeTag = '</size>';
      break;
    default:
      return { newText: text, newSelection: selection };
  }

  // Check if selection is already wrapped with this exact tag (Toggle OFF)
  if (
    selectedContent.startsWith(openTag) &&
    selectedContent.endsWith(closeTag) &&
    selectedContent.length >= openTag.length + closeTag.length
  ) {
    const unwrapped = selectedContent.slice(
      openTag.length,
      selectedContent.length - closeTag.length
    );
    const newText = text.slice(0, min) + unwrapped + text.slice(max);
    return {
      newText,
      newSelection: { start: min, end: min + unwrapped.length },
    };
  }

  // Wrap selection (Toggle ON)
  const wrapped = `${openTag}${selectedContent}${closeTag}`;
  const newText = text.slice(0, min) + wrapped + text.slice(max);
  return {
    newText,
    newSelection: { start: min, end: min + wrapped.length },
  };
};

const resolveTextDecoration = (existingDeco, hasUnderline, hasStrike) => {
  const isUnderline = Boolean(hasUnderline || (existingDeco && existingDeco.includes('underline')));
  const isStrike = Boolean(hasStrike || (existingDeco && existingDeco.includes('line-through')));
  if (isUnderline && isStrike) return 'underline line-through';
  if (isUnderline) return 'underline';
  if (isStrike) return 'line-through';
  return existingDeco || undefined;
};

/**
 * Parses rich string (HTML or custom tags) into React Native <Text> nodes with proper styles
 */
export const renderRichTextNodes = (rawText, baseStyle = {}, keyPrefix = 'rt') => {
  if (!rawText) return null;

  // Normalize legacy markdown and HTML variants for unified parsing
  let normalized = rawText
    .replace(/<font\b[^>]*color="([^"]+)"[^>]*>(.*?)<\/font>/gis, '<span style="color: $1">$2</span>')
    .replace(/<color=([^>]+)>(.*?)<\/color>/gis, '<span style="color: $1">$2</span>')
    .replace(/<size=([^>]+)>(.*?)<\/size>/gis, '<span style="font-size: $1px">$2</span>')
    .replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>')
    .replace(/\*(.*?)\*/gs, '<i>$1</i>')
    .replace(/~~(.*?)~~/gs, '<del>$1</del>')
    .replace(/<strike\b[^>]*>(.*?)<\/strike>/gis, '<del>$1</del>')
    .replace(/<s\b[^>]*>(.*?)<\/s>/gis, '<del>$1</del>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n');

  // Match HTML tags: <b>, <strong>, <i>, <em>, <u>, <del>, <s>, <strike>, <span style="...">
  const pattern = /(<b\b[^>]*>.*?<\/b>|<strong\b[^>]*>.*?<\/strong>|<i\b[^>]*>.*?<\/i>|<em\b[^>]*>.*?<\/em>|<u\b[^>]*>.*?<\/u>|<del\b[^>]*>.*?<\/del>|<s\b[^>]*>.*?<\/s>|<strike\b[^>]*>.*?<\/strike>|<span\b[^>]*>.*?<\/span>)/gis;

  const parts = normalized.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;
    const key = `${keyPrefix}_${index}`;

    // 1. Span with style (color, font-size, text-decoration/strike, bold, italic)
    const spanMatch = part.match(/^<span\b[^>]*style="([^"]*)"[^>]*>(.*?)<\/span>$/is);
    if (spanMatch) {
      const styleStr = spanMatch[1] || '';
      const inner = spanMatch[2];
      const spanStyle = { ...baseStyle };

      const colorMatch = styleStr.match(/color:\s*([^;]+)/i);
      if (colorMatch) spanStyle.color = colorMatch[1].trim();

      const sizeMatch = styleStr.match(/font-size:\s*([0-9.]+)px/i);
      if (sizeMatch) {
        const sz = Number(sizeMatch[1]);
        spanStyle.fontSize = sz;
        spanStyle.lineHeight = Math.round(sz * 1.5);
      }

      const hasUnderline = /underline/i.test(styleStr);
      const hasStrike = /line-through/i.test(styleStr);
      const deco = resolveTextDecoration(baseStyle.textDecorationLine, hasUnderline, hasStrike);
      if (deco) spanStyle.textDecorationLine = deco;

      if (/font-weight:\s*(bold|[6-9]00)/i.test(styleStr)) {
        spanStyle.fontWeight = '700';
      }
      if (/font-style:\s*italic/i.test(styleStr)) {
        spanStyle.fontStyle = 'italic';
      }

      return (
        <Text key={key} style={spanStyle}>
          {renderRichTextNodes(inner, spanStyle, `${key}_sp`)}
        </Text>
      );
    }

    // 2. Bold: <b> or <strong>
    const boldMatch = part.match(/^<(b|strong)\b[^>]*>(.*?)<\/\1>$/is);
    if (boldMatch) {
      const inner = boldMatch[2];
      const boldStyle = { ...baseStyle, fontWeight: '700' };
      return (
        <Text key={key} style={boldStyle}>
          {renderRichTextNodes(inner, boldStyle, `${key}_b`)}
        </Text>
      );
    }

    // 3. Italic: <i> or <em>
    const italicMatch = part.match(/^<(i|em)\b[^>]*>(.*?)<\/\1>$/is);
    if (italicMatch) {
      const inner = italicMatch[2];
      const italicStyle = { ...baseStyle, fontStyle: 'italic' };
      return (
        <Text key={key} style={italicStyle}>
          {renderRichTextNodes(inner, italicStyle, `${key}_i`)}
        </Text>
      );
    }

    // 4. Underline: <u>
    const underlineMatch = part.match(/^<u\b[^>]*>(.*?)<\/u>$/is);
    if (underlineMatch) {
      const inner = underlineMatch[1];
      const deco = resolveTextDecoration(baseStyle.textDecorationLine, true, false);
      const uStyle = { ...baseStyle, textDecorationLine: deco };
      return (
        <Text key={key} style={uStyle}>
          {renderRichTextNodes(inner, uStyle, `${key}_u`)}
        </Text>
      );
    }

    // 5. Strikethrough: <del>, <s>, or <strike>
    const strikeMatch = part.match(/^<(del|s|strike)\b[^>]*>(.*?)<\/\1>$/is);
    if (strikeMatch) {
      const inner = strikeMatch[2];
      const deco = resolveTextDecoration(baseStyle.textDecorationLine, false, true);
      const stStyle = { ...baseStyle, textDecorationLine: deco };
      return (
        <Text key={key} style={stStyle}>
          {renderRichTextNodes(inner, stStyle, `${key}_st`)}
        </Text>
      );
    }

    // Plain text chunk (strip any remaining outer tags like <div> or <p>)
    const cleanText = part
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");

    return (
      <Text key={key} style={baseStyle}>
        {cleanText}
      </Text>
    );
  });
};

/**
 * Convert rich tags to standard HTML for PDF export or webview
 */
export const convertRichTextToHtml = (rawText) => {
  if (!rawText) return '';
  let html = rawText;

  // Convert custom tags <color=...> and <size=...>
  html = html
    .replace(/<color=([^>]+)>(.*?)<\/color>/gis, '<span style="color: $1">$2</span>')
    .replace(/<size=([^>]+)>(.*?)<\/size>/gis, '<span style="font-size: $1px">$2</span>');

  // Convert legacy markdown tags: bold, italic, strikethrough
  html = html
    .replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>')
    .replace(/\*(.*?)\*/gs, '<i>$1</i>')
    .replace(/~~(.*?)~~/gs, '<del>$1</del>');

  // If there are raw newlines and no HTML break tags, convert newlines to <br/>
  if (!/<(br|p|div)\b/i.test(html)) {
    html = html.replace(/\n/g, '<br/>');
  }

  return html;
};

/**
 * Strip all rich tags (both HTML and markdown) for plain text export
 */
export const stripRichTags = (rawText) => {
  if (!rawText) return '';
  return rawText
    .replace(/<color=[^>]+>(.*?)<\/color>/gs, '$1')
    .replace(/<size=[^>]+>(.*?)<\/size>/gs, '$1')
    .replace(/<u>(.*?)<\/u>/gs, '$1')
    .replace(/~~(.*?)~~/gs, '$1')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
};
