import { StyleSheet, TextInput, View } from 'react-native';
import type { SplitType } from '@pooln/shared';
import { calculateSplit } from '@pooln/shared';
import { formatMoney, parseSplitValue } from '../lib/money';
import { AppText, Avatar, Banner, ListRow, ListSection, SegmentedControl, colors, radius, spacing, typography } from '../ui';
import type { ParticipantRef } from './participant';

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'EQUAL', label: 'Equally' },
  { value: 'EXACT', label: 'Amounts' },
  { value: 'PERCENTAGE', label: 'Percent' },
  { value: 'SHARES', label: 'Shares' },
];

const HINTS: Record<SplitType, string> = {
  EQUAL: 'Everyone pays the same share.',
  EXACT: 'Enter exactly how much each person owes.',
  PERCENTAGE: 'Percentages must add up to 100%.',
  SHARES: 'e.g. 2 shares pays twice as much as 1 share.',
};

interface Props {
  splitType: SplitType;
  onSplitTypeChange: (splitType: SplitType) => void;
  participants: ParticipantRef[];
  totalAmountMinorUnits: number;
  currency: string;
  currentUserId: string;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
}

export function SplitEditor({
  splitType,
  onSplitTypeChange,
  participants,
  totalAmountMinorUnits,
  currency,
  currentUserId,
  values,
  onValuesChange,
}: Props) {
  const result =
    participants.length >= 2
      ? calculateSplit({
          totalAmountMinorUnits,
          splitType,
          participants: participants.map((p) => ({ userId: p.id, value: parseSplitValue(splitType, values[p.id]) })),
        })
      : null;

  const linesByUserId = result?.ok ? Object.fromEntries(result.lines.map((l) => [l.userId, l])) : {};
  const suffix = splitType === 'PERCENTAGE' ? '%' : splitType === 'SHARES' ? '×' : '';

  return (
    <View style={styles.container}>
      <SegmentedControl options={SPLIT_TYPES} value={splitType} onChange={onSplitTypeChange} />

      <ListSection title="Split" footer={HINTS[splitType]} separatorInset={64}>
        {participants.map((p) => {
          const owed = linesByUserId[p.id]?.owedAmountMinorUnits;
          return (
            <ListRow
              key={p.id}
              title={p.id === currentUserId ? 'You' : p.displayName}
              subtitle={owed !== undefined ? `owes ${formatMoney(owed, currency)}` : '—'}
              leading={<Avatar name={p.displayName} size={36} />}
              trailing={
                splitType === 'EQUAL' ? (
                  <AppText variant="headline">{owed !== undefined ? formatMoney(owed, currency) : '—'}</AppText>
                ) : (
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={values[p.id] ?? ''}
                      onChangeText={(text) => onValuesChange({ ...values, [p.id]: text })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.tertiaryLabel}
                      style={styles.input}
                      accessibilityLabel={`${p.displayName} split value`}
                    />
                    {suffix !== '' && (
                      <AppText variant="subhead" tone="secondary">
                        {suffix}
                      </AppText>
                    )}
                  </View>
                )
              }
            />
          );
        })}
      </ListSection>

      {result && !result.ok && <Banner tone="error">{result.error}</Banner>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 84,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  input: { ...typography.callout, flex: 1, textAlign: 'right', color: colors.label, outlineStyle: 'solid', outlineWidth: 0, minWidth: 40 },
});
