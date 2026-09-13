import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, ActivityIndicator } from 'react-native';
import { Home, List, PieChart, BarChart2, MoreHorizontal, AlignLeft, Bell, Plus, Search, LayoutGrid } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { FONTS } from '../constants/theme';
import NetInfo from '@react-native-community/netinfo';
import { syncUp, syncDown, autoSync } from '../utils/syncManager';


import LoginScreen           from '../screens/LoginScreen';
import RegisterScreen        from '../screens/RegisterScreen';
import DashboardScreen       from '../screens/DashboardScreen';
import AddExpenseScreen      from '../screens/AddExpenseScreen';
import ReportsScreen         from '../screens/ReportsScreen';
import TransactionsListScreen from '../screens/TransactionsListScreen';
import BudgetOverviewScreen  from '../screens/BudgetOverviewScreen';
import BudgetSettingsScreen  from '../screens/BudgetSettingsScreen';
import CalendarScreen        from '../screens/CalendarScreen';
import MenuScreen            from '../screens/MenuScreen';
import NotificationsScreen   from '../screens/NotificationsScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import PaymentMethodsScreen    from '../screens/PaymentMethodsScreen';
import AppsHubScreen           from '../screens/AppsHubScreen';
import NotesListScreen         from '../notes/screens/NotesListScreen';
import NoteEditorScreen        from '../notes/screens/NoteEditorScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const BRAND_PURPLE = '#FF6B6B'; // Sunset Horizon Primary
const TEXT_DARK    = '#1C1C28';
const TEXT_MUTED   = '#8F92A1';
const BG_WHITE     = '#FFFFFF';
const BG_APP       = '#F7F8FA';
const BORDER       = '#F0F1F5';

// ── Shared static header (same on every tab screen) ─────────────

