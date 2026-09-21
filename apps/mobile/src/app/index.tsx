import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HealthStatus } from '@pooln/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; status: HealthStatus['status'] }
  | { kind: 'error'; message: string };

export default function Index() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/health`)
      .then((res) => res.json() as Promise<HealthStatus>)
      .then((data) => {
        if (!cancelled) setState({ kind: 'ok', status: data.status });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pooln</Text>
      <Text>
        {state.kind === 'loading' && 'Checking API…'}
        {state.kind === 'ok' && `API status: ${state.status}`}
        {state.kind === 'error' && `API unreachable: ${state.message}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
