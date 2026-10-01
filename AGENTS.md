# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Layout & safe-area rules (MUST follow for every screen)

Devices differ in screen size AND in system navigation style (3-button nav vs
gesture/swipe nav). The bottom safe-area inset is small/zero on button nav and
large on gesture nav. NEVER hardcode per-platform spacing like
`bottom: Platform.OS === 'android' ? 24 : 36` or `paddingBottom: 100` — it
misaligns buttons/cards/FABs across devices. Always derive spacing from the
central system in `src/constants/layout.js`.

Rules:
- Top safe area: `const insets = useSafeInsets();` then `paddingTop: insets.top`
  (or wrap the screen in `components/layout/ScreenContainer`). `useSafeInsets`
  already applies the Android status-bar minimum.
- Bottom spacing for scroll/list content, FABs and footers:
  `useBottomSpace({ tabBar, extra })`.
    - `tabBar: true`  → screens INSIDE the bottom-tab navigator (Dashboard,
      Transactions, Budget, Reports). Clears the app tab bar + system nav bar.
    - `tabBar: false` → stack/modal screens (Notes, Games, AddExpense, modals).
      Clears only the system nav bar.
  Apply it to `contentContainerStyle={[base, { paddingBottom: pad }]}`.
- Floating action buttons: use `components/layout/Fab` (never a hand-positioned
  absolute `bottom`).
- Bottom-anchored primary buttons / action bars: use `components/layout/FooterBar`,
  and pad the scroll content by the matching `useBottomSpace(...)` so content
  always scrolls clear of the button on small screens.
- Bottom-sheet / bottom-aligned modals: add `insets.bottom` to the sheet's
  bottom padding so content clears the gesture-nav home indicator.
- The bottom tab bar height lives in `getTabBarHeight`/`getTabBarBottomPadding`
  (layout.js) and is consumed by both AppNavigator and `useBottomSpace` — keep
  them in sync there, not per-screen.
