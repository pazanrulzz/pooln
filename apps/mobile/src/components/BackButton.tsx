import { router } from 'expo-router';
import { IconButton } from '../ui';

/**
 * Explicit header-left back button — set globally as the (app) stack's
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

  return <IconButton icon="chevronLeft" onPress={handlePress} accessibilityLabel="Back" size={36} />;
}
