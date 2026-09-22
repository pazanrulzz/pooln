import { Platform, Share } from 'react-native';

/**
 * react-native-web doesn't reliably support the native Share sheet (same
 * class of gap as Alert.alert being a no-op on web) — falls back to copying
 * the link to the clipboard there instead.
 */
export async function shareLink(url: string): Promise<'shared' | 'copied' | 'unavailable'> {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }

  try {
    await Share.share({ message: url });
    return 'shared';
  } catch {
    return 'unavailable';
  }
}
