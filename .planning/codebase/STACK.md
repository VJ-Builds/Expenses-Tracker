# Tech Stack & Environment

## Core Runtimes & Frameworks
- **Framework**: React Native `0.86.3` via Expo SDK `57.0.20`
- **Language**: JavaScript (ES6+ / JSX) with Babel (`babel-preset-expo ~57.0.0`)
- **UI & Runtime Engine**: React `19.2.3` with Hermes V1 JavaScript Engine
- **Target Platform**: Android (`arm64-v8a` release target, minSdk: standard Expo defaults)

## Key Dependencies & Libraries

### Navigation
- `@react-navigation/native` (`^7.0.0`): Core routing container
- `@react-navigation/stack` (`^7.1.0`): Stack navigator for auth & secondary screens
- `@react-navigation/bottom-tabs` (`^7.2.0`): Tab navigation for core dashboard and expense views

### Local Storage & Database
- `expo-sqlite` (`~57.0.2`): Local SQLite database with FTS (Full-Text Search) enabled
- `@react-native-async-storage/async-storage` (`^2.2.0`): Key-value persistence for session tokens, active theme, and preferences

### Cloud Backend & Synchronization
- `@supabase/supabase-js` (`^2.112.3`): Cloud Postgres, Supabase Auth, and real-time/REST synchronization
- `@react-native-community/netinfo` (`12.0.1`): Network connectivity detection for offline/online state transitions
- `react-native-url-polyfill` (`^4.0.0`): URL standards polyfill required by Supabase in React Native

### UI, Animations & Visuals
- `react-native-reanimated` (`4.5.1`): High-performance declarative animations
- `react-native-worklets` (`0.10.1`): Low-overhead UI thread worklets
- `react-native-gesture-handler` (`~2.32.0`): Native gesture handling (configured at root `App.js`)
- `react-native-gifted-charts` (`^1.4.77`): Charts for expense breakdown and reports
- `react-native-calendars` (`^1.1314.0`): Interactive calendar for transaction timeline
- `react-native-svg` (`15.15.4`): SVG rendering for icons and vector graphics
- `lucide-react-native` (`^1.24.0`): Modern feather-like vector icon set
- `expo-linear-gradient` (`~57.0.1`): Premium gradient backgrounds
- `expo-blur` (`~57.0.2`): Frosted glassmorphic card overlays
- `@expo-google-fonts/poppins`: Custom typography (`Poppins_500Medium`, `600SemiBold`, `700Bold`, `800ExtraBold`)

### Device & System Utilities
- `expo-document-picker` (`~57.0.1`): Local backup/restore file picker
- `expo-file-system` (`~57.0.6`): File storage management for CSV export and local SQLite backups
- `expo-sharing` (`~57.0.18`): Native share sheet for CSV reports
- `@react-native-community/datetimepicker` (`9.1.0`): Native Android/iOS date and time picker
- `expo-splash-screen` (`~57.0.8`): Native splash screen control
- `expo-status-bar` (`~57.0.1`): Status bar appearance styling
- `bcryptjs` (`^2.4.3`): Client-side password hashing for local fallback security

## Build Tooling & Configuration
- **Build System**: Expo Application Services (EAS Build)
- **EAS CLI**: `eas-cli` configured via `eas.json`
- **Minification**: R8 code minification & resource shrinking enabled via `expo-build-properties`
- **ProGuard**: Custom keep rules in `app.json` safeguarding Expo modules, React Native core, and Reanimated
- **Architecture Splitting**: Single-architecture release (`-PreactNativeArchitectures=arm64-v8a`) configured in `eas.json` for ~20–25MB APK size
