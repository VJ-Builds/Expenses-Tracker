# Project State & Memory: ExpenseIQ

## Current Status
- **Milestone**: 1.0 (Core Feature Complete & Release Hardened)
- **Active Focus**: Milestone 1.0 complete with Phase 5 UI/UX Polish.
- **Git Branch**: `Feature_vijay`

## Key Decisions & Architecture Log
- **Offline-First Storage**: Local SQLite is the immediate source of truth. Writes never wait for network calls.
- **Dynamic Payment Default**: `AddExpenseScreen` queries the user's custom payment method list ordered by priority, selecting the 1st method as default.
- **Static Add Expense Layout**: Avoided wrapping in `ScrollView`; calculated Android keyboard offset (`55px`) dynamically to keep the "Save Expense" button fully visible.
- **Native Audio Removed**: Dropped `expo-av` due to SDK 57 crash; replaced with safe no-op functions in `src/utils/sounds.js`.
- **Target Single Architecture**: Pinned `arm64-v8a` in `eas.json` to keep release APK size under ~24MB.
- **Modern Dropdown Consistency**: Replaced legacy `DropDownPicker` in `BudgetOverviewScreen.js` with modern gradient pill button and floating modal menu matching `DashboardScreen.js`.
- **Budget Auto-Reset**: Added `setSelectedMonth(currentMonthKey())` in `useFocusEffect` so returning to Budget screen resets view to the current month.
- **Tab Navigation Performance**: Configured `tabBarButton` with `TouchableOpacity` (`delayPressIn: 0`, `activeOpacity: 0.7`) and `detachInactiveScreens: false` in `AppNavigator.js` to eliminate switching delay and remove Android dark grey ripple circles.

## Verification Status
- `npx expo-doctor`: 21/21 checks passed.
- `npx expo export --platform android`: Clean compilation, 47 assets.
- Codebase Map: All 7 documents up-to-date under `.planning/codebase/`.
