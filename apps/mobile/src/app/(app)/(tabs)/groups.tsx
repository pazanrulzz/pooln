import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { GroupDTO } from '@pooln/shared';
import * as groupsApi from '../../../api/groups';
import { useTabBarClearance } from '../../../components/FloatingTabBar';

function GroupRow({ group }: { group: GroupDTO }) {
  return (
    <Link href={`/groups/${group.id}`} asChild>
      <Pressable style={styles.row}>
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.meta}>
          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function GroupsList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.listGroups(),
  });
  const fabBottom = useTabBarClearance();

  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator style={styles.spinner} />}
      {isError && <Text style={styles.error}>Couldn&apos;t load groups.</Text>}
      {data && (
        <FlatList
          data={data.groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <GroupRow group={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No groups yet. Create one to get started.</Text>}
          contentContainerStyle={data.groups.length === 0 && styles.emptyContainer}
        />
      )}

      <Link href="/groups/new" asChild>
        <Pressable style={StyleSheet.flatten([styles.fab, { bottom: fabBottom }])}>
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  spinner: { marginTop: 40 },
  error: { color: '#d92d20', padding: 20 },
  empty: { color: '#666', textAlign: 'center', padding: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666', fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#208aef',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