const AnimatedHamburger = ({ onPress }) => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ]
  }));

  const handlePressIn = () => { scale.value = withSpring(0.85); };
  const handlePressOut = () => {
    scale.value = withSpring(1);
    rotate.value = withSequence(
      withTiming(-20, { duration: 60 }),
      withSpring(0, { damping: 4, stiffness: 200 })
    );
    onPress();
  };

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[headerStyles.iconBtn, animatedStyle]}>
        <AlignLeft stroke={TEXT_DARK} size={22} strokeWidth={2.5} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const AppHeader = ({ title, route, navigation: navProp }) => {
  const navigation = useNavigation();
  const { unreadCount } = useNotifications();
  const isTransactions = title === 'Transactions';
  const searchOpen = route?.params?.searchOpen || false;

  const handleRightPress = () => {
    if (isTransactions) {
      navigation.setParams({ searchOpen: !searchOpen });
    } else {
      navigation.navigate('Notifications');
    }
  };
  
  return (
    <SafeAreaView style={headerStyles.safe} edges={['top']}>
      <View style={headerStyles.container}>
        {/* Left — hamburger and App Switcher */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AnimatedHamburger onPress={() => navigation.navigate('Menu')} />
          <TouchableOpacity
            style={headerStyles.iconBtn}
            onPress={() => navigation.navigate('AppsHub')}
            activeOpacity={0.7}
          >
            <LayoutGrid stroke="#2563EB" size={20} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Center — page title */}
        <Text style={headerStyles.title}>{title}</Text>

        {/* Right — Search (Transactions) or Bell (others) */}
        <TouchableOpacity
          style={[
            headerStyles.iconBtn,
            isTransactions && searchOpen && { backgroundColor: BRAND_PURPLE + '18' }
          ]}
          onPress={handleRightPress}
        >
          {isTransactions ? (
            <Search stroke={searchOpen ? BRAND_PURPLE : TEXT_DARK} size={22} strokeWidth={2.5} />
          ) : (
            <>
              <Bell stroke={TEXT_DARK} size={22} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <View style={headerStyles.badge}>
                  <Text style={headerStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Tab icon (fixed size to prevent layout shifts on switch) ─────
const TabIcon = ({ IconComponent, label, focused }) => {
  const color = focused ? BRAND_PURPLE : TEXT_MUTED;
  return (
    <View style={[tabStyles.wrap, focused && tabStyles.wrapActive]}>
      <View style={[tabStyles.iconBg, focused && tabStyles.iconBgActive]}>
        <IconComponent stroke={color} size={24} strokeWidth={focused ? 2.4 : 2} />
      </View>
      <Text 
        style={[tabStyles.label, { color }, focused && tabStyles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

// ── Center Add Button ───────────────────────────────────────────
const CenterAddButton = ({ onPress }) => (
  <TouchableOpacity
    style={{
      top: -18,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#FF6B6B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    }}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <LinearGradient
      colors={['#FF6B6B', '#FF8E53']}
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <Plus stroke="#FFF" size={28} />
    </LinearGradient>
  </TouchableOpacity>
);

// Stable header renderer to prevent unmounting/remounting on tab switch
const renderTabHeader = ({ route }) => (
  <AppHeader title={route.name === 'More' ? 'More' : route.name} route={route} />
);

// ── Bottom tab navigator ────────────────────────────────────────
const MainTabs = () => {
  const insets = useSafeAreaInsets();
  
  // Compact, snug bottom padding matching native Android bottom navigation
  const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 4 : 8);
  const tabHeight = 56 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={{
        header: renderTabHeader,
        freezeOnBlur: true,
        animation: 'none',
        tabBarStyle: {
          backgroundColor: BG_WHITE,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          height: 52, // compact clickable area
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            activeOpacity={0.7}
            delayPressIn={0}
          />
        ),
      }}
    >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon IconComponent={Home} label="Dashboard" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Transactions"
      component={TransactionsListScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon IconComponent={List} label="Transactions" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="AddPlaceholder"
      component={View} // Dummy component
      options={{
        tabBarIcon: () => null,
        tabBarLabel: () => null,
        tabBarButton: (props) => <CenterAddButton {...props} />
      }}
      listeners={({ navigation }) => ({
        tabPress: e => {
          e.preventDefault();
          navigation.navigate('AddExpense');
        }
      })}
    />
    <Tab.Screen
      name="Budget"
      component={BudgetOverviewScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon IconComponent={PieChart} label="Budget" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Reports"
      component={ReportsScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon IconComponent={BarChart2} label="Reports" focused={focused} />
        ),
      }}
    />
    </Tab.Navigator>
  );
};

// Deep linking configuration
const linking = {
  prefixes: ['expenseiq://'],
  config: {
    screens: {
      AppsHub: '',
      Login: 'login',
      Register: 'register',
      Main: 'expenses',
      NotesList: 'notes',
      NoteEditor: 'note/:noteId',
    },
  },
};

// ── Root navigator ──────────────────────────────────────────────
const AppNavigator = () => {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!user) return;
    
    // Auto-sync when network comes back online
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        autoSync(user).catch(err => console.log('Auto-sync failed:', err));
      }
    });
    
    // Initial sync on mount with a brief delay (2.5s) to allow Auth session and clock skew to stabilize
    const timer = setTimeout(() => {
      NetInfo.fetch().then(state => {
        if (state.isConnected) {
          autoSync(user).catch(err => console.log('Initial sync failed:', err));
        }
      });
    }, 2500);
    
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F3F7' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={user ? 'AppsHub' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="AppsHub" component={AppsHubScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="NotesList" component={NotesListScreen} />
            <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              options={{ 
                presentation: 'modal', 
                cardStyle: { backgroundColor: 'transparent' },
                cardStyleInterpolator: ({ current, layouts }) => {
                  return {
                    cardStyle: {
                      transform: [
                        {
                          scale: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                          }),
                        },
                        {
                          translateY: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.height / 2, 0], // Scale from bottom center
                          }),
                        }
                      ],
                      opacity: current.progress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 1, 1],
                      })
                    },
                  };
                }
              }}
            />
            <Stack.Screen
              name="BudgetSettings"
              component={BudgetSettingsScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="Menu"
              component={MenuScreen}
              options={{ 
                presentation: 'modal',
                gestureDirection: 'horizontal-inverted',
                cardStyleInterpolator: ({ current, layouts }) => ({
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-layouts.screen.width, 0],
                        }),
                      },
                    ],
                  },
                }),
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="Categories"
              component={CategoryManagementScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="PaymentMethods"
              component={PaymentMethodsScreen}
              options={{ presentation: 'modal' }}
            />
          </>

        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

// ── Header styles ───────────────────────────────────────────────
const headerStyles = StyleSheet.create({
  safe: { backgroundColor: BG_APP },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG_APP,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: BG_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444', // Red
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG_APP,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
  }
});

const SHADOWS = {
  strong: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  }
};

// ── Tab icon styles (COLUMN — icon on top, text under) ─────────
const tabStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64, // Wider to fit the larger icon background
  },
  wrapActive: {
  },
  iconBg: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconBgActive: {
    backgroundColor: 'transparent',
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
  labelActive: {
    fontFamily: FONTS.semiBold,
    color: BRAND_PURPLE,
  },
});
