import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as groupsApi from '../../../api/groups';
import { ApiError } from '../../../api/client';
import { ParticipantPicker } from '../../../components/ParticipantPicker';
import { GroupAvatarPicker } from '../../../components/GroupAvatarPicker';
import type { ParticipantRef } from '../../../components/participant';
import { Banner, Button, SkeletonList, TextField, showToast, spacing } from '../../../ui';

export default function NewGroup() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<ParticipantRef[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: groupsApi.createGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      showToast(`${group.name} created`);
      router.replace(`/groups/${group.id}`);
    },
  });

  if (!me) {
    return <SkeletonList rows={3} />;
  }

  const participants = [{ id: me.id, displayName: me.displayName }, ...members];

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError('Give this group a name.');
      return;
    }
    setNameError(null);
    mutation.mutate({ name: name.trim(), memberIds: members.map((m) => m.id), avatarUrl });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <GroupAvatarPicker value={avatarUrl} onChange={setAvatarUrl} name={name} />

        <TextField
          label="Group name"
          icon="userGroup"
          placeholder="Flatmates, Japan trip, Team lunch…"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (nameError) setNameError(null);
          }}
          error={nameError}
          autoFocus
          maxLength={80}
        />

        <ParticipantPicker
          label="Members"
          participants={participants}
          currentUserId={me.id}
          onAdd={(user) => setMembers((prev) => [...prev, user])}
          onRemove={(userId) => setMembers((prev) => prev.filter((m) => m.id !== userId))}
        />

        {mutation.isError && (
          <Banner tone="error">{mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong.'}</Banner>
        )}

        <Button title="Create group" icon="check" onPress={handleSubmit} loading={mutation.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
});
