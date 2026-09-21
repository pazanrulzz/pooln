import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { ExpenseDTO } from '@pooln/shared';
import * as authApi from '../../../api/auth';
import * as expensesApi from '../../../api/expenses';
import { formatMoney } from '../../../lib/money';

function ExpenseRow({ expense, currentUserId }: { expense: ExpenseDTO; currentUserId: string }) {
  const you = expense.participants.find((p) => p.userId === currentUserId);
  const isPayer = expense.payerId === currentUserId;
  const netMinorUnits = you ? you.paidAmountMinorUnits - you.owedAmountMinorUnits : 0;

  return (
    <Link href={`/expenses/${expense.id}`} asChild>
      <Pressable style={styles.row}>
        <View style={styles.rowMain}>
          <Text style={styles.description}>{expense.description}</Text>
          <Text style={styles.meta}>
            {isPayer ? 'You paid' : `${expense.participants.find((p) => p.userId === expense.payerId)?.displayName ?? 'Someone'} paid`}{' '}
            {formatMoney(expense.amountMinorUnits, expense.currency)}
          </Text>
        </View>
        <Text style={[styles.net, netMinorUnits >= 0 ? styles.netPositive : styles.netNegative]}>
          {netMinorUnits === 0 ? '' : formatMoney(Math.abs(netMinorUnits), expense.currency)}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function ExpensesList() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expensesApi.listExpenses(),
  });

  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator style={styles.spinner} />}
      {isError && <Text style={styles.error}>Couldn&apos;t load expenses.</Text>}
      {data && me && (
        <FlatList
          data={data.expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpenseRow expense={item} currentUserId={me.id} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No expenses yet. Add one to get started.</Text>
          }
          contentContainerStyle={data.expenses.length === 0 && styles.emptyContainer}
        />
      )}

      <Link href="/expenses/new" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  spinner: { marginTop: 40 },
  error: { color: '#d92d20', padding: 20 },
  empty: { color: '#666', textAlign: 'center', padding: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowMain: { flexShrink: 1, gap: 2 },
  description: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666', fontSize: 13 },
  net: { fontSize: 15, fontWeight: '600' },
  netPositive: { color: '#1a7f37' },
  netNegative: { color: '#d92d20' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#208aef',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
