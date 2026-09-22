import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ParticipantRef } from './participant';

interface Props {
  members: ParticipantRef[];
  selectedIds: string[];
  currentUserId: string;
  onToggle: (userId: string) => void;
}

/**
 * Unlike ParticipantPicker (free add-by-email against any Pooln user), this
 * toggles membership within a fixed, known roster — a group's own members,
 * nobody outside it is ever selectable.
 */
export function GroupMemberSelector({ members, selectedIds, currentUserId, onToggle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Split with</Text>

      {members.map((member) => {
        const isSelected = selectedIds.includes(member.id);
        const isSelf = member.id === currentUserId;

        return (
          <Pressable
            key={member.id}
            style={styles.row}
            onPress={() => !isSelf && onToggle(member.id)}
            disabled={isSelf}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.name}>
              {member.displayName}
              {isSelf ? ' (you)' : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#208aef',
    borderColor: '#208aef',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  name: { fontSize: 15 },
});
