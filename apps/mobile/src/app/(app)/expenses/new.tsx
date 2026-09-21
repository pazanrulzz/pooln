import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as expensesApi from '../../../api/expenses';
import { ApiError } from '../../../api/client';
import { ExpenseForm, toCreateExpenseInput, type ExpenseFormValues } from '../../../components/ExpenseForm';

export default function NewExpense() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });

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

  if (!me) {
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

  return (
    <ExpenseForm
      currentUserId={me.id}
      submitLabel="Add expense"
      isSubmitting={mutation.isPending}
      submitError={submitError}
      onSubmit={handleSubmit}
      initialValues={{
        description: '',
        amountText: '',
        currency: me.defaultCurrency,
        payerId: me.id,
        participants: [{ id: me.id, displayName: me.displayName }],
        splitType: 'EQUAL',
        splitValues: {},
        notes: '',
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: { padding: 20 },
});
