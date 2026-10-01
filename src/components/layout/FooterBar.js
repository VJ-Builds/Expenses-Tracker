import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useBottomSpace, SCREEN_H_PADDING, FAB_GAP } from '../../constants/layout';

// ──────────────────────────────────────────────────────────────
// FooterBar
// ──────────────────────────────────────────────────────────────
// A bottom-anchored action bar for primary buttons (e.g. "Save Expense").
// It always keeps a safe gap above the system navigation bar on every
// device / navigation style, and reports the height it reserves via the
// matching useBottomSpace() so scroll content can pad itself and never be
// hidden behind the bar.
//
// Pattern (guarantees no overlap on any screen size):
//   const footerPad = useBottomSpace({ extra: FOOTER_BTN_HEIGHT + 32 });
//   <ScrollView contentContainerStyle={{ paddingBottom: footerPad }} .../>
//   <FooterBar><PrimaryButton/></FooterBar>
//
//   tabBar      → true if the footer sits on a screen inside MainTabs.
//   absolute    → when true (default) the bar floats over content; when false
//                 it participates in normal flow at the bottom of a column.
//   bottomExtra → extra gap added above the safe inset.
// ──────────────────────────────────────────────────────────────
export default function FooterBar({
  children,
  style,
  tabBar = false,
  absolute = true,
  bottomExtra = FAB_GAP,
  horizontalPadding = SCREEN_H_PADDING,
}) {
  const bottom = useBottomSpace({ tabBar, extra: bottomExtra });

  return (
    <View
      style={[
        styles.bar,
        absolute ? styles.absolute : null,
        { paddingBottom: bottom, paddingHorizontal: horizontalPadding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 10,
  },
  absolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
