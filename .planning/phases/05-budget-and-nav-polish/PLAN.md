# Phase 5: Budget Screen & Navigation Polish

## Objective
Refactor the Budget Overview screen and Bottom Tab Bar navigation to enhance aesthetic consistency, ensure reliable state resets, and provide instantaneous, smooth tab transitions without visual touch artifacts.

## Tasks

### Task 1: Budget Screen Dropdown Modernization
- **File**: `src/screens/BudgetOverviewScreen.js`
- **Action**:
  - Remove `DropDownPicker` dependency.
  - Implement a sleek pill button (`monthPillButton`) matching `DashboardScreen.js` styling with `ChevronDown`.
  - Add floating modal menu (`monthDropdownMenu`) with gradient background `[BRAND_PURPLE, '#8862F8']`, custom item dividers, and active selection state.
  - Calculate accurate layout coordinates via `measureInWindow` so the dropdown anchors neatly below the pill.

### Task 2: Budget Screen Auto-Reset to Current Month
- **File**: `src/screens/BudgetOverviewScreen.js`
- **Action**:
  - In `useFocusEffect`, automatically reset `selectedMonth` to `currentMonthKey()` whenever the screen gains focus.
  - Dismiss the dropdown menu (`setMonthDropOpen(false)`) on blur/focus.

### Task 3: Bottom Menu Navigation Polish & Lag Removal
- **File**: `src/navigation/AppNavigator.js`
- **Action**:
  - Replace default `TouchableNativeFeedback` with custom `tabBarButton` using `TouchableOpacity` with `delayPressIn={0}` and `activeOpacity={0.7}`.
  - Remove the dark grey circular touch ripple from Android.
  - Clean up icon background highlight (`tabStyles.iconBgActive`) so no unwanted grey/tinted oval or circle appears on selection.
  - Set `lazy: false` and `detachInactiveScreens: false` in `Tab.Navigator` to eliminate tab switching lag and provide instant response.

## Verification Plan
1. Check bundle export with `npx expo export --platform android`.
2. Verify syntax and absence of deprecation warnings.
3. Validate that month resets to current month when switching tabs.
4. Verify smooth bottom tab switching with zero delay and no dark grey ripple circle.
