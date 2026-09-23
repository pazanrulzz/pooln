import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { colors, radius, typography } from './theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/** iOS-style search field: gray fill, leading magnifier, clear button while non-empty. */
export function SearchBar({ value, onChangeText, placeholder = 'Search', style }: Props) {
  return (
    <View style={[styles.field, style]}>
      <Icon name="search" size={16} color={colors.secondaryLabel} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryLabel}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityRole="search"
        style={styles.input}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <View style={styles.clear}>
            <Icon name="xmark" size={9} color={colors.surface} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: radius.md - 2,
    backgroundColor: colors.fill,
  },
  input: { ...typography.body, flex: 1, color: colors.label, paddingVertical: 0, outlineStyle: 'solid', outlineWidth: 0 },
  clear: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.tertiaryLabel,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
