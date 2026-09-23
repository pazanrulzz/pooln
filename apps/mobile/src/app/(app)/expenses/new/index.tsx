import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as authApi from '../../../../api/auth';
import * as groupsApi from '../../../../api/groups';
import * as balancesApi from '../../../../api/balances';
import { searchUserByEmail } from '../../../../api/users';
import type { ParticipantRef } from '../../../../components/participant';
import {
  AppText,
  Avatar,
  Banner,
  Chip,
  EmptyState,
  Icon,
  ListRow,
  ListSection,
  SkeletonList,
  TextField,
  colors,
  spacing,
} from '../../../../ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckMark({ selected }: { selected: boolean }) {
  return <Icon name={selected ? 'checkCircle' : 'circle'} size={24} color={selected ? colors.brand : colors.tertiaryLabel} />;
}

/** Step 1 of adding an expense: pick a group (exclusive) or one or more friends to split with,
 * then continue to `expenses/new/details` with that selection. */
export default function PickExpenseParticipants() {
  const insets = useSafeAreaInsets();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });
  const { data: groupsData } = useQuery({ queryKey: ['groups'], queryFn: () => groupsApi.listGroups() });
  const { data: balances } = useQuery({ queryKey: ['balances'], queryFn: balancesApi.listBalances });

  const [query, setQuery] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [addedByEmail, setAddedByEmail] = useState<ParticipantRef[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<ParticipantRef[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();

  const friends = useMemo<ParticipantRef[]>(() => {
    const known = (balances ?? []).map((b) => ({ id: b.userId, displayName: b.displayName }));
    return [...known, ...addedByEmail.filter((a) => !known.some((k) => k.id === a.id))];
  }, [balances, addedByEmail]);

  const q = query.trim().toLowerCase();
  const visibleGroups = (groupsData?.groups ?? []).filter((g) => !q || g.name.toLowerCase().includes(q));
  const visibleFriends = friends.filter((f) => !q || f.displayName.toLowerCase().includes(q));
  const looksLikeEmail = EMAIL_PATTERN.test(q);

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

  const addByEmail = async () => {
    if (!looksLikeEmail) return;
    setLookingUp(true);
    setLookupError(null);
    try {
      const user = await searchUserByEmail(q);
      if (!user) {
        setLookupError('No Pooln account uses that email. Ask them to sign up first.');
      } else if (user.id === me?.id) {
        setLookupError('That’s you! Pick someone else to split with.');
      } else {
        const person = { id: user.id, displayName: user.displayName };
        setAddedByEmail((prev) => (prev.some((p) => p.id === person.id) ? prev : [...prev, person]));
        setSelectedGroupId(undefined);
        setSelectedFriends((prev) => (prev.some((p) => p.id === person.id) ? prev : [...prev, person]));
        setQuery('');
      }
    } catch {
      setLookupError('Something went wrong looking that up.');
    } finally {
      setLookingUp(false);
    }
  };

  const selectedGroup = groupsData?.groups.find((g) => g.id === selectedGroupId);
  const canContinue = Boolean(selectedGroupId) || selectedFriends.length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    if (selectedGroupId) {
      router.push(`/expenses/new/details?groupId=${selectedGroupId}&returnTo=/`);
      return;
    }
    router.push(`/expenses/new/details?participants=${encodeURIComponent(JSON.stringify(selectedFriends))}&returnTo=/`);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <AppText variant="body" tone="brand">
            Cancel
          </AppText>
        </Pressable>
        <AppText variant="headline">New expense</AppText>
        <Pressable onPress={handleContinue} disabled={!canContinue} hitSlop={10} accessibilityRole="button">
          <AppText variant="body" weight="600" tone={canContinue ? 'brand' : 'tertiary'}>
            Next
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="title2">Who’s splitting?</AppText>

        <TextField
          icon="search"
          placeholder="Search, or add someone by email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (lookupError) setLookupError(null);
          }}
          onSubmitEditing={addByEmail}
          error={lookupError}
          trailing={lookingUp ? <ActivityIndicator color={colors.brand} /> : null}
        />

        {looksLikeEmail && !lookingUp && (
          <ListSection>
            <ListRow
              title={`Add ${q}`}
              subtitle="Split with someone new by email"
              leading={<Avatar name={q} size={36} icon="personAdd" />}
              onPress={addByEmail}
            />
          </ListSection>
        )}

        {(selectedFriends.length > 0 || selectedGroup) && (
          <View style={styles.selection}>
            <AppText variant="footnote" tone="secondary" weight="600">
              WITH YOU AND
            </AppText>
            <View style={styles.chips}>
              {selectedGroup && <Chip label={selectedGroup.name} icon="userGroup" tone="brand" onRemove={() => setSelectedGroupId(undefined)} />}
              {selectedFriends.map((p) => (
                <Chip key={p.id} label={p.displayName} icon="person" tone="brand" onRemove={() => toggleFriend(p)} />
              ))}
            </View>
          </View>
        )}

        {!groupsData || !balances ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            {visibleGroups.length > 0 && (
              <ListSection title="Groups" separatorInset={68}>
                {visibleGroups.map((group) => (
                  <ListRow
                    key={group.id}
                    title={group.name}
                    subtitle={`${group.members.length} members`}
                    leading={<Avatar name={group.name} uri={group.avatarUrl} size={40} shape="squircle" icon={group.avatarUrl ? undefined : 'userGroup'} />}
                    trailing={<CheckMark selected={group.id === selectedGroupId} />}
                    chevron={false}
                    onPress={() => toggleGroup(group.id)}
                  />
                ))}
              </ListSection>
            )}

            {visibleFriends.length > 0 && (
              <ListSection title="Friends" separatorInset={68}>
                {visibleFriends.map((friend) => (
                  <ListRow
                    key={friend.id}
                    title={friend.displayName}
                    leading={<Avatar name={friend.displayName} size={40} />}
                    trailing={<CheckMark selected={selectedFriends.some((p) => p.id === friend.id)} />}
                    chevron={false}
                    onPress={() => toggleFriend(friend)}
                  />
                ))}
              </ListSection>
            )}

            {visibleGroups.length === 0 && visibleFriends.length === 0 && !looksLikeEmail && (
              q ? (
                <EmptyState icon="search" title="No matches" message="Type a full email address to add someone new." />
              ) : (
                <EmptyState icon="people" title="No one here yet" message="Type a friend's email above to split with them." />
              )
            )}
          </>
        )}

        {canContinue && <Banner>Tap Next to enter the amount and how to split it.</Banner>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    backgroundColor: colors.background,
  },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  selection: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
