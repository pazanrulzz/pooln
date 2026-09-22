import { StyleSheet, Text, View } from 'react-native';
import { Button, Text as UIText, TextInput as UITextInput } from '@expo/ui';
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
        {SPLIT_TYPES.map((t) => {
          const isActive = splitType === t.value;
          return (
            <Button
              key={t.value}
              variant="text"
              onPress={() => onSplitTypeChange(t.value)}
              style={isActive ? styles.typeOptionActive : styles.typeOption}
            >
              <UIText textStyle={isActive ? styles.typeTextActive : styles.typeText}>{t.label}</UIText>
            </Button>
          );
        })}
      </View>

      {participants.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.name}>
            {p.displayName}
            {p.id === currentUserId ? ' (you)' : ''}
          </Text>
          <View style={styles.right}>
            {splitType !== 'EQUAL' && (
              <View style={styles.inputBox}>
                <UITextInput
                  style={styles.input}
                  textStyle={styles.inputText}
                  keyboardType="decimal-pad"
                  placeholder={placeholderFor(splitType)}
                  defaultValue={values[p.id] ?? ''}
                  onChangeText={(text) => onValuesChange({ ...values, [p.id]: text })}
                />
              </View>
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
    backgroundColor: '#fff',
  },
  typeOptionActive: {
    backgroundColor: '#208aef',
    borderColor: '#208aef',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeText: { fontSize: 13, color: '#000' },
  typeTextActive: { fontSize: 13, color: '#fff' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  name: { fontSize: 15, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputBox: { width: 70 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  inputText: { textAlign: 'right', color: '#000' },
  owed: { width: 56, textAlign: 'right', color: '#666' },
  error: { color: '#d92d20', fontSize: 13 },
  hint: { color: '#666', fontSize: 13 },
});
