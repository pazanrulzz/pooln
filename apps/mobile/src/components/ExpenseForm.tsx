import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { CreateExpenseInput, ExpenseDTO, SplitType } from '@pooln/shared';
import { minorUnitsToText, parseSplitValue, textToMinorUnits } from '../lib/money';
import { ParticipantPicker } from './ParticipantPicker';
import { SplitEditor } from './SplitEditor';
import type { ParticipantRef } from './participant';

export interface ExpenseFormValues {
  description: string;
  amountText: string;
  currency: string;
  payerId: string;
  participants: ParticipantRef[];
  splitType: SplitType;
  splitValues: Record<string, string>;
  notes: string;
}

/** Converts form state (text inputs) into the API's wire format. */
export function toCreateExpenseInput(values: ExpenseFormValues): CreateExpenseInput | null {
  const amountMinorUnits = textToMinorUnits(values.amountText);
  if (amountMinorUnits === null || amountMinorUnits <= 0) return null;

  return {
    description: values.description,
    amountMinorUnits,
    currency: values.currency,
    splitType: values.splitType,
    payerId: values.payerId,
    notes: values.notes.trim() === '' ? undefined : values.notes.trim(),
    participants: values.participants.map((p) => ({
      userId: p.id,
      value: parseSplitValue(values.splitType, values.splitValues[p.id]),
    })),
  };
}

/** Reconstructs form state from an existing expense, for the edit screen. */
export function fromExpenseDTO(expense: ExpenseDTO): ExpenseFormValues {
  const splitValues: Record<string, string> = {};
  for (const p of expense.participants) {
    if (expense.splitType === 'EXACT') {
      splitValues[p.userId] = minorUnitsToText(p.owedAmountMinorUnits);
    } else if (expense.splitType === 'PERCENTAGE' && p.sharePercentBp !== null) {
      splitValues[p.userId] = (p.sharePercentBp / 100).toString();
    } else if (expense.splitType === 'SHARES' && p.shareUnits !== null) {
      splitValues[p.userId] = p.shareUnits.toString();
    }
  }

  return {
    description: expense.description,
    amountText: minorUnitsToText(expense.amountMinorUnits),
    currency: expense.currency,
    payerId: expense.payerId,
    participants: expense.participants.map((p) => ({ id: p.userId, displayName: p.displayName })),
    splitType: expense.splitType,
    splitValues,
    notes: expense.notes ?? '',
  };
}

interface Props {
  currentUserId: string;
  initialValues: ExpenseFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: ExpenseFormValues) => void;
}

export function ExpenseForm({
  currentUserId,
  initialValues,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
}: Props) {
  const [description, setDescription] = useState(initialValues.description);
  const [amountText, setAmountText] = useState(initialValues.amountText);
  const [currency, setCurrency] = useState(initialValues.currency);
  const [payerId, setPayerId] = useState(initialValues.payerId);
  const [participants, setParticipants] = useState<ParticipantRef[]>(initialValues.participants);
  const [splitType, setSplitType] = useState<SplitType>(initialValues.splitType);
  const [splitValues, setSplitValues] = useState<Record<string, string>>(initialValues.splitValues);
  const [notes, setNotes] = useState(initialValues.notes);
  const [formError, setFormError] = useState<string | null>(null);

  const amountMinorUnits = textToMinorUnits(amountText);

  const handleAddParticipant = (user: ParticipantRef) => {
    setParticipants((prev) => [...prev, user]);
  };

  const handleRemoveParticipant = (userId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== userId));
    if (payerId === userId) setPayerId(currentUserId);
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!description.trim()) {
      setFormError('Give this expense a description.');
      return;
    }
    if (amountMinorUnits === null || amountMinorUnits <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (participants.length < 2) {
      setFormError('Add at least one more person to split with.');
      return;
    }
    onSubmit({
      description: description.trim(),
      amountText,
      currency,
      payerId,
      participants,
      splitType,
      splitValues,
      notes,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.fieldLabel}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Dinner, rent, taxi..."
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.amountRow}>
        <View style={styles.amountField}>
          <Text style={styles.fieldLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={setAmountText}
          />
        </View>
        <View style={styles.currencyField}>
          <Text style={styles.fieldLabel}>Currency</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="characters"
            maxLength={3}
            value={currency}
            onChangeText={(text) => setCurrency(text.toUpperCase())}
          />
        </View>
      </View>

      <ParticipantPicker
        participants={participants}
        currentUserId={currentUserId}
        onAdd={handleAddParticipant}
        onRemove={handleRemoveParticipant}
      />

      <Text style={styles.fieldLabel}>Paid by</Text>
      <View style={styles.payerRow}>
        {participants.map((p) => (
          <Text
            key={p.id}
            onPress={() => setPayerId(p.id)}
            style={[styles.payerOption, payerId === p.id && styles.payerOptionActive]}
          >
            {p.id === currentUserId ? 'You' : p.displayName}
          </Text>
        ))}
      </View>

      {amountMinorUnits !== null && amountMinorUnits > 0 && (
        <SplitEditor
          splitType={splitType}
          onSplitTypeChange={setSplitType}
          participants={participants}
          totalAmountMinorUnits={amountMinorUnits}
          currentUserId={currentUserId}
          values={splitValues}
          onValuesChange={setSplitValues}
        />
      )}

      <Text style={styles.fieldLabel}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      {(formError ?? submitError) && <Text style={styles.error}>{formError ?? submitError}</Text>}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{submitLabel}</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  amountRow: { flexDirection: 'row', gap: 12 },
  amountField: { flex: 2 },
  currencyField: { flex: 1 },
  payerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payerOption: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    overflow: 'hidden',
  },
  payerOptionActive: {
    backgroundColor: '#208aef',
    borderColor: '#208aef',
    color: '#fff',
  },
  error: { color: '#d92d20', fontSize: 13 },
  submitButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
