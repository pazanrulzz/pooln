import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Host, Text as UIText, TextInput as UITextInput } from '@expo/ui';
import { Link, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as groupsApi from '../../../api/groups';
import * as invitesApi from '../../../api/invites';
import * as expensesApi from '../../../api/expenses';
import { confirm } from '../../../lib/confirm';
import { shareLink } from '../../../lib/share';
import { formatMoney } from '../../../lib/money';
import { ParticipantPicker } from '../../../components/ParticipantPicker';
import type { ParticipantRef } from '../../../components/participant';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const {
    data: group,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['groups', id],
    queryFn: () => groupsApi.getGroup(id),
  });
  const { data: expensesData } = useQuery({
    queryKey: ['expenses', { groupId: id }],
    queryFn: () => expensesApi.listExpenses({ groupId: id }),
  });

  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['groups', id] });
  };

  const renameMutation = useMutation({
    mutationFn: (name: string) => groupsApi.updateGroup(id, { name }),
    onSuccess: () => {
      invalidate();
      setIsRenaming(false);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.addGroupMember(id, { userId }),
    onSuccess: invalidate,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.removeGroupMember(id, userId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => groupsApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.back();
    },
  });

  const confirmDelete = async () => {
    const confirmed = await confirm('Delete group?', 'This cannot be undone.');
    if (confirmed) deleteMutation.mutate();
  };

  const shareInviteMutation = useMutation({
    mutationFn: async () => {
      const invite = await invitesApi.createGroupInvite(id);
      const url = Linking.createURL(`/join/${invite.token}`);
      const result = await shareLink(url);
      return { url, result };
    },
    onSuccess: ({ url, result }) => {
      if (result === 'copied') setInviteStatus('Invite link copied to clipboard.');
      else if (result === 'unavailable') setInviteStatus(url);
      else setInviteStatus(null);
    },
  });

  const resetInviteMutation = useMutation({
    mutationFn: () => invitesApi.revokeGroupInvite(id),
    onSuccess: () => setInviteStatus('Invite link reset.'),
  });

  const confirmResetInvite = async () => {
    const confirmed = await confirm('Reset invite link?', 'The current link will stop working.');
    if (confirmed) resetInviteMutation.mutate();
  };

  const startRenaming = () => {
    if (!group) return;
    setNameDraft(group.name);
    setIsRenaming(true);
  };

  if (isLoading) return <ActivityIndicator style={styles.spinner} />;
  if (isError || !group || !me) return <Text style={styles.error}>Couldn&apos;t load this group.</Text>;

  const participants: ParticipantRef[] = group.members.map((m) => ({ id: m.userId, displayName: m.displayName }));

  return (
    <Host style={styles.host} colorScheme="light" ignoreSafeArea="all">
      <ScrollView contentContainerStyle={styles.container}>
        {isRenaming ? (
          <View style={styles.renameRow}>
            <View style={styles.renameInputFlex}>
              <UITextInput
                style={styles.renameInput}
                textStyle={styles.renameInputText}
                defaultValue={nameDraft}
                onChangeText={setNameDraft}
                autoFocus
              />
            </View>
            <Button
              variant="text"
              onPress={() => renameMutation.mutate(nameDraft.trim())}
              disabled={renameMutation.isPending || !nameDraft.trim()}
              style={styles.renameButton}
            >
              <UIText textStyle={styles.renameButtonText}>Save</UIText>
            </Button>
            <Button variant="text" onPress={() => setIsRenaming(false)} style={styles.renameCancel}>
              <UIText textStyle={styles.renameCancelText}>Cancel</UIText>
            </Button>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <UIText textStyle={styles.nameText}>{group.name}</UIText>
            <Button variant="text" onPress={startRenaming} style={styles.renameLinkButton}>
              <UIText textStyle={styles.renameLinkText}>Rename</UIText>
            </Button>
          </View>
        )}

        <ParticipantPicker
          label="Members"
          participants={participants}
          currentUserId={me.id}
          onAdd={(user) => addMemberMutation.mutate(user.id)}
          onRemove={(userId) => removeMemberMutation.mutate(userId)}
        />

        <View style={styles.inviteSection}>
          <Text style={styles.fieldLabel}>Invite people</Text>
          <View style={styles.inviteRow}>
            <Button
              variant="text"
              onPress={() => shareInviteMutation.mutate()}
              disabled={shareInviteMutation.isPending}
              style={styles.inviteButton}
            >
              {shareInviteMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <UIText textStyle={styles.inviteButtonText}>Share invite link</UIText>
              )}
            </Button>
            <Button
              variant="text"
              onPress={confirmResetInvite}
              disabled={resetInviteMutation.isPending}
              style={styles.resetLinkButton}
            >
              <UIText textStyle={styles.resetLinkText}>Reset link</UIText>
            </Button>
          </View>
          {inviteStatus && <Text style={styles.inviteStatus}>{inviteStatus}</Text>}
        </View>

        <View style={styles.expensesSection}>
          <View style={styles.expensesHeader}>
            <Text style={styles.fieldLabel}>Expenses</Text>
            <Button
              variant="text"
              onPress={() => router.push(`/expenses/new/details?groupId=${id}`)}
              style={styles.addExpenseButton}
            >
              <UIText textStyle={styles.addExpenseLinkText}>Add expense</UIText>
            </Button>
          </View>
          {expensesData?.expenses.length === 0 && <Text style={styles.empty}>No expenses yet.</Text>}
          {expensesData?.expenses.map((expense) => (
            <Link key={expense.id} href={`/expenses/${expense.id}`} asChild>
              <Pressable style={styles.expenseRow}>
                <Text style={styles.expenseDescription}>{expense.description}</Text>
                <Text style={styles.expenseAmount}>{formatMoney(expense.amountMinorUnits, expense.currency)}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        <View style={styles.deleteBox}>
          <Button variant="text" onPress={confirmDelete} disabled={deleteMutation.isPending} style={styles.deleteButton}>
            <UIText textStyle={styles.deleteButtonText}>Delete group</UIText>
          </Button>
        </View>
      </ScrollView>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  container: { padding: 20, gap: 16 },
  spinner: { marginTop: 40 },
  error: { color: '#d92d20', padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameText: { fontSize: 22, fontWeight: '700', color: '#000' },
  renameLinkButton: { paddingHorizontal: 0, paddingVertical: 0 },
  renameLinkText: { color: '#208aef', fontWeight: '600', fontSize: 13 },
  renameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  renameInputFlex: { flex: 1 },
  renameInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  renameInputText: { fontSize: 18, color: '#000' },
  renameButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  renameButtonText: { color: '#fff', fontWeight: '600' },
  renameCancel: { paddingVertical: 10, paddingHorizontal: 4 },
  renameCancelText: { color: '#666' },
  inviteSection: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666' },
  inviteRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  inviteButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  inviteButtonText: { color: '#fff', fontWeight: '600' },
  resetLinkButton: { paddingHorizontal: 0, paddingVertical: 0 },
  resetLinkText: { color: '#d92d20', fontSize: 13 },
  inviteStatus: { color: '#666', fontSize: 13 },
  expensesSection: { gap: 4 },
  expensesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addExpenseButton: { paddingHorizontal: 0, paddingVertical: 0 },
  addExpenseLinkText: { color: '#208aef', fontWeight: '600', fontSize: 13 },
  empty: { color: '#666', fontSize: 13, paddingVertical: 8 },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  expenseDescription: { fontSize: 15 },
  expenseAmount: { color: '#666' },
  deleteBox: { marginTop: 12 },
  deleteButton: {
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#fdecea',
  },
  deleteButtonText: { fontWeight: '600', color: '#d92d20' },
});
