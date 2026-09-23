import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { CreateExpenseInput, ExpenseDTO, SplitType } from '@pooln/shared';
import { COMMON_CURRENCIES, currencySymbol, minorUnitsToText, parseSplitValue, textToMinorUnits } from '../lib/money';
import { getExpenseIcon } from '../lib/expenseIcon';
import {
  AppText,
  Banner,
  Button,
  Card,
  Chip,
  Icon,
  TextField,
  colors,
  radius,
  showActionSheet,
  spacing,
  typography,
} from '../ui';
import { ParticipantPicker } from './ParticipantPicker';
import { GroupMemberSelector } from './GroupMemberSelector';
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
  groupId?: string;
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
    groupId: values.groupId,
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
    groupId: expense.groupId ?? undefined,
  };
}

interface Props {
  currentUserId: string;
  initialValues: ExpenseFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: ExpenseFormValues) => void;
  /** The group's full roster, when this expense belongs to a group — restricts participant selection to it. */
  groupMembers?: ParticipantRef[];
  /** Shown above the form, e.g. "In Munich". */
  contextLabel?: string;
}

export function ExpenseForm({
  currentUserId,
  initialValues,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
  groupMembers,
  contextLabel,
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
  const category = getExpenseIcon(description);

  const handleAddParticipant = (user: ParticipantRef) => setParticipants((prev) => [...prev, user]);

  const handleRemoveParticipant = (userId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== userId));
    if (payerId === userId) setPayerId(currentUserId);
  };

  const handleToggleGroupMember = (userId: string) => {
    if (participants.some((p) => p.id === userId)) {
      handleRemoveParticipant(userId);
      return;
    }
    const member = groupMembers?.find((m) => m.id === userId);
    if (member) handleAddParticipant(member);
  };

  const pickCurrency = async () => {
    const options = COMMON_CURRENCIES.includes(currency as (typeof COMMON_CURRENCIES)[number])
      ? COMMON_CURRENCIES
      : [currency, ...COMMON_CURRENCIES];
    const index = await showActionSheet({ title: 'Currency', options: options.map((c) => ({ label: c })) });
    if (index !== null) setCurrency(options[index]!);
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!description.trim()) return setFormError('Give this expense a description.');
    if (amountMinorUnits === null || amountMinorUnits <= 0) return setFormError('Enter an amount greater than zero.');
    if (participants.length < 2) return setFormError('Add at least one more person to split with.');
    onSubmit({
      description: description.trim(),
      amountText,
      currency,
      payerId,
      participants,
      splitType,
      splitValues,
      notes,
      groupId: initialValues.groupId,
    });
  };

  const error = formError ?? submitError;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {contextLabel && <Chip label={contextLabel} icon="userGroup" tone="brand" style={styles.context} />}

        <Card style={styles.hero}>
          <View style={styles.descriptionRow}>
            <View style={[styles.categoryBadge, { backgroundColor: category.color }]}>
              <Icon name={category.name} size={22} color="#fff" />
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What was it for?"
              placeholderTextColor={colors.tertiaryLabel}
              style={styles.descriptionInput}
              accessibilityLabel="Description"
              returnKeyType="next"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Pressable onPress={pickCurrency} style={styles.currencyPill} accessibilityLabel={`Currency ${currency}`} accessibilityRole="button">
              <AppText variant="subhead" weight="700" tone="brand">
                {currency}
              </AppText>
              <Icon name="chevronDown" size={10} color={colors.brand} />
            </Pressable>
            <AppText style={styles.symbol}>{currencySymbol(currency)}</AppText>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0.00"
              placeholderTextColor={colors.tertiaryLabel}
              keyboardType="decimal-pad"
              style={styles.amountInput}
              accessibilityLabel="Amount"
            />
          </View>
        </Card>

        {groupMembers ? (
          <GroupMemberSelector
            members={groupMembers}
            selectedIds={participants.map((p) => p.id)}
            currentUserId={currentUserId}
            onToggle={handleToggleGroupMember}
          />
        ) : (
          <ParticipantPicker
            participants={participants}
            currentUserId={currentUserId}
            onAdd={handleAddParticipant}
            onRemove={handleRemoveParticipant}
          />
        )}

        <View style={styles.block}>
          <AppText variant="footnote" tone="secondary" weight="600" style={styles.blockLabel}>
            PAID BY
          </AppText>
          <View style={styles.chips}>
            {participants.map((p) => (
              <Chip
                key={p.id}
                label={p.id === currentUserId ? 'You' : p.displayName}
                selected={payerId === p.id}
                onPress={() => setPayerId(p.id)}
              />
            ))}
          </View>
        </View>

        {amountMinorUnits !== null && amountMinorUnits > 0 && participants.length >= 2 && (
          <SplitEditor
            splitType={splitType}
            onSplitTypeChange={setSplitType}
            participants={participants}
            totalAmountMinorUnits={amountMinorUnits}
            currency={currency}
            currentUserId={currentUserId}
            values={splitValues}
            onValuesChange={setSplitValues}
          />
        )}

        <TextField
          label="Notes"
          icon="note"
          placeholder="Optional details, e.g. receipt number"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {error && <Banner tone="error">{error}</Banner>}

        <Button title={submitLabel} icon="check" onPress={handleSubmit} loading={isSubmitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  context: { alignSelf: 'center' },
  hero: { padding: 0 },
  descriptionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  categoryBadge: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  descriptionInput: { ...typography.title3, flex: 1, color: colors.label, outlineStyle: 'solid', outlineWidth: 0, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: spacing.lg },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
  },
  symbol: { ...typography.title1, color: colors.tertiaryLabel, marginLeft: spacing.xs },
  amountInput: { ...typography.largeTitle, flex: 1, color: colors.label, outlineStyle: 'solid', outlineWidth: 0, paddingVertical: 0, minWidth: 0 },
  block: { gap: spacing.sm },
  blockLabel: { marginLeft: spacing.lg, letterSpacing: 0.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
