import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as expensesApi from '../../../api/expenses';
import * as groupsApi from '../../../api/groups';
import { ApiError } from '../../../api/client';
import { ExpenseForm, toCreateExpenseInput, type ExpenseFormValues } from '../../../components/ExpenseForm';

export default function NewExpense() {
  const { groupId: initialGroupId } = useLocalSearchParams<{ groupId?: string }>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(initialGroupId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data: groupsData } = useQuery({ queryKey: ['groups'], queryFn: () => groupsApi.listGroups() });

  const mutation = useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      router.back();
    },
    onError: (err: unknown) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  if (!me || !groupsData) {
    return <Text style={styles.loading}>Loading…</Text>;
  }

  const selectedGroup = groupsData.groups.find((g) => g.id === selectedGroupId);
  const groupMembers = selectedGroup?.members.map((m) => ({ id: m.userId, displayName: m.displayName }));

  const handleSubmit = (values: ExpenseFormValues) => {
    const input = toCreateExpenseInput(values);
    if (!input) {
      setSubmitError('Enter a valid amount.');
      return;
    }
    setSubmitError(null);
    mutation.mutate(input);
  };

  const groupPicker = groupsData.groups.length > 0 && (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRow}>
      {groupsData.groups.map((group) => {
        const isSelected = group.id === selectedGroupId;
        return (
          <Pressable
            key={group.id}
            style={styles.groupChip}
            onPress={() => setSelectedGroupId(isSelected ? undefined : group.id)}
          >
            <View style={[styles.groupAvatar, isSelected && styles.groupAvatarSelected]}>
              <Text style={[styles.groupAvatarText, isSelected && styles.groupAvatarTextSelected]}>
                {group.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.groupLabel} numberOfLines={1}>
              {group.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <ExpenseForm
      key={selectedGroupId ?? 'none'}
      currentUserId={me.id}
      submitLabel="Add expense"
      isSubmitting={mutation.isPending}
      submitError={submitError}
      onSubmit={handleSubmit}
      groupMembers={groupMembers}
      topContent={groupPicker}
      initialValues={{
        description: '',
        amountText: '',
        currency: me.defaultCurrency,
        payerId: me.id,
        participants: groupMembers ?? [{ id: me.id, displayName: me.displayName }],
        splitType: 'EQUAL',
        splitValues: {},
        notes: '',
        groupId: selectedGroupId,
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: { padding: 20 },
  groupRow: { gap: 16 },
  groupChip: { alignItems: 'center', width: 64 },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupAvatarSelected: {
    backgroundColor: '#208aef',
    borderColor: '#0d5ba8',
  },
  groupAvatarText: { fontSize: 18, fontWeight: '700', color: '#666' },
  groupAvatarTextSelected: { color: '#fff' },
  groupLabel: { fontSize: 12, color: '#444', marginTop: 4, textAlign: 'center' },
});
