import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as balancesApi from '../../../api/balances';
import * as settlementsApi from '../../../api/settlements';
import { ApiError } from '../../../api/client';
import { minorUnitsToText, textToMinorUnits } from '../../../lib/money';

export default function SettleUp() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data: balance, isLoading } = useQuery({
    queryKey: ['balances', userId],
    queryFn: () => balancesApi.getBalanceWith(userId),
  });

  // Fields start as user overrides (null = "use the default derived from the
  // balance below"). Deriving defaults from a query result at render time,
  // rather than syncing them into state via an effect, avoids the extra
  // render effects-with-setState causes and keeps this in sync automatically
  // if the balance refetches.
  const [youPaidOverride, setYouPaidOverride] = useState<boolean | null>(null);
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [currencyOverride, setCurrencyOverride] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // "you paid them" by default, unless the balance says they owe you — then
  // "they paid you" (recording them paying off what they owe) makes more sense.
  const defaultLine = balance?.balances[0];
  const youPaid = youPaidOverride ?? (defaultLine ? defaultLine.amountMinorUnits < 0 : true);
  const amountText = amountOverride ?? (defaultLine ? minorUnitsToText(Math.abs(defaultLine.amountMinorUnits)) : '');
  const currency = currencyOverride ?? defaultLine?.currency ?? 'USD';

  const mutation = useMutation({
    mutationFn: settlementsApi.createSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      router.back();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  if (isLoading || !me || !balance) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  const handleSubmit = () => {
    const amountMinorUnits = textToMinorUnits(amountText);
    if (amountMinorUnits === null || amountMinorUnits <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setError(null);
    mutation.mutate({
      fromUserId: youPaid ? me.id : userId,
      toUserId: youPaid ? userId : me.id,
      amountMinorUnits,
      currency,
      note: note.trim() === '' ? undefined : note.trim(),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settle up with {balance.displayName}</Text>

      <View style={styles.directionRow}>
        <Text
          onPress={() => setYouPaidOverride(true)}
          style={[styles.directionOption, youPaid && styles.directionOptionActive]}
        >
          You paid them
        </Text>
        <Text
          onPress={() => setYouPaidOverride(false)}
          style={[styles.directionOption, !youPaid && styles.directionOptionActive]}
        >
          They paid you
        </Text>
      </View>

      <Text style={styles.fieldLabel}>Amount</Text>
      <View style={styles.amountRow}>
        <TextInput
          style={[styles.input, styles.amountInput]}
          keyboardType="decimal-pad"
          placeholder="0.00"
          value={amountText}
          onChangeText={setAmountOverride}
        />
        <TextInput
          style={[styles.input, styles.currencyInput]}
          autoCapitalize="characters"
          maxLength={3}
          value={currency}
          onChangeText={(text) => setCurrencyOverride(text.toUpperCase())}
        />
      </View>

      <Text style={styles.fieldLabel}>Note (optional)</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={mutation.isPending}>
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Record settlement</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  spinner: { marginTop: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  directionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  directionOption: {
    flex: 1,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  directionOptionActive: {
    backgroundColor: '#208aef',
    borderColor: '#208aef',
    color: '#fff',
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  amountRow: { flexDirection: 'row', gap: 12 },
  amountInput: { flex: 2 },
  currencyInput: { flex: 1 },
  error: { color: '#d92d20', fontSize: 13 },
  submitButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
