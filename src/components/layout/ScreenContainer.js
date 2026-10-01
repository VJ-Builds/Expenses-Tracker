import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeInsets } from '../../constants/layout';

// ──────────────────────────────────────────────────────────────
// ScreenContainer
// ──────────────────────────────────────────────────────────────
// A root wrapper for full-screen views that applies the top safe-area
// inset consistently (so headers never slip under the status bar / notch)
// and lets children own the rest of the layout.
//
// Prefer this over hand-rolling `paddingTop: StatusBar.currentHeight` or
// mixing <SafeAreaView> with manual values.
//
//   edges   → which safe-area edges to pad. Defaults to ['top'].
//             Bottom spacing should be handled per-content via useBottomSpace
//             (so scroll content and floating buttons can share one source).
//   style   → extra container styles (e.g. backgroundColor).
// ──────────────────────────────────────────────────────────────
export default function ScreenContainer({
  children,
  edges = ['top'],
  style,
  backgroundColor,
}) {
  const insets = useSafeInsets();

  const pad = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[styles.root, backgroundColor ? { backgroundColor } : null, pad, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
