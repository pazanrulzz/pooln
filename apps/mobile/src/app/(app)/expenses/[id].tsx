import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
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

  return (
    <View style={styles.container}>
      <Text style={styles.description}>{expense.description}</Text>
      <Text style={styles.amount}>{formatMoney(expense.amountMinorUnits, expense.currency)}</Text>
      {expense.notes && <Text style={styles.notes}>{expense.notes}</Text>}

      <View style={styles.participants}>
        {expense.participants.map((p) => (
          <View key={p.userId} style={styles.participantRow}>
            <Text style={styles.participantName}>
              {p.userId === me?.id ? 'You' : p.displayName}
              {p.userId === expense.payerId ? ' (paid)' : ''}
            </Text>
            <Text style={styles.participantAmount}>
              owes {formatMoney(p.owedAmountMinorUnits, expense.currency)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Link href={`/expenses/${expense.id}/edit`} asChild>
          <Pressable style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </Link>
        <Pressable style={styles.deleteButton} onPress={confirmDelete} disabled={deleteMutation.isPending}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  spinner: { marginTop: 40 },
  error: { color: '#d92d20', padding: 20 },
  description: { fontSize: 22, fontWeight: '700' },
  amount: { fontSize: 28, fontWeight: '700' },
  notes: { color: '#666' },
  participants: { marginTop: 12, gap: 8 },
  participantRow: { flexDirection: 'row', justifyContent: 'space-between' },
  participantName: { fontSize: 15 },
  participantAmount: { color: '#666' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  editButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  editButtonText: { fontWeight: '600' },
  deleteButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fdecea',
  },
  deleteButtonText: { fontWeight: '600', color: '#d92d20' },
});
