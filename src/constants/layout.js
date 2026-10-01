// ──────────────────────────────────────────────────────────────
// Central layout system
// ──────────────────────────────────────────────────────────────
// Single source of truth for safe-area / navigation-bar spacing.
//
// WHY THIS EXISTS:
//   Phones differ in screen size AND in system navigation style:
//     • 3-button navigation  → small / zero bottom inset
//     • gesture (swipe) nav   → large bottom inset (the home-indicator pill)
//   The ONLY reliable way to stay aligned on every device is to derive
//   spacing from the real safe-area insets (never hardcode per-platform
//   numbers). Every screen should get its top/bottom spacing from the
//   hooks in this file so new screens are automatically consistent.
// ──────────────────────────────────────────────────────────────
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Fixed sizes shared across the app ──────────────────────────
export const TAB_BAR_CONTENT_HEIGHT = 56; // bottom tab bar height, excluding the safe inset
export const FAB_SIZE = 58;               // standard floating action button diameter
export const FAB_GAP = 16;                // gap between a FAB / footer and the screen edge
export const FOOTER_BTN_HEIGHT = 54;      // standard primary action button height
export const SCREEN_H_PADDING = 20;       // standard horizontal screen padding

// Minimum comfortable gap above the very bottom edge, used when the device
// reports a 0 bottom inset (typical on Android 3-button navigation) so
// floating elements never hug the navigation bar.
export const MIN_BOTTOM_GAP = 12;

// Android status bar height fallback for the top inset.
const ANDROID_STATUS_BAR = StatusBar.currentHeight || 24;

// ── Tab bar height helpers (kept in sync with AppNavigator) ─────
export function getTabBarBottomPadding(insets) {
  return insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 4 : 8);
}

export function getTabBarHeight(insets) {
  return TAB_BAR_CONTENT_HEIGHT + getTabBarBottomPadding(insets);
}

// ── Normalized insets ──────────────────────────────────────────
// Returns insets with a sensible Android top minimum (status bar) so
// headers never slip under the status bar on devices that report top: 0.
export function useSafeInsets() {
  const insets = useSafeAreaInsets();
  return {
    top: Math.max(insets.top, Platform.OS === 'android' ? ANDROID_STATUS_BAR : 0),
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    rawTop: insets.top,
    rawBottom: insets.bottom,
  };
}

// ── Bottom spacing ─────────────────────────────────────────────
// The amount of space to reserve at the bottom of a screen so content and
// floating elements clear the system navigation bar (and the app tab bar,
// when the screen lives inside the bottom-tab navigator).
//
// Use for: ScrollView/FlatList contentContainerStyle paddingBottom,
//          floating button bottom offsets, anchored footer padding.
//
//   tabBar  → true for screens rendered inside MainTabs (Dashboard, etc.)
//   extra   → additional fixed spacing on top of the safe gap
export function useBottomSpace({ tabBar = false, extra = 0 } = {}) {
  const insets = useSafeAreaInsets();
  if (tabBar) {
    return getTabBarHeight(insets) + extra;
  }
  return Math.max(insets.bottom, MIN_BOTTOM_GAP) + extra;
}
