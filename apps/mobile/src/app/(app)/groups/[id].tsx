import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExpenseDTO } from '@pooln/shared';
import * as authApi from '../../../api/auth';
import * as groupsApi from '../../../api/groups';
import * as invitesApi from '../../../api/invites';
import * as expensesApi from '../../../api/expenses';
import { shareLink } from '../../../lib/share';
import { formatMoney } from '../../../lib/money';
import { getExpenseIcon } from '../../../lib/expenseIcon';
import { ParticipantPicker } from '../../../components/ParticipantPicker';
import { GroupAvatarPicker } from '../../../components/GroupAvatarPicker';
import {
  AppText,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  ListRow,
  ListSection,
  RowIcon,
  SearchBar,
  SegmentedControl,
  SkeletonList,
  TextField,
  colors,
  confirmDialog,
  radius,
  showToast,
  spacing,
} from '../../../ui';

type Tab = 'expenses' | 'members';

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function QuickAction({ icon, label, onPress }: { icon: 'plus' | 'share' | 'banknote'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]} accessibilityRole="button">
      <View style={styles.quickIcon}>
        <Icon name={icon} size={18} color={colors.brand} />
      </View>
      <AppText variant="caption" weight="600" tone="brand">
        {label}
      </AppText>
    </Pressable>
  );
}

