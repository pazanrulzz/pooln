import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ExpenseParticipantDTO, SplitType } from '@pooln/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as expensesApi from '../../../api/expenses';
import * as groupsApi from '../../../api/groups';
import { formatMoney } from '../../../lib/money';
import { getExpenseIcon } from '../../../lib/expenseIcon';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  ErrorState,
  Icon,
  ListRow,
  ListSection,
  RowIcon,
  SkeletonList,
  colors,
  confirmDialog,
  radius,
  showToast,
  spacing,
} from '../../../ui';

const SPLIT_LABEL: Record<SplitType, string> = {
  EQUAL: 'Split equally',
  EXACT: 'Split by amount',
  PERCENTAGE: 'Split by percent',
  SHARES: 'Split by shares',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data: expense, isLoading, isError, refetch } = useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesApi.getExpense(id),
  });
  const groupId = expense?.groupId ?? undefined;
  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupsApi.getGroup(groupId!),
    enabled: !!groupId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      showToast('Expense deleted');
      router.back();
    },
    onError: () => showToast("Couldn't delete this expense", 'error'),
  });

  const confirmDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete expense?',
      message: 'Balances will be recalculated for everyone involved.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  if (isLoading || !me) {
    return (
      <View style={styles.padded}>
        <SkeletonList rows={4} />
      </View>
    );
  }
  if (isError || !expense) return <ErrorState message="Couldn't load this expense." onRetry={refetch} />;

  const icon = getExpenseIcon(expense.description);
  const payer = expense.participants.find((p) => p.userId === expense.payerId);
  const nameOf = (p: { userId: string; displayName: string }) => (p.userId === me.id ? 'You' : p.displayName);
  const creator = expense.participants.find((p) => p.userId === expense.createdById);
  const mine = expense.participants.find((p) => p.userId === me.id);
  const net = mine ? mine.paidAmountMinorUnits - mine.owedAmountMinorUnits : 0;

  // Single-payer model: if you paid, everyone else who owes is a settle
  // target; if someone else paid, only the payer is (you owe them).
  const isSettleTarget = (p: ExpenseParticipantDTO) =>
    p.userId !== me.id && p.owedAmountMinorUnits > 0 && (expense.payerId === me.id || p.userId === expense.payerId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: icon.color }]}>
          <Icon name={icon.name} size={30} color="#fff" />
        </View>
        <AppText variant="title2" align="center">
          {expense.description}
        </AppText>
        <AppText variant="largeTitle" align="center">
          {formatMoney(expense.amountMinorUnits, expense.currency)}
        </AppText>
        <AppText variant="subhead" tone="secondary" align="center">
          Paid by {payer ? nameOf(payer) : 'someone'} · {formatDate(expense.date)}
        </AppText>
        <View style={styles.chips}>
          {group && <Chip label={group.name} icon="userGroup" tone="brand" onPress={() => router.push(`/groups/${group.id}`)} />}
          <Chip label={SPLIT_LABEL[expense.splitType]} icon="chart" />
        </View>
      </Card>

      {net !== 0 && (
        <View style={[styles.position, { backgroundColor: net > 0 ? colors.positiveTint : colors.negativeTint }]}>
          <Icon name={net > 0 ? 'arrowDownLeft' : 'arrowUpRight'} size={18} color={net > 0 ? colors.positive : colors.negative} />
          <AppText variant="headline" tone={net > 0 ? 'positive' : 'negative'} style={styles.positionText}>
            {net > 0 ? 'You lent' : 'You owe'} {formatMoney(Math.abs(net), expense.currency)}
          </AppText>
        </View>
      )}

      <ListSection title={`Split between ${expense.participants.length}`} separatorInset={68}>
        {expense.participants.map((p) => (
          <ListRow
            key={p.userId}
            title={nameOf(p)}
            subtitle={
              p.paidAmountMinorUnits > 0
                ? `Paid ${formatMoney(p.paidAmountMinorUnits, expense.currency)} · share ${formatMoney(p.owedAmountMinorUnits, expense.currency)}`
                : `Share ${formatMoney(p.owedAmountMinorUnits, expense.currency)}`
            }
            leading={<Avatar name={p.displayName} uri={p.avatarUrl} size={40} />}
            trailing={
              isSettleTarget(p) ? (
                <Button title="Settle up" size="sm" variant="tinted" onPress={() => router.push(`/settle/${p.userId}`)} />
              ) : p.userId === expense.payerId ? (
                <Chip label="Payer" tone="positive" icon="banknote" />
              ) : undefined
            }
          />
        ))}
      </ListSection>

      {expense.notes && (
        <ListSection title="Notes">
          <View style={styles.notes}>
            <AppText variant="body">{expense.notes}</AppText>
          </View>
        </ListSection>
      )}

      <ListSection title="Details" separatorInset={58}>
        <ListRow title="Added by" leading={<RowIcon name="person" color={colors.brand} />} value={creator ? nameOf(creator) : '—'} />
        <ListRow title="Created" leading={<RowIcon name="calendar" color="#34A0F0" />} value={formatDateTime(expense.createdAt)} />
        {expense.updatedAt !== expense.createdAt && (
          <ListRow title="Last edited" leading={<RowIcon name="clock" color="#8E8E93" />} value={formatDateTime(expense.updatedAt)} />
        )}
      </ListSection>

      <View style={styles.actions}>
        <Button title="Edit" icon="pencil" variant="tinted" block={false} style={styles.action} onPress={() => router.push(`/expenses/${expense.id}/edit`)} />
        <Button
          title="Delete"
          icon="trash"
          variant="destructive"
          block={false}
          style={styles.action}
          loading={deleteMutation.isPending}
          onPress={confirmDelete}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.lg },
  container: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  position: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg },
  positionText: { flex: 1 },
  notes: { padding: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
