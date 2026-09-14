import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Poppins_800ExtraBold } from '@expo-google-fonts/poppins/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { Caveat_400Regular } from '@expo-google-fonts/caveat/400Regular';
import { Caveat_700Bold } from '@expo-google-fonts/caveat/700Bold';

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeDatabase } from './src/db/schema';
import { COLORS } from './src/constants/theme';

LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs([
  'setLayoutAnimationEnabledExperimental is currently a no-op',
  'SafeAreaView has been deprecated',
  'InteractionManager has been deprecated',
  'VirtualizedLists should never be nested',
  'PGRST303',
  'Clock skew detected',
  'JWT issued at future',
]);

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Lora_400Regular,
    Lora_600SemiBold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
    Caveat_400Regular,
    Caveat_700Bold,
  });

  useEffect(() => {
    try {
      initializeDatabase();
    } catch (err) {
      console.error('DB init failed:', err);
    } finally {
      setDbReady(true);
    }
  }, []);

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppNavigator />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
