import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { signupSchema, type SignupInput } from '@pooln/shared';
import * as authApi from '../api/auth';
import * as invitesApi from '../api/invites';
import { ApiError } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export default function SignUp() {
  const { inviteToken } = useLocalSearchParams<{ inviteToken?: string }>();
  const setTokens = useAuthStore((s) => s.setTokens);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: async (data) => {
      setTokens(data);
      if (inviteToken) {
        const group = await invitesApi.acceptInvite(inviteToken);
        router.replace(`/groups/${group.id}`);
      }
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <Controller
        control={control}
        name="displayName"
        render={({ field }) => (
          <TextInput
            style={styles.input}
            placeholder="Name"
            autoComplete="name"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      {errors.displayName && <Text style={styles.error}>{errors.displayName.message}</Text>}

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextInput
            style={styles.input}
            placeholder="Password (min. 8 characters)"
            secureTextEntry
            autoComplete="new-password"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      {mutation.isError && (
        <Text style={styles.error}>
          {mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}
        </Text>
      )}

      <Pressable
        style={styles.button}
        onPress={handleSubmit((values) => mutation.mutate(values))}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign up</Text>
        )}
      </Pressable>

      <Link href="/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: '#d92d20',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#208aef',
  },
});
