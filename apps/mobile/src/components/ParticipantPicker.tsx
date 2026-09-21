import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { searchUserByEmail } from '../api/users';
import type { ParticipantRef } from './participant';

interface Props {
  participants: ParticipantRef[];
  currentUserId: string;
  onAdd: (user: ParticipantRef) => void;
  onRemove: (userId: string) => void;
}

export function ParticipantPicker({ participants, currentUserId, onAdd, onRemove }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setStatus('loading');
    setError(null);
    try {
      const user = await searchUserByEmail(trimmed);
      if (!user) {
        setError('No Pooln user with that email. Ask them to sign up first.');
        setStatus('error');
        return;
      }
      if (participants.some((p) => p.id === user.id)) {
        setError(`${user.displayName} is already added.`);
        setStatus('error');
        return;
      }
      onAdd(user);
      setEmail('');
      setStatus('idle');
    } catch {
      setError('Something went wrong looking that up.');
      setStatus('error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Split with</Text>

      {participants.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.name}>
            {p.displayName}
            {p.id === currentUserId ? ' (you)' : ''}
          </Text>
          {p.id !== currentUserId && (
            <Pressable onPress={() => onRemove(p.id)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          )}
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add by email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={handleAdd}
        />
        <Pressable style={styles.addButton} onPress={handleAdd} disabled={status === 'loading'}>
          {status === 'loading' ? <ActivityIndicator /> : <Text style={styles.addButtonText}>Add</Text>}
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#666' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  name: { fontSize: 15 },
  remove: { color: '#d92d20', fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: { fontWeight: '600' },
  error: { color: '#d92d20', fontSize: 13 },
});
