# Project Specification: ExpenseIQ (Expenses Tracker)

## Vision & Overview
ExpenseIQ is a premium, offline-first personal finance and expense tracking mobile application built with React Native and Expo SDK 57. It provides immediate responsiveness, seamless offline functionality via local SQLite, and cloud synchronization with Supabase.

## Target User & Core Value Proposition
- **Target User**: Individuals seeking a fast, beautiful, and distraction-free mobile expense tracking solution.
- **Value Proposition**:
  - Full functionality without requiring an internet connection.
  - Automatic cloud synchronization whenever network connectivity is restored.
  - Sleek dark aesthetic with micro-animations, glassmorphism, and instant feedback.
  - Complete control over categories, budgets, payment methods, and data export (CSV/Backup).

## Core Feature Set

### 1. Dashboard & Analytics
- Monthly spend overview against personalized budget limits.
- Category breakdowns with interactive charts (`react-native-gifted-charts`).
- Recent transactions list with quick navigation.

### 2. Transaction Management
- Rapid expense logging with amount, category, custom payment method, and date picker.
- Non-scrollable static screen design with keyboard-adaptive button positioning.
- Search and filter across transactions with SQLite FTS5 support.

### 3. Category & Payment Customization
- Custom category creation with icon and color selectors.
- Drag/priority-based payment method ordering with automatic default selection.

### 4. Data Safety & Synchronization
- Local-first architecture powered by `expo-sqlite`.
- Supabase cloud synchronization with smart local data seeding.
- CSV export via native share sheets and full local database backup/restore.

### 5. Build & Distribution
- EAS Build configuration targeting Android `arm64-v8a` for an ultra-compact (~22MB) APK.
- ProGuard/R8 code shrinking and resource optimization.
