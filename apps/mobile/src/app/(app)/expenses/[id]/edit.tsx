import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateExpenseInput } from '@pooln/shared';
import * as authApi from '../../../../api/auth';
import * as expensesApi from '../../../../api/expenses';
import * as groupsApi from '../../../../api/groups';
import { ApiError } from '../../../../api/client';
import {
  ExpenseForm,
  fromExpenseDTO,
  toCreateExpenseInput,
  type ExpenseFormValues,
} from '../../../../components/ExpenseForm';
import { SkeletonList, showToast } from '../../../../ui';

export default function EditExpense() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data: expense, isLoading } = useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesApi.getExpense(id),
  });
  const groupId = expense?.groupId ?? undefined;
  const { data: group } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupsApi.getGroup(groupId!),
    enabled: !!groupId,
  });

  const mutation = useMutation({
    mutationFn: (input: CreateExpenseInput) => expensesApi.updateExpense(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      showToast('Changes saved');
      router.back();
    },
    onError: (err: unknown) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  if (isLoading || !me || !expense || (groupId && !group)) {
    return <SkeletonList rows={4} />;
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

  return (
    <ExpenseForm
      currentUserId={me.id}
      submitLabel="Save changes"
      isSubmitting={mutation.isPending}
      submitError={submitError}
      onSubmit={handleSubmit}
      groupMembers={group?.members.map((m) => ({ id: m.userId, displayName: m.displayName }))}
      contextLabel={group ? `In ${group.name}` : undefined}
      initialValues={fromExpenseDTO(expense)}
    />
  );
}
