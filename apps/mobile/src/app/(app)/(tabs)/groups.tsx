import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { GroupDTO } from '@pooln/shared';
import * as groupsApi from '../../../api/groups';
import { useTabBarClearance } from '../../../components/FloatingTabBar';
import {
  AppText,
  Avatar,
  AvatarStack,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  LargeHeader,
  SearchBar,
  SkeletonList,
  colors,
  spacing,
} from '../../../ui';

function GroupCard({ group }: { group: GroupDTO }) {
  const count = group.members.length;

  return (
    <Card onPress={() => router.push(`/groups/${group.id}`)} accessibilityLabel={`Open ${group.name}`}>
      <View style={styles.cardRow}>
        <Avatar name={group.name} uri={group.avatarUrl} size={56} shape="squircle" icon={group.avatarUrl ? undefined : 'userGroup'} />
        <View style={styles.cardText}>
          <AppText variant="headline" numberOfLines={1}>
            {group.name}
          </AppText>
          <View style={styles.meta}>
            <Chip label={`${count} ${count === 1 ? 'member' : 'members'}`} icon="people" tone="brand" />
            <AvatarStack people={group.members.map((m) => ({ id: m.userId, name: m.displayName, uri: m.avatarUrl }))} size={28} />
          </View>
        </View>
        <Icon name="chevronRight" size={13} color={colors.tertiaryLabel} />
      </View>
    </Card>
  );
}

export default function GroupsList() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.listGroups(),
  });
  const bottomPadding = useTabBarClearance();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = data?.groups ?? [];
    return q ? all.filter((g) => g.name.toLowerCase().includes(q)) : all;
  }, [data, query]);

  const createGroup = () => router.push('/groups/new');
  const hasGroups = (data?.groups.length ?? 0) > 0;

  return (
    <View style={styles.screen}>
      <LargeHeader
        title="Groups"
        actions={<IconButton icon="plus" variant="filled" onPress={createGroup} accessibilityLabel="Create group" />}
      >
        {hasGroups && <SearchBar value={query} onChangeText={setQuery} placeholder="Search groups" />}
      </LargeHeader>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading && <SkeletonList rows={3} />}
        {isError && <ErrorState message="Couldn't load groups." onRetry={refetch} />}

        {data && !hasGroups && (
          <EmptyState
            icon="userGroup"
            title="No groups yet"
            message="Create a group for your flat, a trip or a team, and split everything in one place."
            actionLabel="Create group"
            onAction={createGroup}
          />
        )}

        {hasGroups && groups.length === 0 && (
          <EmptyState icon="search" title="No matches" message={`No group named “${query.trim()}”.`} />
        )}

        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardText: { flex: 1, gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
