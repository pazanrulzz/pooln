import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { CounterpartBalance } from '@pooln/shared';
import * as balancesApi from '../../../api/balances';
import { formatMoney } from '../../../lib/money';

function BalanceRow({ balance }: { balance: CounterpartBalance }) {
  return (
    <Link href={`/balances/${balance.userId}`} asChild>
      <Pressable style={styles.row}>
        <Text style={styles.name}>{balance.displayName}</Text>
        {balance.balances.length === 0 ? (
          <Text style={styles.settled}>Settled up</Text>
        ) : (
          <View style={styles.amounts}>
            {balance.balances.map((line) => (
              <Text
                key={line.currency}
                style={[styles.amount, line.amountMinorUnits >= 0 ? styles.positive : styles.negative]}
              >
                {line.amountMinorUnits >= 0 ? 'owes you ' : 'you owe '}
                {formatMoney(Math.abs(line.amountMinorUnits), line.currency)}
              </Text>
            ))}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

export default function ExpensesList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['balances'],
    queryFn: balancesApi.listBalances,
  });

  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator style={styles.spinner} />}
      {isError && <Text style={styles.error}>Couldn&apos;t load expenses.</Text>}
      {data && (
        <FlatList
          data={data}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => <BalanceRow balance={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No expenses yet. Add one to get started.</Text>}
          contentContainerStyle={data.length === 0 && styles.emptyContainer}
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
  name: { fontSize: 16, fontWeight: '600' },
  settled: { fontSize: 13, color: '#666' },
  amounts: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 14, fontWeight: '600' },
  positive: { color: '#1a7f37' },
  negative: { color: '#d92d20' },
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
