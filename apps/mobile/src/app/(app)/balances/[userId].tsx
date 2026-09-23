import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as balancesApi from '../../../api/balances';
import * as expensesApi from '../../../api/expenses';
import * as settlementsApi from '../../../api/settlements';
import { formatMoney } from '../../../lib/money';
import { getExpenseIcon } from '../../../lib/expenseIcon';
import {
  AppText,
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  ListSection,
  RowIcon,
  SearchBar,
  SegmentedControl,
  SkeletonList,
  colors,
  spacing,
} from '../../../ui';

type Tab = 'expenses' | 'payments';

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BalanceDetail() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [tab, setTab] = useState<Tab>('expenses');
  const [query, setQuery] = useState('');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const balanceQuery = useQuery({ queryKey: ['balances', userId], queryFn: () => balancesApi.getBalanceWith(userId) });
  const expensesQuery = useQuery({
    queryKey: ['expenses', { withUserId: userId }],
    queryFn: () => expensesApi.listExpenses({ withUserId: userId, limit: 100 }),
  });
  const settlementsQuery = useQuery({
    queryKey: ['settlements', { withUserId: userId }],
    queryFn: () => settlementsApi.listSettlements({ withUserId: userId, limit: 100 }),
  });
  const balance = balanceQuery.data;

  const expenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = expensesQuery.data?.expenses ?? [];
    return q ? all.filter((e) => `${e.description} ${e.notes ?? ''}`.toLowerCase().includes(q)) : all;
  }, [expensesQuery.data, query]);

  if (balanceQuery.isLoading || !me) {
    return (
      <View style={styles.padded}>
        <SkeletonList rows={4} />
      </View>
    );
  }
  if (balanceQuery.isError || !balance) return <ErrorState message="Couldn't load this balance." onRetry={balanceQuery.refetch} />;

  const settled = balance.balances.length === 0;
  const firstName = balance.displayName.split(' ')[0];
  const settlements = settlementsQuery.data?.settlements ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={balanceQuery.isRefetching}
          onRefresh={() => {
            balanceQuery.refetch();
            expensesQuery.refetch();
            settlementsQuery.refetch();
          }}
          tintColor={colors.brand}
        />
      }
    >
      <View style={styles.hero}>
        <Avatar name={balance.displayName} uri={balance.avatarUrl} size={88} />
        <AppText variant="title1" align="center">
          {balance.displayName}
        </AppText>
        {settled ? (
          <AppText variant="headline" tone="secondary">
            You’re all settled up
          </AppText>
        ) : (
          balance.balances.map((line) => (
            <AppText key={line.currency} variant="title3" tone={line.amountMinorUnits >= 0 ? 'positive' : 'negative'} align="center">
              {line.amountMinorUnits >= 0 ? `${firstName} owes you ` : `You owe ${firstName} `}
              {formatMoney(Math.abs(line.amountMinorUnits), line.currency)}
            </AppText>
          ))
        )}
        <Button
          title={settled ? 'Record a payment' : 'Settle up'}
          icon="banknote"
          variant={settled ? 'tinted' : 'filled'}
          size="md"
          block={false}
          style={styles.settle}
          onPress={() => router.push(`/settle/${userId}`)}
        />
      </View>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'expenses', label: `Expenses (${expensesQuery.data?.total ?? 0})` },
          { value: 'payments', label: `Payments (${settlementsQuery.data?.total ?? 0})` },
        ]}
      />

      {tab === 'expenses' && (
        <>
          {(expensesQuery.data?.expenses.length ?? 0) > 0 && (
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search shared expenses" />
          )}
          {expensesQuery.isLoading && <SkeletonList rows={3} />}
          {expensesQuery.data?.expenses.length === 0 && (
            <EmptyState icon="receipt" title="No shared expenses" message={`Expenses you split with ${firstName} will appear here.`} />
          )}
          {expenses.length > 0 ? (
            <ListSection separatorInset={58}>
              {expenses.map((e) => {
                const icon = getExpenseIcon(e.description);
                // Only the part of this expense that's between you and this person
                // (single-payer model) — so the rows add up to the balance above.
                const theirShare = e.participants.find((p) => p.userId === userId)?.owedAmountMinorUnits ?? 0;
                const myShare = e.participants.find((p) => p.userId === me.id)?.owedAmountMinorUnits ?? 0;
                const net = e.payerId === me.id ? theirShare : e.payerId === userId ? -myShare : 0;
                return (
                  <ListRow
                    key={e.id}
                    title={e.description}
                    subtitle={`${formatMoney(e.amountMinorUnits, e.currency)} · ${shortDate(e.date)}`}
                    leading={<RowIcon name={icon.name} color={icon.color} />}
                    onPress={() => router.push(`/expenses/${e.id}`)}
                    trailing={
                      net !== 0 ? (
                        <AppText variant="subhead" weight="600" tone={net > 0 ? 'positive' : 'negative'}>
                          {net > 0 ? '+' : '−'}
                          {formatMoney(Math.abs(net), e.currency)}
                        </AppText>
                      ) : (
                        <AppText variant="caption" tone="tertiary">
                          not between you
                        </AppText>
                      )
                    }
                  />
                );
              })}
            </ListSection>
          ) : (
            (expensesQuery.data?.expenses.length ?? 0) > 0 && <EmptyState icon="search" title="No matches" />
          )}
        </>
      )}

      {tab === 'payments' &&
        (settlements.length === 0 ? (
          <EmptyState icon="banknote" title="No payments yet" message="Settlements you record will show up here." />
        ) : (
          <ListSection separatorInset={58}>
            {settlements.map((s) => {
              const fromMe = s.fromUserId === me.id;
              return (
                <ListRow
                  key={s.id}
                  title={fromMe ? `You paid ${firstName}` : `${firstName} paid you`}
                  subtitle={s.note ? `${s.note} · ${shortDate(s.settledAt)}` : shortDate(s.settledAt)}
                  leading={<RowIcon name="banknote" color={colors.positive} />}
                  trailing={
                    <AppText variant="subhead" weight="600" tone={fromMe ? 'label' : 'positive'}>
                      {formatMoney(s.amountMinorUnits, s.currency)}
                    </AppText>
                  }
                />
              );
            })}
          </ListSection>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.lg },
  container: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  hero: { alignItems: 'center', gap: spacing.sm },
  settle: { alignSelf: 'center', marginTop: spacing.sm },
});
