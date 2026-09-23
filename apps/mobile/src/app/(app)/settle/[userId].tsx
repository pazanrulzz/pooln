import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as balancesApi from '../../../api/balances';
import * as settlementsApi from '../../../api/settlements';
import { ApiError } from '../../../api/client';
import { COMMON_CURRENCIES, currencySymbol, formatMoney, minorUnitsToText, textToMinorUnits } from '../../../lib/money';
import {
  AppText,
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  Icon,
  SegmentedControl,
  SkeletonList,
  TextField,
  colors,
  radius,
  showActionSheet,
  showToast,
  spacing,
  typography,
} from '../../../ui';

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
  // rather than syncing them into state via an effect, keeps them in sync if
  // the balance refetches.
  const [youPaidOverride, setYouPaidOverride] = useState<boolean | null>(null);
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [currencyOverride, setCurrencyOverride] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: settlementsApi.createSettlement,
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      showToast(`Payment of ${formatMoney(s.amountMinorUnits, s.currency)} recorded`);
      router.back();
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'Something went wrong.'),
  });

  if (isLoading || !me || !balance) {
    return (
      <View style={styles.padded}>
        <SkeletonList rows={3} />
      </View>
    );
  }

  const currency = currencyOverride ?? balance.balances[0]?.currency ?? me.defaultCurrency;
  const line = balance.balances.find((l) => l.currency === currency);
  // "You paid them" by default, unless they owe you — then recording them
  // paying you back is the likelier intent.
  const youPaid = youPaidOverride ?? (line ? line.amountMinorUnits < 0 : true);
  const outstanding = line ? Math.abs(line.amountMinorUnits) : 0;
  const amountText = amountOverride ?? (outstanding > 0 ? minorUnitsToText(outstanding) : '');
  const theirName = balance.displayName.split(' ')[0] ?? balance.displayName;

  const payer = youPaid ? { name: me.displayName, uri: me.avatarUrl, label: 'You' } : { name: balance.displayName, uri: balance.avatarUrl, label: theirName };
  const payee = youPaid ? { name: balance.displayName, uri: balance.avatarUrl, label: theirName } : { name: me.displayName, uri: me.avatarUrl, label: 'You' };

  const pickCurrency = async () => {
    const owed = balance.balances.map((l) => l.currency);
    const options = [...new Set([...owed, ...COMMON_CURRENCIES])];
    const index = await showActionSheet({ title: 'Currency', options: options.map((c) => ({ label: c })) });
    if (index !== null) {
      setCurrencyOverride(options[index]!);
      setAmountOverride(null);
    }
  };

  const handleSubmit = () => {
    const amountMinorUnits = textToMinorUnits(amountText);
    if (amountMinorUnits === null || amountMinorUnits <= 0) {
      setError('Enter an amount greater than zero.');
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.flow}>
          <View style={styles.party}>
            <Avatar name={payer.name} uri={payer.uri} size={64} />
            <AppText variant="subhead" weight="600">
              {payer.label}
            </AppText>
          </View>
          <View style={styles.arrow}>
            <Icon name="arrowRight" size={18} color={colors.brand} />
          </View>
          <View style={styles.party}>
            <Avatar name={payee.name} uri={payee.uri} size={64} />
            <AppText variant="subhead" weight="600">
              {payee.label}
            </AppText>
          </View>
        </View>

        <SegmentedControl
          value={youPaid ? 'me' : 'them'}
          onChange={(v) => setYouPaidOverride(v === 'me')}
          options={[
            { value: 'me', label: `You paid ${theirName}` },
            { value: 'them', label: `${theirName} paid you` },
          ]}
        />

        <Card style={styles.amountCard}>
          <View style={styles.amountRow}>
            <Pressable onPress={pickCurrency} style={styles.currencyPill} accessibilityRole="button" accessibilityLabel={`Currency ${currency}`}>
              <AppText variant="subhead" weight="700" tone="brand">
                {currency}
              </AppText>
              <Icon name="chevronDown" size={10} color={colors.brand} />
            </Pressable>
            <AppText style={styles.symbol}>{currencySymbol(currency)}</AppText>
            <TextInput
              value={amountText}
              onChangeText={setAmountOverride}
              placeholder="0.00"
              placeholderTextColor={colors.tertiaryLabel}
              keyboardType="decimal-pad"
              style={styles.amountInput}
              accessibilityLabel="Amount"
            />
          </View>
          {outstanding > 0 && (
            <View style={styles.suggestion}>
              <AppText variant="footnote" tone="secondary">
                Outstanding balance {formatMoney(outstanding, currency)}
              </AppText>
              <Chip label="Pay in full" tone="brand" icon="check" onPress={() => setAmountOverride(minorUnitsToText(outstanding))} />
            </View>
          )}
        </Card>

        <TextField label="Note" icon="note" placeholder="e.g. Bank transfer, cash, Revolut" value={note} onChangeText={setNote} maxLength={280} />

        {error && <Banner tone="error">{error}</Banner>}

        <Button title="Record payment" icon="check" onPress={handleSubmit} loading={mutation.isPending} />
        <AppText variant="footnote" tone="tertiary" align="center">
          This records a payment made outside Pooln — no money is moved.
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: spacing.lg },
  container: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  flow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.md },
  party: { alignItems: 'center', gap: spacing.sm, width: 96 },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  amountCard: { gap: spacing.md },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTint,
  },
  symbol: { ...typography.title1, color: colors.tertiaryLabel, marginLeft: spacing.xs },
  amountInput: { ...typography.largeTitle, flex: 1, color: colors.label, outlineStyle: 'solid', outlineWidth: 0, paddingVertical: 0, minWidth: 0 },
  suggestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
});
