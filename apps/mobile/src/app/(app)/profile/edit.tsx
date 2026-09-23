import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { COMMON_CURRENCIES } from '../../../lib/money';
import { AppText, Avatar, Button, Chip, SkeletonList, TextField, colors, showToast, spacing } from '../../../ui';

export default function EditProfile() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      showToast('Profile updated');
      router.back();
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'Something went wrong.'),
  });

  if (!user) {
    return (
      <View style={styles.content}>
        <SkeletonList rows={2} avatar={false} />
      </View>
    );
  }

  const name = nameDraft ?? user.displayName;
  const currency = currencyDraft ?? user.defaultCurrency;

  const save = () => {
    if (!name.trim()) {
      setError('Your name can’t be empty.');
      return;
    }
    setError(null);
    mutation.mutate({ displayName: name.trim(), defaultCurrency: currency });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Avatar name={name || user.displayName} uri={user.avatarUrl} size={88} />
        <AppText variant="footnote" tone="secondary">
          {user.email}
        </AppText>
      </View>

      <TextField
        label="Display name"
        icon="person"
        value={name}
        onChangeText={setNameDraft}
        autoComplete="name"
        error={error}
        hint="This is how friends see you on shared expenses."
      />

      <View style={styles.currency}>
        <AppText variant="footnote" tone="secondary" weight="600" style={styles.label}>
          Default currency
        </AppText>
        <View style={styles.chips}>
          {COMMON_CURRENCIES.map((c) => (
            <Chip key={c} label={c} selected={c === currency} onPress={() => setCurrencyDraft(c)} />
          ))}
        </View>
      </View>

      <Button title="Save changes" onPress={save} loading={mutation.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, backgroundColor: colors.background },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  currency: { gap: spacing.sm },
  label: { marginLeft: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
