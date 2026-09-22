import { useMemo, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../../api/auth';
import * as expensesApi from '../../../../api/expenses';
import * as groupsApi from '../../../../api/groups';
import { ApiError } from '../../../../api/client';
import { ExpenseForm, toCreateExpenseInput, type ExpenseFormValues } from '../../../../components/ExpenseForm';
import type { ParticipantRef } from '../../../../components/participant';

/** Reached from the participant-picker screen (`expenses/new/index.tsx`), which passes either a
 * groupId or a JSON-encoded list of picked friends via query params. */
export default function NewExpenseDetails() {
  const {
    groupId,
    participants: participantsParam,
    returnTo,
  } = useLocalSearchParams<{
    groupId?: string;
    participants?: string;
    returnTo?: string;
  }>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupsApi.getGroup(groupId!),
    enabled: Boolean(groupId),
  });

  const mutation = useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (returnTo === '/') router.dismissTo('/');
      else router.back();
    },
    onError: (err: unknown) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  const pickedParticipants = useMemo<ParticipantRef[]>(() => {
    if (!participantsParam) return [];
    try {
      return JSON.parse(participantsParam) as ParticipantRef[];
    } catch {
      return [];
    }
  }, [participantsParam]);

  if (!me || (groupId && !group)) {
    return <Text style={styles.loading}>Loading…</Text>;
  }

  const groupMembers = group?.members.map((m) => ({ id: m.userId, displayName: m.displayName }));

  const handleSubmit = (values: ExpenseFormValues) => {
    const input = toCreateExpenseInput(values);
    if (!input) {
      setSubmitError('Enter a valid amount.');
      return;
    }
    setSubmitError(null);
    mutation.mutate(input);
  };

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
        participants: groupMembers ?? [{ id: me.id, displayName: me.displayName }, ...pickedParticipants],
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
