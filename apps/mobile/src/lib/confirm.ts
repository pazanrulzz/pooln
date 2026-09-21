import { Alert, Platform } from 'react-native';

/**
 * Alert.alert is a no-op on react-native-web (no native dialog, and it
 * doesn't fall back to window.confirm on its own) — confirmations would
 * silently do nothing on web without this.
 */
export function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
