import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, typography, type TypographyVariant } from './theme';

type Tone = 'label' | 'secondary' | 'tertiary' | 'brand' | 'positive' | 'negative' | 'onBrand';

const toneColor: Record<Tone, string> = {
  label: colors.label,
  secondary: colors.secondaryLabel,
  tertiary: colors.tertiaryLabel,
  brand: colors.brand,
  positive: colors.positive,
  negative: colors.negative,
  onBrand: colors.onBrand,
};

interface Props extends TextProps {
  variant?: TypographyVariant;
  tone?: Tone;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', tone = 'label', weight, align, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color: toneColor[tone] },
        weight !== undefined && { fontWeight: weight },
        align !== undefined && { textAlign: align },
        style,
      ]}
    />
  );
}
