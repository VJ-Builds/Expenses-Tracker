import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

LogBox.ignoreAllLogs(true);

const IGNORED_WARNINGS = [
  'setLayoutAnimationEnabledExperimental',
  'SafeAreaView has been deprecated',
  'InteractionManager has been deprecated',
  'VirtualizedLists should never be nested',
  'PGRST303',
  'Clock skew detected',
  'JWT issued at future',
];

LogBox.ignoreLogs(IGNORED_WARNINGS);

const originalWarn = console.warn;
console.warn = (...args) => {
  try {
    const msg = args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ');
    if (IGNORED_WARNINGS.some((w) => msg.includes(w))) {
      return;
    }
  } catch (_) {}
  originalWarn(...args);
};

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
