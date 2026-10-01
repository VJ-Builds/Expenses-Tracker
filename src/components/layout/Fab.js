import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useBottomSpace, FAB_SIZE, FAB_GAP } from '../../constants/layout';

// ──────────────────────────────────────────────────────────────
// Fab — Floating Action Button
// ──────────────────────────────────────────────────────────────
// A circular floating button anchored to a screen corner that always keeps
// a safe gap above the system navigation bar (gesture OR 3-button) on every
// device. Replaces hand-positioned `bottom: Platform.OS === 'android' ? 24 : 36`
// which breaks under gesture navigation.
//
//   onPress   → press handler
//   tabBar    → true if the FAB sits on a screen inside MainTabs
//   position  → 'right' (default) | 'center' | 'left'
//   size      → diameter (defaults to FAB_SIZE)
//   color     → background color
//   extraBottom → extra lift above the safe gap
//   children  → the icon to render inside
// ──────────────────────────────────────────────────────────────
export default function Fab({
  onPress,
  children,
  tabBar = false,
  position = 'right',
  size = FAB_SIZE,
  color = '#2563EB',
  extraBottom = 0,
  style,
  ...rest
}) {
  const bottom = useBottomSpace({ tabBar, extra: FAB_GAP + extraBottom });

  const horizontal =
    position === 'center'
      ? { alignSelf: 'center' }
      : position === 'left'
      ? { left: FAB_GAP, alignItems: 'flex-start' }
      : { right: FAB_GAP, alignItems: 'flex-end' };

  return (
    <View style={[styles.wrap, { bottom }, horizontal]} pointerEvents="box-none">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.btn,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          style,
        ]}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
});
