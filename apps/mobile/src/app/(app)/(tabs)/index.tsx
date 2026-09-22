import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { CounterpartBalance } from '@pooln/shared';
import * as balancesApi from '../../../api/balances';
import { formatMoney } from '../../../lib/money';
import { useTabBarClearance } from '../../../components/FloatingTabBar';
import { GlassToolbar } from '../../../components/GlassToolbar';

function BalanceRow({ balance }: { balance: CounterpartBalance }) {
  return (
    <Link href={`/balances/${balance.userId}`} asChild>
      <Pressable style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.name}>{balance.displayName}</Text>
          {balance.balances.length === 0 ? (
            <Text style={styles.settled}>Settled up</Text>
          ) : (
            balance.balances.map((line) => (
              <Text key={line.currency} style={styles.detail}>
                {line.amountMinorUnits >= 0 ? 'Owes you ' : 'You owe '}
                {formatMoney(Math.abs(line.amountMinorUnits), line.currency)}
              </Text>
            ))
          )}
        </View>

        {balance.balances.length > 0 && (
          <View style={styles.amounts}>
            {balance.balances.map((line) => (
              <View key={line.currency} style={styles.amountBlock}>
                <Text
                  style={[styles.amountLabel, line.amountMinorUnits >= 0 ? styles.positive : styles.negative]}
                >
                  {line.amountMinorUnits >= 0 ? "You're owed" : 'You owe'}
                </Text>
                <Text style={[styles.amount, line.amountMinorUnits >= 0 ? styles.positive : styles.negative]}>
                  {formatMoney(Math.abs(line.amountMinorUnits), line.currency)}
                </Text>
              </View>
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
  const fabBottom = useTabBarClearance();

  return (
    <View style={styles.host}>
      <GlassToolbar title="Expenses" />

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
          <Pressable style={StyleSheet.flatten([styles.fab, { bottom: fabBottom }])}>
            <Text style={styles.fabText}>＋</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  container: { flex: 1 },
  spinner: { marginTop: 40 },
  error: { color: '#d92d20', padding: 20 },
  empty: { color: '#666', textAlign: 'center', padding: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  left: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 13, color: '#666' },
  settled: { fontSize: 13, color: '#666' },
  amounts: { alignItems: 'flex-end', gap: 6 },
  amountBlock: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 12 },
  amount: { fontSize: 16, fontWeight: '700' },
  positive: { color: '#34a853' },
  negative: { color: '#ff3b30' },
  fab: {
    position: 'absolute',
    right: 20,
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
