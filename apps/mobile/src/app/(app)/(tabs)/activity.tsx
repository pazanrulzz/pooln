import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { ActivityItemDTO } from '@pooln/shared';
import * as authApi from '../../../api/auth';
import * as activityApi from '../../../api/activity';
import { formatMoney } from '../../../lib/money';
import { formatRelativeTime } from '../../../lib/time';
import { getExpenseIcon, SETTLEMENT_ICON, type ExpenseIcon } from '../../../lib/expenseIcon';
import { useTabBarClearance } from '../../../components/FloatingTabBar';
import {
  AppText,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  LargeHeader,
  SearchBar,
  SkeletonList,
  colors,
  spacing,
} from '../../../ui';

type Filter = 'all' | 'expenses' | 'payments';

function activityKey(item: ActivityItemDTO): string {
  const id = item.type === 'settlement_created' ? item.settlement.id : item.expense.id;
  return `${item.type}:${id}`;
}

function monthLabel(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Groups already-sorted (most recent first) items into consecutive month/year sections. */
function groupByMonth(items: ActivityItemDTO[]) {
  const sections: { title: string; data: ActivityItemDTO[] }[] = [];
  for (const item of items) {
    const title = monthLabel(item.timestamp);
    const current = sections[sections.length - 1];
    if (current?.title === title) current.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}

function searchableText(item: ActivityItemDTO): string {
  if (item.type === 'settlement_created') {
    const s = item.settlement;
    return `${s.fromDisplayName} ${s.toDisplayName} ${s.note ?? ''} payment`;
  }
  const e = item.expense;
  return `${e.description} ${e.notes ?? ''} ${e.participants.map((p) => p.displayName).join(' ')}`;
}

function IconBadge({ icon }: { icon: ExpenseIcon }) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
      <Icon name={icon.name} size={19} color="#fff" />
    </View>
  );
}

function ActivityCard({ item, currentUserId }: { item: ActivityItemDTO; currentUserId: string }) {
  const timestamp = formatRelativeTime(item.timestamp);

  if (item.type === 'settlement_created') {
    const s = item.settlement;
    const fromMe = s.fromUserId === currentUserId;
    const toMe = s.toUserId === currentUserId;
    const fromName = fromMe ? 'You' : s.fromDisplayName;
    const toName = toMe ? 'you' : s.toDisplayName;

    return (
      <Card>
        <View style={styles.row}>
          <IconBadge icon={SETTLEMENT_ICON} />
          <View style={styles.text}>
            <AppText variant="subhead" numberOfLines={2}>
              <AppText variant="subhead" weight="600">
                {fromName}
              </AppText>{' '}
              paid{' '}
              <AppText variant="subhead" weight="600">
                {toName}
              </AppText>
            </AppText>
            <AppText variant="footnote" tone="secondary">
              {s.note ? `${s.note} · ${timestamp}` : timestamp}
            </AppText>
          </View>
          <AppText variant="headline" tone={toMe ? 'positive' : fromMe ? 'negative' : 'label'}>
            {formatMoney(s.amountMinorUnits, s.currency)}
          </AppText>
        </View>
      </Card>
    );
  }

  const e = item.expense;
  const actor = e.participants.find((p) => p.userId === e.createdById);
  const actorName = e.createdById === currentUserId ? 'You' : (actor?.displayName ?? 'Someone');
  const verb = item.type === 'expense_created' ? 'added' : 'updated';

  // Your net position on this expense: what you paid minus your share.
  const me = e.participants.find((p) => p.userId === currentUserId);
  const net = me ? me.paidAmountMinorUnits - me.owedAmountMinorUnits : 0;

  return (
    <Card onPress={() => router.push(`/expenses/${e.id}`)} accessibilityLabel={e.description}>
      <View style={styles.row}>
        <IconBadge icon={getExpenseIcon(e.description)} />
        <View style={styles.text}>
          <AppText variant="subhead" numberOfLines={2}>
            {actorName} {verb}{' '}
            <AppText variant="subhead" weight="600">
              {e.description}
            </AppText>
          </AppText>
          <AppText variant="footnote" tone="secondary">
            {formatMoney(e.amountMinorUnits, e.currency)} total · {timestamp}
          </AppText>
        </View>
        {net !== 0 && (
          <View style={styles.share}>
            <AppText variant="caption" tone={net > 0 ? 'positive' : 'negative'}>
              {net > 0 ? 'you lent' : 'you borrowed'}
            </AppText>
            <AppText variant="headline" tone={net > 0 ? 'positive' : 'negative'}>
              {formatMoney(Math.abs(net), e.currency)}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}

const FILTERS: { value: Filter; label: string; icon: 'list' | 'receipt' | 'banknote' }[] = [
  { value: 'all', label: 'All', icon: 'list' },
  { value: 'expenses', label: 'Expenses', icon: 'receipt' },
  { value: 'payments', label: 'Payments', icon: 'banknote' },
];

export default function Activity() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['activity'],
    queryFn: () => activityApi.listActivity(100),
  });
  const bottomPadding = useTabBarClearance();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = (data?.items ?? []).filter((item) => {
      if (filter === 'expenses' && item.type === 'settlement_created') return false;
      if (filter === 'payments' && item.type !== 'settlement_created') return false;
      return !q || searchableText(item).toLowerCase().includes(q);
    });
    return groupByMonth(items);
  }, [data, query, filter]);

  const hasAny = (data?.items.length ?? 0) > 0;

  return (
    <View style={styles.screen}>
      <LargeHeader title="Activity">
        {hasAny && (
          <>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search expenses, people, notes" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTERS.map((f) => (
                <Chip key={f.value} label={f.label} icon={f.icon} selected={filter === f.value} onPress={() => setFilter(f.value)} />
              ))}
            </ScrollView>
          </>
        )}
      </LargeHeader>

      {isLoading && (
        <View style={styles.padded}>
          <SkeletonList rows={5} />
        </View>
      )}
      {isError && <ErrorState message="Couldn't load activity." onRetry={refetch} />}

      {data && me && (
        <SectionList
          sections={sections}
          keyExtractor={activityKey}
          renderItem={({ item }) => <ActivityCard item={item} currentUserId={me.id} />}
          renderSectionHeader={({ section }) => (
            <AppText variant="headline" style={styles.sectionHeader}>
              {section.title}
            </AppText>
          )}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          ListEmptyComponent={
            hasAny ? (
              <EmptyState icon="search" title="Nothing found" message="Try another search or filter." />
            ) : (
              <EmptyState
                icon="activity"
                title="No activity yet"
                message="Expenses and payments you and your friends add will show up here."
              />
            )
          }
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.lg },
  filters: { gap: spacing.sm },
  list: { paddingHorizontal: spacing.lg },
  sectionHeader: { backgroundColor: colors.background, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  gap: { height: spacing.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBadge: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  share: { alignItems: 'flex-end' },
});
