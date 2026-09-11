# System Architecture

## Architecture Overview

ExpenseIQ follows an **Offline-First, Cloud-Synced Architecture**. The local SQLite database serves as the immediate source of truth for all reads and writes, ensuring zero network latency and full offline operation. When network connectivity is available, the synchronization engine syncs changes bi-directionally with Supabase.

```
┌─────────────────────────────────────────────────────────────────┐
│                           UI Layer                              │
│  Screens (Dashboard, AddExpense, Reports, Analytics, Settings)  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    State & Context Layer                        │
│   AuthContext   │   ThemeContext   │   NotificationContext      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                     Data Access Layer                           │
│           src/db/queries.js (SQLite DB Operations)              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────┐
    │  Local SQLite DB     │        │   Sync Manager       │
    │  (expo-sqlite)       │◄───────┤ (syncManager.js)     │
    │  Immediate Storage   │        └──────────┬───────────┘
    └──────────────────────┘                   │
                                               ▼
                                    ┌──────────────────────┐
                                    │ Supabase Cloud DB    │
                                    │ (Postgres / Auth)    │
                                    └──────────────────────┘
```

## Core Architectural Pillars

### 1. Offline-First State & Synchronization
- **Immediate Local Writes**: All actions (adding expenses, editing categories, updating payment methods) write directly to the local SQLite database. The UI updates instantaneously.
- **Sync Flags**: Records have sync status tracking to detect changes.
- **Cloud Seeding**: If an existing offline user links an online account, the local SQLite database is read and automatically seeded to Supabase so offline historical data is never lost.
- **Case-Insensitive Matching**: User queries use `LOWER(TRIM(email))` to prevent authentication and synchronization mismatches.

### 2. Authentication Flow
- **Dual Support**:
  - Local SQLite user accounts for pure offline usage.
  - Cloud Supabase accounts with session tokens stored in `AsyncStorage`.
- **Offline-to-Online Transition**:
  - Users created offline can register online with the same email.
  - `AuthContext` detects the existing local account, updates the local record with the Supabase `user_id`, and initiates a background cloud push.

### 3. Navigation Architecture
- **Root Container**: Managed in `src/navigation/AppNavigator.js`.
- **Structure**:
  - **AuthStack**: `LoginScreen`, `RegisterScreen`.
  - **MainTabs**: `DashboardScreen`, `TransactionsListScreen`, `AddExpenseScreen`, `ReportsScreen`, `MenuScreen`.
  - **Secondary Screens (Stack)**: `BudgetOverviewScreen`, `BudgetSettingsScreen`, `CategoryManagementScreen`, `PaymentMethodsScreen`, `AnalyticsScreen`, `CalendarScreen`, `NotificationsScreen`.
- **Keyboard Handling**:
  - Critical screens (like `AddExpenseScreen`) maintain a static, non-scrollable layout with dynamic keyboard offset calculation on Android to keep the primary CTA visible above the keyboard without shifting the rest of the form.

### 4. Theme & Styling System
- **Centralized Tokens**: Defined in `src/constants/theme.js` with comprehensive color palettes (primary sunset gradients, semantic green/red, dark mode backgrounds `#0F0F1A`, surface card fills).
- **ThemeContext**: Dynamic switching between dark and light themes with persistence in `AsyncStorage`.
