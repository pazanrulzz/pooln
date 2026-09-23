import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { CounterpartBalance } from '@pooln/shared';
import * as balancesApi from '../../../api/balances';
import { formatMoney } from '../../../lib/money';
import { useTabBarClearance } from '../../../components/FloatingTabBar';
import {
  AppText,
  Avatar,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  LargeHeader,
  ListRow,
  ListSection,
  SearchBar,
  SegmentedControl,
  SkeletonList,
  colors,
  gradients,
  radius,
  spacing,
} from '../../../ui';

type Filter = 'all' | 'owed' | 'owe';

function totalsByCurrency(balances: CounterpartBalance[]) {
  const totals = new Map<string, { owed: number; owe: number }>();
  for (const person of balances) {
    for (const line of person.balances) {
      const t = totals.get(line.currency) ?? { owed: 0, owe: 0 };
      if (line.amountMinorUnits >= 0) t.owed += line.amountMinorUnits;
      else t.owe += -line.amountMinorUnits;
      totals.set(line.currency, t);
    }
  }
  return [...totals.entries()].map(([currency, t]) => ({ currency, ...t, net: t.owed - t.owe }));
}

function SummaryCard({ balances }: { balances: CounterpartBalance[] }) {
  const totals = totalsByCurrency(balances);
  const primary = totals[0];

  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
      <View style={styles.summaryTop}>
        <AppText variant="footnote" weight="600" style={styles.summaryEyebrow}>
          OVERALL BALANCE
        </AppText>
        <Icon name="sparkles" size={16} color="rgba(255,255,255,0.8)" />
      </View>

      {!primary ? (
        <>
          <AppText variant="title1" tone="onBrand">
            All settled up
          </AppText>
          <AppText variant="subhead" style={styles.summaryMuted}>
            Nobody owes anybody. Nice.
          </AppText>
        </>
      ) : (
        <>
          {totals.map((t) => (
            <View key={t.currency}>
              <AppText variant="subhead" style={styles.summaryMuted}>
                {t.net >= 0 ? 'You are owed' : 'You owe'}
              </AppText>
              <AppText variant="largeTitle" tone="onBrand">
                {formatMoney(Math.abs(t.net), t.currency)}
              </AppText>
            </View>
          ))}
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(52,199,89,0.28)' }]}>
                <Icon name="arrowDownLeft" size={12} color="#fff" />
              </View>
              <View>
                <AppText variant="caption" style={styles.summaryMuted}>
                  Owed to you
                </AppText>
                <AppText variant="headline" tone="onBrand">
                  {formatMoney(primary.owed, primary.currency)}
                </AppText>
              </View>
            </View>
            <View style={styles.summaryStat}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255,69,58,0.3)' }]}>
                <Icon name="arrowUpRight" size={12} color="#fff" />
              </View>
              <View>
                <AppText variant="caption" style={styles.summaryMuted}>
                  You owe
                </AppText>
                <AppText variant="headline" tone="onBrand">
                  {formatMoney(primary.owe, primary.currency)}
                </AppText>
              </View>
            </View>
          </View>
        </>
      )}
    </LinearGradient>
  );
}

function BalanceRow({ person }: { person: CounterpartBalance }) {
  const settled = person.balances.length === 0;
  const subtitle = settled
    ? 'Settled up'
    : person.balances
        .map((l) => `${l.amountMinorUnits >= 0 ? 'Owes you' : 'You owe'} ${formatMoney(Math.abs(l.amountMinorUnits), l.currency)}`)
        .join(' · ');

  return (
    <ListRow
      title={person.displayName}
      subtitle={subtitle}
      leading={<Avatar name={person.displayName} uri={person.avatarUrl} size={42} />}
      onPress={() => router.push(`/balances/${person.userId}`)}
      trailing={
        settled ? undefined : (
          <View style={styles.amounts}>
            {person.balances.map((l) => (
              <AppText
                key={l.currency}
                variant="headline"
                tone={l.amountMinorUnits >= 0 ? 'positive' : 'negative'}
              >
                {l.amountMinorUnits >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(l.amountMinorUnits), l.currency)}
              </AppText>
            ))}
          </View>
        )
      }
    />
  );
}

export default function ExpensesHome() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['balances'],
    queryFn: balancesApi.listBalances,
  });
  const bottomPadding = useTabBarClearance();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((person) => {
      if (q && !person.displayName.toLowerCase().includes(q)) return false;
      if (filter === 'owed') return person.balances.some((l) => l.amountMinorUnits > 0);
      if (filter === 'owe') return person.balances.some((l) => l.amountMinorUnits < 0);
      return true;
    });
  }, [data, query, filter]);

  const addExpense = () => router.push('/expenses/new');

  return (
    <View style={styles.screen}>
      <LargeHeader
        title="Expenses"
        actions={<IconButton icon="plus" variant="filled" onPress={addExpense} accessibilityLabel="Add expense" />}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading && <SkeletonList rows={5} />}
        {isError && <ErrorState message="Couldn't load your balances." onRetry={refetch} />}

        {data && data.length === 0 && (
          <EmptyState
            icon="wallet"
            title="No expenses yet"
            message="Add an expense to start splitting costs with friends and groups."
            actionLabel="Add expense"
            onAction={addExpense}
          />
        )}

        {data && data.length > 0 && (
          <>
            <SummaryCard balances={data} />

            <View style={styles.controls}>
              <SearchBar value={query} onChangeText={setQuery} placeholder="Search friends" />
              <SegmentedControl
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'owed', label: 'Owed to you' },
                  { value: 'owe', label: 'You owe' },
                ]}
              />
            </View>

            {visible.length > 0 ? (
              <ListSection title={`Friends · ${visible.length}`} separatorInset={70}>
                {visible.map((person) => (
                  <BalanceRow key={person.userId} person={person} />
                ))}
              </ListSection>
            ) : (
              <EmptyState icon="search" title="No matches" message="Try a different name or filter." />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xl },
  summary: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm, boxShadow: '0px 12px 30px rgba(79,91,213,0.3)' },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryEyebrow: { color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8 },
  summaryMuted: { color: 'rgba(255,255,255,0.78)' },
  summaryStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  summaryStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  statIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  controls: { gap: spacing.md },
  amounts: { alignItems: 'flex-end' },
});
