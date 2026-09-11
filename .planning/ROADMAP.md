# Project Roadmap: ExpenseIQ

## Milestone 1.0: Core Offline-First Personal Finance Tracker (Completed)
- **Phase 1: Architecture & Data Layer** `[COMPLETED]`
  - SQLite schema creation, migrations, and parameterized query layer.
  - Supabase client integration, auth state management, and bi-directional sync manager.
- **Phase 2: Core Screens & Navigation** `[COMPLETED]`
  - Dashboard with summary metrics and recent transaction list.
  - Transactions list with filtering, searching, and bottom-sheet controls.
  - Add Expense screen with static layout and dynamic keyboard offset handling.
- **Phase 3: Customization & Data Management** `[COMPLETED]`
  - Category management screen with custom color/icon creation.
  - Payment method management with order priority and dynamic default selection.
  - CSV export and local JSON backup/restore.
- **Phase 4: Release Hardening & APK Optimization** `[COMPLETED]`
  - Standalone release APK crash resolution (removed legacy `expo-av`, initialized gesture handler).
  - APK size reduction (<30MB) via single-architecture `arm64-v8a` target, font tree-shaking, and R8 shrinking.

- **Phase 5: Budget Screen & Navigation Polish** `[COMPLETED]`
  - Replace legacy DropDownPicker on Budget screen with modern Dashboard-style floating pill dropdown.
  - Reset Budget screen to current month automatically on screen focus/switch.
  - Eliminate bottom tab navigation lag and remove Android dark grey ripple circle artifact.

## Milestone 1.1: Future Enhancements (Backlog)
- **Phase 6: Recurring Transactions & Subscriptions** `[PLANNED]`
  - Auto-scheduling recurring expenses (rent, utilities, subscriptions).
- **Phase 7: Multi-Currency & Conversion** `[PLANNED]`
  - Support for multiple currencies with offline caching of exchange rates.
- **Phase 8: Receipt Scanning (OCR)** `[PLANNED]`
  - Camera integration and on-device text recognition to automatically parse expense amounts and dates.
