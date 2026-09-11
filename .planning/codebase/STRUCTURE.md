# Codebase Structure

## Directory Layout

```
Expenses-Tracker/
├── assets/                    # Static assets (icons, splash images, audio effects)
│   ├── images/                # Card illustrations, coin icons
│   ├── sounds/                # Coin chime audio effects
│   ├── icon.png               # Main app launcher icon
│   └── splash-icon.png        # Native splash screen icon
├── src/
│   ├── components/            # Reusable UI presentation components
│   │   ├── AnimatedBackground.js  # Floating gradient ambient animation
│   │   ├── AnimatedNumber.js      # Spring counter for numeric balances
│   │   ├── ExpenseCard.js         # Transaction item card with category icon
│   │   ├── FilterBar.js           # Category & date range filtering chips
│   │   ├── SkeletonLoader.js      # Shimmer placeholder loaders
│   │   └── SummaryBanner.js       # Income vs expense aggregate hero banner
│   ├── config/
│   │   └── supabase.js        # Supabase client setup & credential reader
│   ├── constants/
│   │   ├── categories.js      # Default system categories & icons
│   │   └── theme.js           # Global color palette, spacing, typography tokens
│   ├── context/
│   │   ├── AuthContext.js         # Authentication, session, user profile state
│   │   ├── NotificationContext.js # In-app notification queue & badges
│   │   └── ThemeContext.js        # Theme state provider & toggles
│   ├── db/
│   │   ├── queries.js         # High-level SQLite query wrappers
│   │   └── schema.js          # SQLite DDL tables, indexes, and initial migrations
│   ├── navigation/
│   │   └── AppNavigator.js    # Root Stack and Bottom Tab navigation structure
│   ├── screens/               # Application views
│   │   ├── AddExpenseScreen.js        # Add/Edit transaction with keyboard handling
│   │   ├── AnalyticsScreen.js         # Detailed spending analytics & charts
│   │   ├── BudgetOverviewScreen.js    # Category budget tracking & progress bars
│   │   ├── BudgetSettingsScreen.js    # Monthly threshold configuration
│   │   ├── CalendarScreen.js          # Daily transaction calendar view
│   │   ├── CategoryManagementScreen.js # Custom category CRUD
│   │   ├── DashboardScreen.js         # Home screen with metrics & recent list
│   │   ├── LoginScreen.js             # User login
│   │   ├── MenuScreen.js              # Settings, profile, export & sync menu
│   │   ├── NotificationsScreen.js     # Alert center
│   │   ├── PaymentMethodsScreen.js    # Payment method prioritization & management
│   │   ├── RegisterScreen.js          # User registration
│   │   ├── ReportsScreen.js           # Monthly/yearly pie & line chart reports
│   │   └── TransactionsListScreen.js  # Searchable & filterable transaction list
│   └── utils/
│       ├── authHelpers.js     # Credential validation & password hashing
│       ├── backupHelpers.js   # Local database export/import
│       ├── csvExport.js       # CSV formatting and native sharing
│       ├── dateHelpers.js     # Date formatting and range calculations
│       ├── sounds.js          # Safe no-op audio player wrapper
│       └── syncManager.js     # Bi-directional SQLite <-> Supabase sync engine
├── .planning/                 # GSD planning & context documentation
│   └── codebase/              # Codebase intelligence maps
├── App.js                     # Root component, font loading & providers
├── app.json                   # Expo app configuration, plugins, ProGuard rules
├── eas.json                   # EAS Build profiles (preview, universal, production)
├── index.js                   # Application entry point with safe warning filters
└── package.json               # Dependencies and scripts
```

## Key Entry Points & Lifecycles
1. `index.js`: Registers root component and installs safe logger interception for circular structures.
2. `App.js`:
   - Imports `react-native-gesture-handler` at the very top.
   - Loads specific Poppins fonts (`Poppins_500Medium`, `600SemiBold`, `700Bold`, `800ExtraBold`).
   - Runs `initializeDatabase()` to verify SQLite schema.
   - Wraps the app in `SafeAreaProvider`, `AuthProvider`, `ThemeProvider`, and `NotificationProvider`.
3. `src/navigation/AppNavigator.js`: Conditionally renders `AuthStack` or `MainTabs` based on `user` state from `AuthContext`.
