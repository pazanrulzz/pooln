import { Avatar, Icon, ListRow, ListSection, colors } from '../ui';
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
    <ListSection title={`Split with · ${selectedIds.length} of ${members.length}`} separatorInset={64}>
      {members.map((member) => {
        const isSelected = selectedIds.includes(member.id);
        const isSelf = member.id === currentUserId;

        return (
          <ListRow
            key={member.id}
            title={isSelf ? `${member.displayName} (you)` : member.displayName}
            leading={<Avatar name={member.displayName} size={36} />}
            onPress={isSelf ? undefined : () => onToggle(member.id)}
            chevron={false}
            trailing={
              <Icon
                name={isSelected ? 'checkCircle' : 'circle'}
                size={22}
                color={isSelected ? colors.brand : colors.tertiaryLabel}
              />
            }
          />
        );
      })}
    </ListSection>
  );
}