function ExpenseRow({ expense, currentUserId }: { expense: ExpenseDTO; currentUserId: string }) {
  const icon = getExpenseIcon(expense.description);
  const payer = expense.participants.find((p) => p.userId === expense.payerId);
  const payerName = expense.payerId === currentUserId ? 'You' : (payer?.displayName ?? 'Someone');
  const me = expense.participants.find((p) => p.userId === currentUserId);
  const net = me ? me.paidAmountMinorUnits - me.owedAmountMinorUnits : 0;

  return (
    <ListRow
      title={expense.description}
      subtitle={`${payerName} paid ${formatMoney(expense.amountMinorUnits, expense.currency)} · ${formatShortDate(expense.date)}`}
      leading={<RowIcon name={icon.name} color={icon.color} />}
      onPress={() => router.push(`/expenses/${expense.id}`)}
      trailing={
        net !== 0 ? (
          <View style={styles.share}>
            <AppText variant="caption" tone={net > 0 ? 'positive' : 'negative'}>
              {net > 0 ? 'you lent' : 'you owe'}
            </AppText>
            <AppText variant="subhead" weight="600" tone={net > 0 ? 'positive' : 'negative'}>
              {formatMoney(Math.abs(net), expense.currency)}
            </AppText>
          </View>
        ) : (
          <AppText variant="caption" tone="tertiary">
            not involved
          </AppText>
        )
      }
    />
  );
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const groupQuery = useQuery({ queryKey: ['groups', id], queryFn: () => groupsApi.getGroup(id) });
  const expensesQuery = useQuery({
    queryKey: ['expenses', { groupId: id }],
    queryFn: () => expensesApi.listExpenses({ groupId: id, limit: 100 }),
  });
  const group = groupQuery.data;

  const [tab, setTab] = useState<Tab>('expenses');
  const [query, setQuery] = useState('');
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['groups', id] });
  };

  const updateMutation = useMutation({
    mutationFn: (input: { name?: string; avatarUrl?: string | null }) => groupsApi.updateGroup(id, input),
    onSuccess: (_, input) => {
      invalidate();
      setNameDraft(null);
      showToast(input.avatarUrl !== undefined ? 'Group photo updated' : 'Group renamed');
    },
    onError: () => showToast("Couldn't update the group", 'error'),
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.addGroupMember(id, { userId }),
    onSuccess: () => {
      invalidate();
      showToast('Member added');
    },
    onError: () => showToast("Couldn't add that member", 'error'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.removeGroupMember(id, userId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => groupsApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      showToast('Group deleted');
      router.back();
    },
  });

  const shareInvite = async () => {
    try {
      const invite = await invitesApi.createGroupInvite(id);
      const url = Linking.createURL(`/join/${invite.token}`);
      const result = await shareLink(url);
      if (result === 'copied') showToast('Invite link copied to clipboard');
      else if (result === 'unavailable') showToast('Sharing isn’t available here', 'error');
    } catch {
      showToast("Couldn't create an invite link", 'error');
    }
  };

  const resetInvite = async () => {
    const ok = await confirmDialog({
      title: 'Reset invite link?',
      message: 'Anyone with the current link won’t be able to join.',
      confirmLabel: 'Reset',
      destructive: true,
    });
    if (!ok) return;
    await invitesApi.revokeGroupInvite(id);
    showToast('Invite link reset');
  };

  const removeMember = async (userId: string, displayName: string) => {
    const ok = await confirmDialog({
      title: `Remove ${displayName}?`,
      message: 'Their existing expenses stay in the group.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) {
      removeMemberMutation.mutate(userId, { onSuccess: () => showToast(`${displayName} removed`) });
    }
  };

  const leaveGroup = async () => {
    if (!me) return;
    const ok = await confirmDialog({
      title: 'Leave this group?',
      message: 'You won’t see its expenses anymore. A member can invite you back.',
      confirmLabel: 'Leave',
      destructive: true,
    });
    if (!ok) return;
    removeMemberMutation.mutate(me.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['groups'] });
        showToast('You left the group');
        router.back();
      },
    });
  };

  const deleteGroup = async () => {
    const ok = await confirmDialog({
      title: 'Delete group?',
      message: 'This removes the group for everyone. This can’t be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  const expenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = expensesQuery.data?.expenses ?? [];
    return q ? all.filter((e) => `${e.description} ${e.notes ?? ''}`.toLowerCase().includes(q)) : all;
  }, [expensesQuery.data, query]);

  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expensesQuery.data?.expenses ?? []) {
      totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.amountMinorUnits);
    }
    return [...totals.entries()];
  }, [expensesQuery.data]);

  if (groupQuery.isLoading || !me) {
    return (
      <View style={styles.padded}>
        <SkeletonList rows={4} />
      </View>
    );
  }
  if (groupQuery.isError || !group) {
    return <ErrorState message="Couldn't load this group." onRetry={groupQuery.refetch} />;
  }

  const participants = group.members.map((m) => ({ id: m.userId, displayName: m.displayName }));
  const addExpense = () => router.push(`/expenses/new/details?groupId=${id}`);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={groupQuery.isRefetching || expensesQuery.isRefetching}
          onRefresh={() => {
            groupQuery.refetch();
            expensesQuery.refetch();
          }}
          tintColor={colors.brand}
        />
      }
    >
      <View style={styles.hero}>
        <GroupAvatarPicker value={group.avatarUrl} name={group.name} onChange={(avatarUrl) => updateMutation.mutate({ avatarUrl })} />

        {nameDraft !== null ? (
          <View style={styles.renameRow}>
            <TextField
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              maxLength={80}
              style={styles.renameField}
              onSubmitEditing={() => nameDraft.trim() && updateMutation.mutate({ name: nameDraft.trim() })}
            />
            <IconButton icon="xmark" variant="gray" onPress={() => setNameDraft(null)} accessibilityLabel="Cancel rename" />
            <IconButton
              icon="check"
              variant="filled"
              disabled={!nameDraft.trim() || updateMutation.isPending}
              onPress={() => updateMutation.mutate({ name: nameDraft.trim() })}
              accessibilityLabel="Save name"
            />
          </View>
        ) : (
          <Pressable style={styles.titleRow} onPress={() => setNameDraft(group.name)} accessibilityRole="button" accessibilityLabel="Rename group">
            <AppText variant="title1" align="center" numberOfLines={2} style={styles.title}>
              {group.name}
            </AppText>
            <Icon name="pencil" size={15} color={colors.tertiaryLabel} />
          </Pressable>
        )}

        <View style={styles.chips}>
          <Chip label={`${group.members.length} members`} icon="people" tone="brand" />
          <Chip label={`${expensesQuery.data?.total ?? 0} expenses`} icon="receipt" />
          {totalsByCurrency.map(([currency, total]) => (
            <Chip key={currency} label={`${formatMoney(total, currency)} spent`} icon="chart" tone="positive" />
          ))}
        </View>

        <View style={styles.quickActions}>
          <QuickAction icon="plus" label="Add expense" onPress={addExpense} />
          <QuickAction icon="share" label="Invite" onPress={shareInvite} />
        </View>
      </View>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'expenses', label: 'Expenses' },
          { value: 'members', label: 'Members' },
        ]}
      />

      {tab === 'expenses' && (
        <>
          {(expensesQuery.data?.expenses.length ?? 0) > 0 && (
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search this group's expenses" />
          )}
          {expensesQuery.isLoading && <SkeletonList rows={3} />}
          {expensesQuery.data?.expenses.length === 0 && (
            <EmptyState
              icon="receipt"
              title="No expenses yet"
              message="Add the first shared cost and Pooln will work out who owes whom."
              actionLabel="Add expense"
              onAction={addExpense}
            />
          )}
          {(expensesQuery.data?.expenses.length ?? 0) > 0 &&
            (expenses.length > 0 ? (
              <ListSection separatorInset={58}>
                {expenses.map((expense) => (
                  <ExpenseRow key={expense.id} expense={expense} currentUserId={me.id} />
                ))}
              </ListSection>
            ) : (
              <EmptyState icon="search" title="No matches" message="Try a different search." />
            ))}
        </>
      )}

      {tab === 'members' && (
        <>
          <ParticipantPicker
            label="Members"
            participants={participants}
            currentUserId={me.id}
            onAdd={(user) => addMemberMutation.mutate(user.id)}
            onRemove={(userId) => removeMember(userId, participants.find((p) => p.id === userId)?.displayName ?? 'member')}
          />

          <ListSection title="Invite link" footer="Anyone with the link can join this group." separatorInset={58}>
            <ListRow title="Share invite link" leading={<RowIcon name="link" color={colors.brand} />} onPress={shareInvite} />
            <ListRow title="Reset invite link" leading={<RowIcon name="refresh" color={colors.warning} />} onPress={resetInvite} />
          </ListSection>
        </>
      )}

      <ListSection title="Manage" separatorInset={58}>
        <ListRow title="Leave group" destructive chevron={false} leading={<RowIcon name="logout" color={colors.warning} />} onPress={leaveGroup} />
        <ListRow title="Delete group" destructive chevron={false} leading={<RowIcon name="trash" color={colors.negative} />} onPress={deleteGroup} />
      </ListSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.lg },
  container: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  hero: { alignItems: 'center', gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },
  title: { flexShrink: 1 },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  renameField: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  quickActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  quickAction: {
    width: 104,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    boxShadow: '0px 1px 2px rgba(16,24,40,0.04), 0px 4px 14px rgba(16,24,40,0.06)',
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  share: { alignItems: 'flex-end' },
});
