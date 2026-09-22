import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Host, Text as UIText, TextInput as UITextInput } from '@expo/ui';
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
    <Host style={styles.host} colorScheme="light" ignoreSafeArea="all">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.fieldLabel}>Group name</Text>
        <UITextInput
          style={styles.input}
          textStyle={styles.inputText}
          placeholder="Roommates, Japan trip..."
          defaultValue={name}
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

        <View style={styles.submitBox}>
          <Button variant="text" onPress={handleSubmit} disabled={mutation.isPending} style={styles.submitButton}>
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <UIText textStyle={styles.submitText}>Create group</UIText>
            )}
          </Button>
        </View>
      </ScrollView>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  container: { padding: 20, gap: 12 },
  spinner: { marginTop: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  inputText: { fontSize: 16, color: '#000' },
  error: { color: '#d92d20', fontSize: 13 },
  submitBox: { marginTop: 8, marginBottom: 40 },
  submitButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
  },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
