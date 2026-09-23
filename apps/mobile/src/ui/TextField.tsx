import { useState, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { colors, radius, spacing, typography } from './theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: IconName;
  error?: string | null;
  hint?: string;
  trailing?: ReactNode;
  inputRef?: Ref<TextInput>;
  /** `filled` = gray field for use on white surfaces; default white field for gray backgrounds. */
  variant?: 'surface' | 'filled';
  style?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  icon,
  error,
  hint,
  trailing,
  inputRef,
  variant = 'surface',
  style,
  secureTextEntry,
  multiline,
  onFocus,
  onBlur,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <AppText variant="footnote" tone="secondary" weight="600" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.field,
          variant === 'filled' && styles.fieldFilled,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {icon && <Icon name={icon} size={17} color={focused ? colors.brand : colors.tertiaryLabel} />}
        <TextInput
          ref={inputRef}
          {...inputProps}
          multiline={multiline}
          secureTextEntry={secureTextEntry && !revealed}
          placeholderTextColor={colors.tertiaryLabel}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            hitSlop={10}
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Icon name={revealed ? 'eyeSlash' : 'eye'} size={18} color={colors.tertiaryLabel} />
          </Pressable>
        )}
        {trailing}
      </View>
      {error ? (
        <AppText variant="footnote" tone="negative" style={styles.message}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="footnote" tone="tertiary" style={styles.message}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { marginLeft: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldFilled: { backgroundColor: colors.background },
  fieldMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
  fieldFocused: { borderColor: colors.brand },
  fieldError: { borderColor: colors.negative },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.label,
    paddingVertical: 12,
    outlineStyle: 'solid', outlineWidth: 0,
  },
  inputMultiline: { minHeight: 72, paddingVertical: 0, textAlignVertical: 'top' },
  message: { marginLeft: spacing.xs },
});
