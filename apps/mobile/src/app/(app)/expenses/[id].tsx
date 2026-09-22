import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Host, Text as UIText } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import type { ExpenseParticipantDTO } from '@pooln/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as expensesApi from '../../../api/expenses';
import { confirm } from '../../../lib/confirm';
import { formatMoney } from '../../../lib/money';

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const {
    data: expense,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesApi.getExpense(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      router.back();
    },
  });

  const confirmDelete = async () => {
    const confirmed = await confirm('Delete expense?', 'This cannot be undone.');
    if (confirmed) deleteMutation.mutate();
  };

  if (isLoading) return <ActivityIndicator style={styles.spinner} />;
  if (isError || !expense) return <Text style={styles.error}>Couldn&apos;t load this expense.</Text>;

  // Single-payer model: if you paid, everyone else who owes is a settle
  // target; if someone else paid, only the payer is (you owe them).
  const isSettleTarget = (p: ExpenseParticipantDTO) =>
    p.userId !== me?.id &&
    p.owedAmountMinorUnits > 0 &&
    (expense.payerId === me?.id || p.userId === expense.payerId);

  return (
    <Host style={styles.container} colorScheme="light" ignoreSafeArea="all">
      <UIText textStyle={styles.descriptionText}>{expense.description}</UIText>
      <Text style={styles.amount}>{formatMoney(expense.amountMinorUnits, expense.currency)}</Text>
      {expense.notes && <Text style={styles.notes}>{expense.notes}</Text>}

      <View style={styles.participants}>
        {expense.participants.map((p) => (
          <View key={p.userId} style={styles.participantRow}>
            <View>
              <Text style={styles.participantName}>
                {p.userId === me?.id ? 'You' : p.displayName}
                {p.userId === expense.payerId ? ' (paid)' : ''}
              </Text>
              <Text style={styles.participantAmount}>
                owes {formatMoney(p.owedAmountMinorUnits, expense.currency)}
              </Text>
            </View>
            {isSettleTarget(p) && (
              <Button
                variant="text"
                onPress={() => router.push(`/settle/${p.userId}`)}
                style={styles.settleButton}
              >
                <UIText textStyle={styles.settleButtonText}>Settle up</UIText>
              </Button>
            )}
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <View style={styles.actionFlex}>
          <Button variant="text" onPress={() => router.push(`/expenses/${expense.id}/edit`)} style={styles.editButton}>
            <UIText textStyle={styles.editButtonText}>Edit</UIText>
          </Button>
        </View>
        <View style={styles.actionFlex}>
          <Button variant="text" onPress={confirmDelete} disabled={deleteMutation.isPending} style={styles.deleteButton}>
            <UIText textStyle={styles.deleteButtonText}>Delete</UIText>
          </Button>
        </View>
      </View>
    </Host>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  spinner: { marginTop: 40 },
  error: { color: '#d92d20', padding: 20 },
  descriptionText: { fontSize: 22, fontWeight: '700', color: '#000' },
  amount: { fontSize: 28, fontWeight: '700' },
  notes: { color: '#666' },
  participants: { marginTop: 12, gap: 8 },
  participantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  participantName: { fontSize: 15 },
  participantAmount: { color: '#666' },
  settleButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  settleButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionFlex: { flex: 1 },
  editButton: {
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#eee',
  },
  editButtonText: { fontWeight: '600', color: '#000' },
  deleteButton: {
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#fdecea',
  },
  deleteButtonText: { fontWeight: '600', color: '#d92d20' },
});
