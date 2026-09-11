# Coding Conventions & Patterns

## 1. Code Architecture & Component Patterns
- **Functional Components**: All screens and presentation components use modern React functional components with hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`).
- **Focus Effects**: Data fetching on screen focus utilizes `useFocusEffect` from `@react-navigation/native` to ensure fresh state when navigating back.
- **Defensive Rendering**: Null and undefined checks before accessing nested properties (e.g. `user?.id`, `rows?.[0]`).

## 2. Styling & Theming Conventions
- **StyleSheet API**: Native styling uses `StyleSheet.create` for optimal performance.
- **Centralized Tokens**: Colors and dimensions are imported from `src/constants/theme.js`. Hardcoded hex colors are discouraged in favor of theme semantic colors (`colors.background`, `colors.surface`, `colors.primary`).
- **Glassmorphism**: Modals and cards utilize `expo-blur` and translucent RGBA backgrounds with subtle 1px border highlights.

## 3. Database Access Conventions (`src/db/queries.js`)
- All database operations are asynchronous and return Promises.
- SQL queries use parameterized arguments (`?`) to prevent SQL injection.
- Case-insensitivity: Email queries and unique lookups must use `LOWER(TRIM(?))` to avoid case-mismatch bugs.
- Changes are flagged with a `synced = 0` status so the sync engine knows which rows to push to the cloud.

## 4. Error Handling & Logging
- **LogBox Configuration**: Deprecation warnings (`SafeAreaView`, `InteractionManager`, `setLayoutAnimationEnabledExperimental`) are filtered in `App.js` to avoid cluttering development consoles.
- **Safe Logger**: `index.js` wraps `console.warn` with a safe JSON serializer to prevent crashing on circular objects.
- **User-Facing Alerts**: Critical errors (e.g. failed sync or invalid credentials) trigger formatted in-app banners or alerts, not silent failures.

## 5. Keyboard Handling Rules
- For static screens (like `AddExpenseScreen`): Do **not** wrap the root layout in a `ScrollView`.
- Use a dynamic bottom offset calculation based on keyboard height listener (`Keyboard.addListener('keyboardDidShow')`) so the primary action button rises cleanly above the keyboard while the form remains static.
