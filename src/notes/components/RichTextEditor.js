import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const FONT_CSS_MAP = {
  Poppins: "'Poppins', sans-serif",
  Inter: "'Inter', sans-serif",
  Outfit: "'Outfit', sans-serif",
  Lora: "'Lora', Georgia, serif",
  Playfair: "'Playfair Display', Didot, serif",
  JetBrainsMono: "'JetBrains Mono', Consolas, Monaco, monospace",
  Caveat: "'Caveat', cursive, sans-serif",
};

function generateEditorHtml({
  initialHtml = '',
  chosenFontFamily = "'Poppins', sans-serif",
  fontSize = 16,
  textAlign = 'left',
  minHeight = 280,
  placeholder = 'Start typing your thoughts, notes, ideas...',
}) {
  const serializedInit = JSON.stringify({ html: initialHtml || '' });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Lora:wght@400;600&family=Outfit:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: transparent;
      width: 100%;
      min-height: 100%;
      overflow-x: hidden;
    }
    #editor {
      min-height: ${minHeight}px;
      padding: 4px 0 24px 0;
      font-family: ${chosenFontFamily};
      font-size: ${fontSize}px;
      color: #0F172A;
      line-height: 1.6;
      outline: none;
      word-wrap: break-word;
      text-align: ${textAlign};
    }
    #editor[contenteditable]:empty:before {
      content: attr(placeholder);
      color: #94A3B8;
      pointer-events: none;
      display: block;
      font-style: normal;
    }
    b, strong { font-weight: 700; }
    i, em { font-style: italic; }
    u { text-decoration: underline; }
    s, strike, del { text-decoration: line-through; }
  </style>
</head>
<body>
  <div
    id="editor"
    contenteditable="true"
    placeholder="${placeholder.replace(/"/g, '&quot;')}"
    spellcheck="false"
    autocapitalize="sentences"
  ></div>

  <script id="init-data" type="application/json">${serializedInit}</script>

  <script>
    (function() {
      var editor = document.getElementById('editor');
      var savedRange = null;

      // Populate initial content safely
      try {
        var raw = document.getElementById('init-data').textContent;
        var parsed = JSON.parse(raw);
        if (parsed.html) {
          editor.innerHTML = parsed.html;
        }
      } catch(e) {}

      function updateSavedSelection() {
        var sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          var range = sel.getRangeAt(0);
          if (editor.contains(range.commonAncestorContainer) || editor === range.commonAncestorContainer) {
            savedRange = range.cloneRange();
          }
        }
      }

      function restoreSelection() {
        editor.focus();
        if (savedRange) {
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(savedRange);
        }
      }

      editor.addEventListener('mouseup', updateSavedSelection);
      editor.addEventListener('touchend', updateSavedSelection);
      editor.addEventListener('keyup', updateSavedSelection);

      // Only save selection when active element is the editor (prevents blur from wiping selection)
      document.addEventListener('selectionchange', function() {
        if (document.activeElement === editor) {
          updateSavedSelection();
        }
      });

      function notifyChange() {
        var html = editor.innerHTML;
        var text = editor.innerText;
        var height = Math.max(document.body.scrollHeight, editor.scrollHeight, ${minHeight});
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CONTENT_CHANGE',
            html: html,
            text: text,
            height: height
          }));
        }
      }

      editor.addEventListener('input', notifyChange);
      editor.addEventListener('paste', function() {
        setTimeout(notifyChange, 20);
      });

      window.executeCommand = function(type, value) {
        restoreSelection();

        if (type === 'bold') {
          document.execCommand('bold', false, null);
        } else if (type === 'italic') {
          document.execCommand('italic', false, null);
        } else if (type === 'underline') {
          document.execCommand('underline', false, null);
        } else if (type === 'strike') {
          document.execCommand('strikeThrough', false, null);
        } else if (type === 'align') {
          if (value === 'center') document.execCommand('justifyCenter', false, null);
          else if (value === 'right') document.execCommand('justifyRight', false, null);
          else document.execCommand('justifyLeft', false, null);
        } else if (type === 'color') {
          try {
            document.execCommand('styleWithCSS', false, true);
          } catch(e) {}
          document.execCommand('foreColor', false, value);
        } else if (type === 'size') {
          var sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            var range = sel.getRangeAt(0);
            var span = document.createElement('span');
            span.style.fontSize = value + 'px';
            span.style.lineHeight = Math.round(value * 1.5) + 'px';
            try {
              span.appendChild(range.extractContents());
              range.insertNode(span);
              sel.removeAllRanges();
              var newRange = document.createRange();
              newRange.selectNodeContents(span);
              sel.addRange(newRange);
              savedRange = newRange.cloneRange();
            } catch(e) {
              document.execCommand('fontSize', false, '3');
            }
          } else {
            editor.style.fontSize = value + 'px';
          }
        }

        updateSavedSelection();
        notifyChange();
      };

      window.setFontFamily = function(fontCss) {
        editor.style.fontFamily = fontCss;
        notifyChange();
      };

      window.setTextAlign = function(align) {
        editor.style.textAlign = align;
        notifyChange();
      };

      window.focusEditor = function() {
        editor.focus();
      };

      // Also listen to postMessage on both window and document as a fallback
      function onMessage(event) {
        try {
          var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.type === 'EXEC_COMMAND') {
            window.executeCommand(data.command, data.value);
          } else if (data.type === 'SET_FONT_FAMILY') {
            window.setFontFamily(data.value);
          } else if (data.type === 'SET_TEXT_ALIGN') {
            window.setTextAlign(data.value);
          } else if (data.type === 'FOCUS') {
            window.focusEditor();
          }
        } catch(e) {}
      }
      window.addEventListener('message', onMessage);
      document.addEventListener('message', onMessage);

      // Notify React Native that webview is ready
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'READY',
          height: Math.max(document.body.scrollHeight, ${minHeight})
        }));
      }
    })();
  </script>
