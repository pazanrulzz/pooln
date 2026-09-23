import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { colors } from './theme';

const PALETTE = [
  { bg: '#E8EAFD', fg: '#4F5BD5' },
  { bg: '#E3F4EA', fg: '#1F9D55' },
  { bg: '#FFF0E0', fg: '#D9730D' },
  { bg: '#FDE8EF', fg: '#D6336C' },
  { bg: '#E2F3F8', fg: '#1A8BA8' },
  { bg: '#F1E8FC', fg: '#8B46D6' },
  { bg: '#FFF6D6', fg: '#B7870B' },
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}

interface Props {
  name: string;
  uri?: string | null;
  size?: number;
  /** Rounded square instead of a circle — used for groups to tell them apart from people. */
  shape?: 'circle' | 'squircle';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, uri, size = 44, shape = 'circle', icon, style }: Props) {
  const p = paletteFor(name);
  const borderRadius = shape === 'circle' ? size / 2 : size * 0.3;
  const frame = { width: size, height: size, borderRadius };

  if (uri) {
    return (
      <View style={[frame, styles.image, style]}>
        <Image source={{ uri }} style={styles.fill} contentFit="cover" transition={150} />
      </View>
    );
  }

  return (
    <View style={[frame, styles.center, { backgroundColor: p.bg }, style]}>
      {icon ? (
        <Icon name={icon} size={size * 0.45} color={p.fg} />
      ) : (
        <AppText style={{ color: p.fg, fontSize: size * 0.38, lineHeight: size * 0.46, fontWeight: '700' }}>
          {size < 32 ? initialsOf(name).charAt(0) : initialsOf(name)}
        </AppText>
      )}
    </View>
  );
}

interface StackProps {
  people: { id: string; name: string; uri?: string | null }[];
  size?: number;
  max?: number;
}

export function AvatarStack({ people, size = 24, max = 4 }: StackProps) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <View style={styles.stack}>
      {shown.map((person, i) => (
        <Avatar
          key={person.id}
          name={person.name}
          uri={person.uri}
          size={size}
          style={[styles.stacked, i > 0 && { marginLeft: -size * 0.3 }]}
        />
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.center,
            styles.stacked,
            styles.overflow,
            { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.3 },
          ]}
        >
          <AppText style={{ fontSize: size * 0.4, fontWeight: '700', color: colors.secondaryLabel }}>
            +{overflow}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  image: { backgroundColor: colors.fill, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stacked: { borderWidth: 2, borderColor: colors.surface },
  overflow: { backgroundColor: colors.background },
});
