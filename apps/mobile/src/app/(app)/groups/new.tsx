import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import * as groupsApi from '../../../api/groups';
import { ApiError } from '../../../api/client';
import { ParticipantPicker } from '../../../components/ParticipantPicker';
import type { ParticipantRef } from '../../../components/participant';

export default function NewGroup() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });

  const [name, setName] = useState('');
  const [members, setMembers] = useState<ParticipantRef[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: groupsApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.back();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    },
  });

  if (!me) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  const participants = [{ id: me.id, displayName: me.displayName }, ...members];

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Give this group a name.');
      return;
    }
    setError(null);
    mutation.mutate({ name: name.trim(), memberIds: members.map((m) => m.id) });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.fieldLabel}>Group name</Text>
      <TextInput
        style={styles.input}
        placeholder="Roommates, Japan trip..."
        value={name}
        onChangeText={setName}
      />

      <ParticipantPicker
        label="Members"
        participants={participants}
        currentUserId={me.id}
        onAdd={(user) => setMembers((prev) => [...prev, user])}
        onRemove={(userId) => setMembers((prev) => prev.filter((m) => m.id !== userId))}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={mutation.isPending}>
        {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create group</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  spinner: { marginTop: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: '#d92d20', fontSize: 13 },
  submitButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
