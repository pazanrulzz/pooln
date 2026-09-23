import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { searchUserByEmail } from '../api/users';
import { AppText, Avatar, Icon, ListRow, ListSection, TextField, colors, spacing } from '../ui';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const user = await searchUserByEmail(trimmed);
      if (!user) {
        setError('No Pooln account uses that email. Ask them to sign up first.');
      } else if (participants.some((p) => p.id === user.id)) {
        setError(`${user.displayName} is already added.`);
      } else {
        onAdd(user);
        setEmail('');
      }
    } catch {
      setError('Something went wrong looking that up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ListSection title={`${label} · ${participants.length}`} separatorInset={64}>
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          return (
            <ListRow
              key={p.id}
              title={isMe ? `${p.displayName} (you)` : p.displayName}
              leading={<Avatar name={p.displayName} size={36} />}
              trailing={
                isMe ? undefined : (
                  <Pressable onPress={() => onRemove(p.id)} hitSlop={10} accessibilityLabel={`Remove ${p.displayName}`}>
                    <Icon name="minusCircle" size={22} color={colors.negative} />
                  </Pressable>
                )
              }
            />
          );
        })}
      </ListSection>

      <TextField
        icon="personAdd"
        placeholder="Add someone by email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="done"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) setError(null);
        }}
        onSubmitEditing={handleAdd}
        error={error}
        trailing={
          loading ? (
            <ActivityIndicator color={colors.brand} />
          ) : email.trim() ? (
            <Pressable onPress={handleAdd} hitSlop={8} accessibilityRole="button">
              <AppText variant="subhead" tone="brand" weight="600">
                Add
              </AppText>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
});
