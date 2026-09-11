# Known Concerns, Gotchas & Historical Pitfalls

## 1. Native Audio Module Incompatibility (`expo-av`)
- **Issue**: In Expo SDK 57 / React Native 0.86, `expo-av` 16.0.8 caused native initialization crashes on standalone Android release builds (`com.facebook.react.common.JavascriptException`).
- **Solution**: Completely uninstalled `expo-av`. In `src/utils/sounds.js`, sound effects were replaced with safe no-ops that do not call any native audio bindings.
- **Rule**: Do NOT re-install `expo-av` unless an officially certified SDK 57 release is verified.

## 2. Standalone APK Size Bloating
- **Issue**: APK size jumped from ~33MB to ~42MB due to universal multi-ABI packaging (4 CPU architectures) combined with disabled R8 minification and bulk font imports.
- **Solution**:
  - Pinned `arm64-v8a` release target in `eas.json` under `preview` profile.
  - Enabled R8 minification and resource shrinking with strict ProGuard keep rules in `app.json`.
  - Tree-shook Poppins fonts in `App.js` to only include the 4 weights used by the app.
- **Target**: Maintain release APK size below 30MB (~20MB–25MB).

## 3. Keyboard Visibility on Static Form Screens
- **Issue**: In `AddExpenseScreen`, using a scrollable container ruined the compact dashboard UX, but static layouts risked hiding the "Save Expense" button behind the Android soft keyboard.
- **Solution**: Dynamic keyboard offset calculation (`offset = Platform.OS === 'android' ? 55 : 16`) based on native keyboard events, ensuring the button stays 100% visible while preserving the static layout.

## 4. Supabase Schema Alignment
- **Issue**: The `monthly_budget` column was removed from the remote `user_sync_data` Supabase table. Attempting to query or write to it causes Postgres error `PGRST204` / column not found.
- **Solution**: `monthly_budget` is managed in local SQLite (`budget_settings` table) and excluded from the Supabase sync payload.

## 5. Offline User Linking
- **Issue**: An offline user who later creates a Supabase account with the same email could have had their local data orphaned or overwritten.
- **Solution**:
  - `RegisterScreen.js` allows online registration even if the email exists locally.
  - `AuthContext.js` links the local account and triggers an initial upload (`syncUp`) to seed the cloud.
  - `syncManager.js` handles `No cloud data to sync` by uploading local records.
