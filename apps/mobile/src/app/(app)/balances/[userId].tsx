import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as balancesApi from '../../../api/balances';
import * as expensesApi from '../../../api/expenses';
import { formatMoney } from '../../../lib/money';

export default function BalanceDetail() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['balances', userId],
    queryFn: () => balancesApi.getBalanceWith(userId),
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', { withUserId: userId }],
    queryFn: () => expensesApi.listExpenses({ withUserId: userId }),
  });

  if (balanceLoading || expensesLoading || !balance) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{balance.displayName}</Text>
        {balance.balances.length === 0 && <Text style={styles.settled}>Settled up</Text>}
        {balance.balances.map((line) => (
          <Text
            key={line.currency}
            style={[styles.net, line.amountMinorUnits >= 0 ? styles.positive : styles.negative]}
          >
            {line.amountMinorUnits >= 0 ? 'owes you ' : 'you owe '}
            {formatMoney(Math.abs(line.amountMinorUnits), line.currency)}
          </Text>
        ))}

        <Link href={`/settle/${userId}`} asChild>
          <Pressable style={styles.settleButton}>
            <Text style={styles.settleButtonText}>Settle up</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={expensesData?.expenses ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/expenses/${item.id}`} asChild>
            <Pressable style={styles.expenseRow}>
              <Text style={styles.expenseDescription}>{item.description}</Text>
              <Text style={styles.expenseAmount}>{formatMoney(item.amountMinorUnits, item.currency)}</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No shared expenses yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  spinner: { marginTop: 40 },
  header: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: { fontSize: 20, fontWeight: '700' },
  net: { fontSize: 18, fontWeight: '600' },
  settled: { fontSize: 16, color: '#666' },
  positive: { color: '#1a7f37' },
  negative: { color: '#d92d20' },
  settleButton: {
    marginTop: 8,
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  settleButtonText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#666', textAlign: 'center', padding: 20 },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  expenseDescription: { fontSize: 15 },
  expenseAmount: { color: '#666' },
});
