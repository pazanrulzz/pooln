import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

/**
 * Explicit header-left back chevron — set globally as the (app) stack's
 * default headerLeft rather than relying on the platform's automatic back
 * button, which wasn't reliably appearing (e.g. on web).
 */
export function BackButton() {
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <Pressable onPress={handlePress} hitSlop={12} style={styles.button}>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 8, paddingVertical: 6 },
  chevron: { color: '#208aef', fontSize: 30, fontWeight: '600', lineHeight: 30 },
});
