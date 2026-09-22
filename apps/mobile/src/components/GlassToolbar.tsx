import { Pressable, StyleSheet, View } from 'react-native';
import { Host, Text as UIText } from '@expo/ui';
import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

interface Props {
  title: string;
  onBackPress?: () => void;
}

/** A top toolbar in Apple's "Liquid Glass" style: a frosted circular back button (real native
 * glass material on iOS 26 via `expo-glass-effect`, a translucent fallback elsewhere) and a
 * centered title. Used on each tab's root screen for a consistent app-wide look. */
export function GlassToolbar({ title, onBackPress }: Props) {
  const handleBack = onBackPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <View style={styles.toolbar}>
      <View style={styles.side}>
        <Pressable onPress={handleBack} hitSlop={8}>
          <GlassView glassEffectStyle="regular" colorScheme="light" isInteractive style={styles.glassButton}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={20}
              tintColor="#000"
            />
          </GlassView>
        </Pressable>
      </View>
      <View style={styles.center}>
        <Host matchContents colorScheme="light">
          <UIText textStyle={styles.titleText}>{title}</UIText>
        </Host>
      </View>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  side: { flex: 1 },
  center: { flex: 1, alignItems: 'center' },
  titleText: { fontSize: 20, fontWeight: '700', color: '#000' },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
