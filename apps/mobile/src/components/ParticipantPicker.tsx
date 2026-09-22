import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Text as UIText, TextInput as UITextInput, type TextInputRef } from '@expo/ui';
import { searchUserByEmail } from '../api/users';
import type { ParticipantRef } from './participant';

interface Props {
  participants: ParticipantRef[];
  currentUserId: string;
  onAdd: (user: ParticipantRef) => void;
  onRemove: (userId: string) => void;
  label?: string;
}

export function ParticipantPicker({ participants, currentUserId, onAdd, onRemove, label = 'Split with' }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInputRef>(null);

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
      inputRef.current?.clear();
      setStatus('idle');
    } catch {
      setError('Something went wrong looking that up.');
      setStatus('error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {participants.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.name}>
            {p.displayName}
            {p.id === currentUserId ? ' (you)' : ''}
          </Text>
          {p.id !== currentUserId && (
            <Button variant="text" onPress={() => onRemove(p.id)} style={styles.removeButton}>
              <UIText textStyle={styles.removeText}>Remove</UIText>
            </Button>
          )}
        </View>
      ))}

      <View style={styles.addRow}>
        <View style={styles.inputFlex}>
          <UITextInput
            ref={inputRef}
            style={styles.input}
            textStyle={styles.inputText}
            placeholder="Add by email"
            autoCapitalize="none"
            keyboardType="email-address"
            defaultValue={email}
            onChangeText={setEmail}
            onSubmitEditing={handleAdd}
          />
        </View>
        <Button variant="text" onPress={handleAdd} disabled={status === 'loading'} style={styles.addButton}>
          {status === 'loading' ? <ActivityIndicator /> : <UIText textStyle={styles.addButtonText}>Add</UIText>}
        </Button>
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
  removeButton: { paddingHorizontal: 0, paddingVertical: 0 },
  removeText: { color: '#d92d20', fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8 },
  inputFlex: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  inputText: { fontSize: 16, color: '#000' },
  addButton: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: { fontWeight: '600', color: '#000' },
  error: { color: '#d92d20', fontSize: 13 },
});
