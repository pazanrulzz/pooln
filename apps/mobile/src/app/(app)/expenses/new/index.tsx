import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as authApi from '../../../../api/auth';
import * as groupsApi from '../../../../api/groups';
import * as balancesApi from '../../../../api/balances';
import { searchUserByEmail } from '../../../../api/users';
import type { ParticipantRef } from '../../../../components/participant';

function initials(name: string) {
  return name.charAt(0).toUpperCase();
}

function SelectableRow({
  name,
  selected,
  onPress,
}: {
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>
      <Text style={styles.rowName}>{name}</Text>
      <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>
    </Pressable>
  );
}

/** Step 1 of adding an expense: pick a group (exclusive) or one or more friends to split with,
 * then continue to `expenses/new/details` with that selection. */
export default function PickExpenseParticipants() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data: groupsData } = useQuery({ queryKey: ['groups'], queryFn: () => groupsApi.listGroups() });
  const { data: balances } = useQuery({ queryKey: ['balances'], queryFn: balancesApi.listBalances });

  const [query, setQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<ParticipantRef[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();

  const friends = useMemo<ParticipantRef[]>(
    () => (balances ?? []).map((b) => ({ id: b.userId, displayName: b.displayName })),
    [balances],
  );

  const toggleFriend = (friend: ParticipantRef) => {
    setSelectedGroupId(undefined);
    setSelectedFriends((prev) =>
      prev.some((p) => p.id === friend.id) ? prev.filter((p) => p.id !== friend.id) : [...prev, friend],
    );
  };

  const toggleGroup = (groupId: string) => {
    setSelectedFriends([]);
    setSelectedGroupId((prev) => (prev === groupId ? undefined : groupId));
  };

  const handleSearchSubmit = async () => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    setSearchStatus('loading');
    setSearchError(null);
    try {
      const user = await searchUserByEmail(trimmed);
      if (!user) {
        setSearchError('No Pooln user with that email.');
        setSearchStatus('error');
        return;
      }
      if (user.id === me?.id || selectedFriends.some((p) => p.id === user.id)) {
        setSearchError(`${user.displayName} is already added.`);
        setSearchStatus('error');
        return;
      }
      setSelectedGroupId(undefined);
      setSelectedFriends((prev) => [...prev, { id: user.id, displayName: user.displayName }]);
      setQuery('');
      setSearchStatus('idle');
    } catch {
      setSearchError('Something went wrong looking that up.');
      setSearchStatus('error');
    }
  };

  const canContinue = Boolean(selectedGroupId) || selectedFriends.length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    if (selectedGroupId) {
      router.push(`/expenses/new/details?groupId=${selectedGroupId}&returnTo=/`);
      return;
    }
    router.push(
      `/expenses/new/details?participants=${encodeURIComponent(JSON.stringify(selectedFriends))}&returnTo=/`,
    );
  };

  if (!me) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add an expense</Text>
        <Pressable onPress={handleContinue} disabled={!canContinue} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, !canContinue && styles.headerButtonTextDisabled]}>✓</Text>
        </Pressable>
      </View>

      <View style={styles.withRow}>
        <Text style={styles.withLabel}>With you and:</Text>
        <TextInput
          style={styles.withInput}
          placeholder="Enter an email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearchSubmit}
        />
        {searchStatus === 'loading' && <ActivityIndicator size="small" />}
      </View>
      {searchError && <Text style={styles.error}>{searchError}</Text>}

      {selectedFriends.length > 0 && (
        <View style={styles.chipsRow}>
          {selectedFriends.map((p) => (
            <Pressable key={p.id} style={styles.chip} onPress={() => toggleFriend(p)}>
              <Text style={styles.chipText}>{p.displayName} ✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView style={styles.list}>
        {groupsData && groupsData.groups.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Groups</Text>
            {groupsData.groups.map((group) => (
              <SelectableRow
                key={group.id}
                name={group.name}
                selected={group.id === selectedGroupId}
                onPress={() => toggleGroup(group.id)}
              />
            ))}
          </>
        )}

        {friends.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Friends</Text>
            {friends.map((friend) => (
              <SelectableRow
                key={friend.id}
                name={friend.displayName}
                selected={selectedFriends.some((p) => p.id === friend.id)}
                onPress={() => toggleFriend(friend)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  spinner: { marginTop: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerButtonText: { fontSize: 20 },
  headerButtonTextDisabled: { color: '#ccc' },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  withRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 6,
  },
  withLabel: { fontSize: 15 },
  withInput: { flex: 1, fontSize: 15, minWidth: 80 },
  error: { color: '#d92d20', fontSize: 13, paddingHorizontal: 16, paddingTop: 6 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  chip: {
    backgroundColor: '#eef4fb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, color: '#208aef' },
  list: { flex: 1 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#666' },
  rowName: { flex: 1, fontSize: 15 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: { backgroundColor: '#208aef', borderColor: '#208aef' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
