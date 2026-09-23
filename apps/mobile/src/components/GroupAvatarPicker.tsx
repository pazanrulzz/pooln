import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AppText, Avatar, Icon, colors, showActionSheet, showToast } from '../ui';

// Resized before upload so the resulting data URI comfortably fits inside a
// single DynamoDB item (400KB limit) — see avatarUrlSchema in @pooln/shared.
const TARGET_DIMENSION = 400;

async function toDataUrl(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: TARGET_DIMENSION, height: TARGET_DIMENSION });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  /** Name used for the placeholder's initials/color when no picture is set. */
  name: string;
  size?: number;
}

export function GroupAvatarPicker({ value, onChange, name, size = 96 }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  const pickFrom = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast(`Allow access to your ${source === 'camera' ? 'camera' : 'photos'} in Settings`, 'error');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;

    setIsProcessing(true);
    try {
      onChange(await toDataUrl(result.assets[0].uri));
    } catch {
      showToast('Could not use that photo. Try a different one.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePress = async () => {
    // Browsers only open a file picker directly off a user gesture, so on web
    // a tap goes straight to the library instead of through a menu first.
    if (Platform.OS === 'web') {
      pickFrom('library');
      return;
    }
    const index = await showActionSheet({
      title: 'Group photo',
      options: [
        { label: 'Take photo', icon: 'camera' },
        { label: 'Choose from library', icon: 'photo' },
        ...(value ? [{ label: 'Remove photo', icon: 'trash' as const, destructive: true }] : []),
      ],
    });
    if (index === 0) pickFrom('camera');
    else if (index === 1) pickFrom('library');
    else if (index === 2) onChange(null);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={handlePress} disabled={isProcessing} accessibilityRole="button" accessibilityLabel="Change group photo">
        <View>
          <Avatar name={name || 'Group'} uri={value} size={size} shape="squircle" icon={value ? undefined : 'userGroup'} />
          {isProcessing && (
            <View style={[styles.overlay, { borderRadius: size * 0.3 }]}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <View style={styles.badge}>
            <Icon name="camera" size={14} color="#fff" />
          </View>
        </View>
      </Pressable>
      <View style={styles.labels}>
        <Pressable onPress={handlePress} disabled={isProcessing} hitSlop={8} accessibilityRole="button">
          <AppText variant="footnote" tone="brand" weight="600">
            {value ? 'Change photo' : 'Add photo'}
          </AppText>
        </Pressable>
        {value && !isProcessing && (
          <Pressable onPress={() => onChange(null)} hitSlop={8} accessibilityRole="button">
            <AppText variant="footnote" tone="secondary">
              Remove
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 10 },
  labels: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
});
