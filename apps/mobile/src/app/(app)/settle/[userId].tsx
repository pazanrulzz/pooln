import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Host, Text as UIText, TextInput as UITextInput } from '@expo/ui';
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
    <Host style={styles.container} colorScheme="light" ignoreSafeArea="all">
      <View style={styles.titleBox}>
        <UIText textStyle={styles.titleText}>{`Settle up with ${balance.displayName}`}</UIText>
      </View>

      <View style={styles.directionRow}>
        <View style={styles.directionFlex}>
          <Button
            variant="text"
            onPress={() => setYouPaidOverride(true)}
            style={youPaid ? styles.directionOptionActive : styles.directionOption}
          >
            <UIText textStyle={youPaid ? styles.directionTextActive : styles.directionText}>You paid them</UIText>
          </Button>
        </View>
        <View style={styles.directionFlex}>
          <Button
            variant="text"
            onPress={() => setYouPaidOverride(false)}
            style={!youPaid ? styles.directionOptionActive : styles.directionOption}
          >
            <UIText textStyle={!youPaid ? styles.directionTextActive : styles.directionText}>They paid you</UIText>
          </Button>
        </View>
      </View>

      <Text style={styles.fieldLabel}>Amount</Text>
      <View style={styles.amountRow}>
        <View style={styles.amountField}>
          <UITextInput
            style={styles.input}
            textStyle={styles.inputText}
            keyboardType="decimal-pad"
            placeholder="0.00"
            defaultValue={amountText}
            onChangeText={setAmountOverride}
          />
        </View>
        <View style={styles.currencyField}>
          <UITextInput
            style={styles.input}
            textStyle={styles.inputText}
            autoCapitalize="characters"
            maxLength={3}
            defaultValue={currency}
            onChangeText={(text) => setCurrencyOverride(text.toUpperCase())}
          />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Note (optional)</Text>
      <UITextInput style={styles.input} textStyle={styles.inputText} defaultValue={note} onChangeText={setNote} />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.submitBox}>
        <Button variant="text" onPress={handleSubmit} disabled={mutation.isPending} style={styles.submitButton}>
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <UIText textStyle={styles.submitText}>Record settlement</UIText>
          )}
        </Button>
      </View>
    </Host>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  spinner: { marginTop: 40 },
  titleBox: { marginBottom: 8 },
  titleText: { fontSize: 20, fontWeight: '700', color: '#000' },
  directionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  directionFlex: { flex: 1 },
  directionOption: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  directionOptionActive: {
    backgroundColor: '#208aef',
    borderColor: '#208aef',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  directionText: { textAlign: 'center', color: '#000' },
  directionTextActive: { textAlign: 'center', color: '#fff' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  inputText: { fontSize: 16, color: '#000' },
  amountRow: { flexDirection: 'row', gap: 12 },
  amountField: { flex: 2 },
  currencyField: { flex: 1 },
  error: { color: '#d92d20', fontSize: 13 },
  submitBox: { marginTop: 8 },
  submitButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
  },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
