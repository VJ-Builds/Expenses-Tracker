# Testing & Verification Guide

## 1. Automated Verification Checks

### Expo Doctor
Run `expo-doctor` to ensure all 21 system checks pass:
```bash
npx expo-doctor
```
- Verifies package versions against the Expo SDK 57 release matrix.
- Checks native module compatibility and duplicate dependencies.

### Metro Production Export Test
Validate that the JavaScript bundle, assets, and font loaders compile without packaging errors:
```bash
npx expo export --platform android
```
- Verifies tree-shaking of `@expo-google-fonts/poppins`.
- Ensures zero unresolved asset imports or syntax errors.

## 2. Cloud & Standalone Build Verification (EAS Build)

### Optimized Standalone APK (<30MB)
To generate an optimized, single-architecture APK for physical device testing:
```bash
eas build -p android --profile preview
```
- Targets `arm64-v8a` natively.
- Runs R8 minification and resource shrinking.
- Verifies that ProGuard rules do not strip Reanimated or Expo reflection classes.

### Universal Compatibility APK
To build a universal APK containing all 4 architectures:
```bash
eas build -p android --profile universal
```

## 3. Key Manual Test Flows

1. **Offline-to-Online Transition**:
   - Create local expenses while offline.
   - Register or login with a Supabase email account.
   - Verify that local expenses are preserved, linked, and pushed to the cloud.
2. **Keyboard Interaction on Add Expense Screen**:
   - Tap the amount input field to trigger the keyboard.
   - Verify the "Save Expense" CTA rises above the keyboard (~55px offset) without the form shifting or scrolling.
3. **Payment Method Prioritization**:
   - Reorder payment methods in `PaymentMethodsScreen`.
   - Open `AddExpenseScreen` and confirm the dropdown defaults to the 1st prioritized method.
