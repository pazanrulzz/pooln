import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as expensesApi from '../../../api/expenses';
import * as groupsApi from '../../../api/groups';
import { ApiError } from '../../../api/client';
import { ExpenseForm, toCreateExpenseInput, type ExpenseFormValues } from '../../../components/ExpenseForm';

export default function NewExpense() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupsApi.getGroup(groupId!),
    enabled: !!groupId,
  });

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

  if (!me || (groupId && !group)) {
    return <Text style={styles.loading}>Loading…</Text>;
  }

  const handleSubmit = (values: ExpenseFormValues) => {
    const input = toCreateExpenseInput(values);
    if (!input) {
      setSubmitError('Enter a valid amount.');
      return;
    }
    setSubmitError(null);
    mutation.mutate(input);
  };

  const groupMembers = group?.members.map((m) => ({ id: m.userId, displayName: m.displayName }));

  return (
    <ExpenseForm
      currentUserId={me.id}
      submitLabel="Add expense"
      isSubmitting={mutation.isPending}
      submitError={submitError}
      onSubmit={handleSubmit}
      groupMembers={groupMembers}
      initialValues={{
        description: '',
        amountText: '',
        currency: me.defaultCurrency,
        payerId: me.id,
        participants: groupMembers ?? [{ id: me.id, displayName: me.displayName }],
        splitType: 'EQUAL',
        splitValues: {},
        notes: '',
        groupId,
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: { padding: 20 },
});