</body>
</html>`;
}

const RichTextEditor = forwardRef(function RichTextEditor(
  {
    initialContent = '',
    fontFamily = 'Poppins',
    fontSize = 16,
    textAlign = 'left',
    inkColor = '#0F172A',
    placeholder = 'Start typing your thoughts, notes, ideas...',
    onChange,
    minHeight = 280,
  },
  ref
) {
  const webViewRef = useRef(null);
  const [editorHeight, setEditorHeight] = useState(minHeight);
  const [isReady, setIsReady] = useState(false);

  const chosenFontFamily = FONT_CSS_MAP[fontFamily] || "'Poppins', sans-serif";

  // Critical: Keep the source object referentially STABLE across re-renders to prevent WebView reloading!
  const htmlSourceRef = useRef(null);
  if (!htmlSourceRef.current) {
    htmlSourceRef.current = {
      html: generateEditorHtml({
        initialHtml: initialContent,
        chosenFontFamily,
        fontSize,
        textAlign,
        minHeight,
        placeholder,
      }),
    };
  }

  useImperativeHandle(ref, () => ({
    applyFormat: (command, value) => {
      if (webViewRef.current) {
        const js = `
          if (window.executeCommand) {
            window.executeCommand(${JSON.stringify(command)}, ${JSON.stringify(value || '')});
          }
          true;
        `;
        webViewRef.current.injectJavaScript(js);
      }
    },
    setFontFamily: (fontId) => {
      const fontCss = FONT_CSS_MAP[fontId] || "'Poppins', sans-serif";
      if (webViewRef.current) {
        const js = `
          if (window.setFontFamily) {
            window.setFontFamily(${JSON.stringify(fontCss)});
          }
          true;
        `;
        webViewRef.current.injectJavaScript(js);
      }
    },
    setTextAlign: (align) => {
      if (webViewRef.current) {
        const js = `
          if (window.setTextAlign) {
            window.setTextAlign(${JSON.stringify(align)});
          }
          true;
        `;
        webViewRef.current.injectJavaScript(js);
      }
    },
    focus: () => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript('if (window.focusEditor) window.focusEditor(); true;');
      }
    },
  }));

  // Update font family dynamically if changed in parent
  useEffect(() => {
    if (isReady && webViewRef.current) {
      const fontCss = FONT_CSS_MAP[fontFamily] || "'Poppins', sans-serif";
      webViewRef.current.injectJavaScript(`
        if (window.setFontFamily) {
          window.setFontFamily(${JSON.stringify(fontCss)});
        }
        true;
      `);
    }
  }, [chosenFontFamily, isReady]);

  // Update text alignment dynamically if changed in parent
  useEffect(() => {
    if (isReady && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.setTextAlign) {
          window.setTextAlign(${JSON.stringify(textAlign)});
        }
        true;
      `);
    }
  }, [textAlign, isReady]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'READY') {
        setIsReady(true);
      } else if (data.type === 'CONTENT_CHANGE') {
        if (data.height && data.height > 0) {
          setEditorHeight(Math.max(minHeight, data.height));
        }
        if (onChange) {
          onChange({
            html: data.html,
            text: data.text,
          });
        }
      } else if (data.type === 'HEIGHT_CHANGE') {
        if (data.height && data.height > 0) {
          setEditorHeight(Math.max(minHeight, data.height));
        }
      }
    } catch (e) {
      console.log('Error parsing editor message:', e);
    }
  };

  return (
    <View style={[styles.container, { minHeight: editorHeight }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={htmlSourceRef.current}
        style={[styles.webView, { height: editorHeight }]}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={true}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        containerStyle={{ backgroundColor: 'transparent' }}
        backgroundColor="transparent"
      />
    </View>
  );
});

export default RichTextEditor;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  webView: {
    backgroundColor: 'transparent',
    width: '100%',
  },
});
