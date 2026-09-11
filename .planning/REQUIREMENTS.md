# Project Requirements: ExpenseIQ

## Status Key
- `[x]` Completed & Verified
- `[ ]` Planned / Backlog

## Core System Requirements

### 1. Offline Storage & Cloud Synchronization
- [x] **REQ-1.1**: Immediate local transaction persistence in SQLite via `expo-sqlite`.
- [x] **REQ-1.2**: Bi-directional cloud synchronization with Supabase when online.
- [x] **REQ-1.3**: Automatic local data seeding to cloud when an offline user registers online.
- [x] **REQ-1.4**: Full database backup and restore via `expo-document-picker` and `expo-file-system`.
- [x] **REQ-1.5**: CSV report generation and native sharing via `expo-sharing`.

### 2. Transaction Management & UI
- [x] **REQ-2.1**: Static, non-scrollable Add Expense screen with clean input fields.
- [x] **REQ-2.2**: Android soft keyboard avoidance ensuring the "Save Expense" CTA remains 100% visible.
- [x] **REQ-2.3**: Dynamic default selection of the top-prioritized payment method.
- [x] **REQ-2.4**: Category selection with dynamic list from SQLite.
- [x] **REQ-2.5**: Full-text search and category filtering in transaction list.

### 3. Categories & Payment Methods
- [x] **REQ-3.1**: Custom category CRUD with icon and color customization.
- [x] **REQ-3.2**: Custom payment method CRUD with drag/priority reordering.

### 4. Budgets & Analytics
- [x] **REQ-4.1**: Monthly budget threshold configuration.
- [x] **REQ-4.2**: Visual progress bars and alert notifications when spending reaches threshold.
- [x] **REQ-4.3**: Monthly/Yearly spending charts and breakdowns via `react-native-gifted-charts`.

### 5. Build, Performance & Stability
- [x] **REQ-5.1**: Standalone Android APK builds without runtime native crash (purged incompatible `expo-av`).
- [x] **REQ-5.2**: Release APK size optimized below 30MB (~20MB–24MB) via `arm64-v8a` target and R8 minification.
- [x] **REQ-5.3**: All 21 `npx expo-doctor` checks pass.
