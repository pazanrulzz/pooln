import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { SplitType } from '@pooln/shared';
import { calculateSplit } from '@pooln/shared';
import { minorUnitsToText, parseSplitValue } from '../lib/money';
import type { ParticipantRef } from './participant';

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'EQUAL', label: 'Equally' },
  { value: 'EXACT', label: 'Exact amounts' },
  { value: 'PERCENTAGE', label: 'Percentages' },
  { value: 'SHARES', label: 'Shares' },
];

interface Props {
  splitType: SplitType;
  onSplitTypeChange: (splitType: SplitType) => void;
  participants: ParticipantRef[];
  totalAmountMinorUnits: number;
  currentUserId: string;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
}

export function SplitEditor({
  splitType,
  onSplitTypeChange,
  participants,
  totalAmountMinorUnits,
  currentUserId,
  values,
  onValuesChange,
}: Props) {
  const result =
    participants.length >= 2
      ? calculateSplit({
          totalAmountMinorUnits,
          splitType,
          participants: participants.map((p) => ({
            userId: p.id,
            value: parseSplitValue(splitType, values[p.id]),
          })),
        })
      : null;

  const linesByUserId = result?.ok
    ? Object.fromEntries(result.lines.map((l) => [l.userId, l]))
    : {};

  const placeholderFor = (splitType: SplitType) => {
    if (splitType === 'EXACT') return 'Amount';
    if (splitType === 'PERCENTAGE') return '%';
    return 'Shares';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Split</Text>
      <View style={styles.typeRow}>
        {SPLIT_TYPES.map((t) => (
          <Text
            key={t.value}
            onPress={() => onSplitTypeChange(t.value)}
            style={[styles.typeOption, splitType === t.value && styles.typeOptionActive]}
          >
            {t.label}
          </Text>
        ))}
      </View>

      {participants.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.name}>
            {p.displayName}
            {p.id === currentUserId ? ' (you)' : ''}
          </Text>
          <View style={styles.right}>
            {splitType !== 'EQUAL' && (
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={placeholderFor(splitType)}
                value={values[p.id] ?? ''}
                onChangeText={(text) => onValuesChange({ ...values, [p.id]: text })}
              />
            )}
            <Text style={styles.owed}>
              {linesByUserId[p.id] ? minorUnitsToText(linesByUserId[p.id]!.owedAmountMinorUnits) : '—'}
            </Text>
          </View>
        </View>
      ))}

      {result && !result.ok && <Text style={styles.error}>{result.error}</Text>}
      {participants.length < 2 && (
        <Text style={styles.hint}>Add at least one more person to split with.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#666' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeOption: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    overflow: 'hidden',
  },
  typeOptionActive: {
    backgroundColor: '#208aef',
    borderColor: '#208aef',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  name: { fontSize: 15, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 70,
    textAlign: 'right',
  },
  owed: { width: 56, textAlign: 'right', color: '#666' },
  error: { color: '#d92d20', fontSize: 13 },
  hint: { color: '#666', fontSize: 13 },
});
