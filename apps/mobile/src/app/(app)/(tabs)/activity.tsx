import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { ActivityItemDTO } from '@pooln/shared';
import * as authApi from '../../../api/auth';
import * as activityApi from '../../../api/activity';
import { formatMoney } from '../../../lib/money';
import { formatRelativeTime } from '../../../lib/time';
import { GlassToolbar } from '../../../components/GlassToolbar';

function activityKey(item: ActivityItemDTO): string {
  const id = item.type === 'settlement_created' ? item.settlement.id : item.expense.id;
  return `${item.type}:${id}`;
}

function ActivityRow({ item, currentUserId }: { item: ActivityItemDTO; currentUserId: string }) {
  const timestamp = formatRelativeTime(item.timestamp);

  if (item.type === 'expense_created' || item.type === 'expense_updated') {
    const { expense } = item;
    const actor = expense.participants.find((p) => p.userId === expense.createdById);
    const actorName = expense.createdById === currentUserId ? 'You' : (actor?.displayName ?? 'Someone');
    const verb = item.type === 'expense_created' ? 'added' : 'updated';

    return (
      <Link href={`/expenses/${expense.id}`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.title}>
            {actorName} {verb} <Text style={styles.bold}>{expense.description}</Text>
          </Text>
          <Text style={styles.meta}>
            {formatMoney(expense.amountMinorUnits, expense.currency)} · {timestamp}
          </Text>
        </Pressable>
      </Link>
    );
  }

  const { settlement } = item;
  const fromName = settlement.fromUserId === currentUserId ? 'You' : settlement.fromDisplayName;
  const toName = settlement.toUserId === currentUserId ? 'you' : settlement.toDisplayName;

  return (
    <View style={styles.row}>
      <Text style={styles.title}>
        {fromName} paid {toName}
      </Text>
      <Text style={styles.meta}>
        {formatMoney(settlement.amountMinorUnits, settlement.currency)} · {timestamp}
      </Text>
    </View>
  );
}

export default function Activity() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['activity'],
    queryFn: () => activityApi.listActivity(),
  });

  return (
    <View style={styles.host}>
      <GlassToolbar title="Activity" />

      <View style={styles.container}>
        {isLoading && <ActivityIndicator style={styles.spinner} />}
        {isError && <Text style={styles.error}>Couldn&apos;t load activity.</Text>}
        {data && me && (
          <FlatList
            data={data.items}
            keyExtractor={activityKey}
            renderItem={({ item }) => <ActivityRow item={item} currentUserId={me.id} />}
            ListEmptyComponent={<Text style={styles.empty}>No activity yet.</Text>}
            contentContainerStyle={data.items.length === 0 && styles.emptyContainer}
          />
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  title: { fontSize: 15 },
  bold: { fontWeight: '600' },
  meta: { color: '#666', fontSize: 13 },
});
