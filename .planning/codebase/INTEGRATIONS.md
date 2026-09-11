# External Integrations & Services

## 1. Supabase Cloud Backend

- **Configuration**: Initialized in `src/config/supabase.js` using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **Authentication**:
  - Cloud email/password auth using `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
  - Session tokens persisted locally via `@react-native-async-storage/async-storage`.
- **Database Tables**:
  - `user_sync_data`: Stores sync payloads and metadata per user.
    - Fields: `user_id`, `email`, `last_synced_at`, `expenses_payload`, `categories_payload`, `payment_methods_payload`.
    - Note: Legacy `monthly_budget` column has been deprecated and removed.
- **Synchronization Engine (`src/utils/syncManager.js`)**:
  - Bi-directional sync with conflict resolution.
  - Automatic detection of `No cloud data to sync` to seed the cloud from existing local SQLite data during first online transition.
  - Case-insensitive email matching (`LOWER(TRIM(email))`).

## 2. Local Database (`expo-sqlite`)

- **Configuration**: Defined in `src/db/schema.js` and queried via `src/db/queries.js`.
- **Database Name**: `expenses.db`.
- **Tables**:
  - `users`: Local user credentials and profile records.
  - `expenses`: Expense records with fields: `id`, `user_id`, `amount`, `category`, `payment_method`, `date`, `description`, `created_at`, `synced`.
  - `categories`: Custom categories with name, icon, color, and user linkage.
  - `payment_methods`: Custom payment methods with order/priority.
  - `budget_settings`: Monthly budgets and warning thresholds.
- **FTS5 Integration**: Full-text search enabled via `app.json` plugin config for fast search across transaction descriptions.

## 3. Network Detection (`@react-native-community/netinfo`)

- Listens for internet reachability changes in real time.
- Triggers background sync when returning online.
- Provides status indicators in UI (e.g. offline banner, sync status).

## 4. Native Device File System & Sharing

- `expo-file-system`: Writes CSV exports to cache/document directories.
- `expo-sharing`: Opens native Android share sheet to export data to WhatsApp, Google Drive, Email, etc.
- `expo-document-picker`: Selects JSON/DB backup files for offline data restore.
