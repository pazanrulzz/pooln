import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Host, Text as UIText, TextInput as UITextInput } from '@expo/ui';
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
    <Host style={styles.container} colorScheme="light" ignoreSafeArea="all">
      <View style={styles.titleBox}>
        <UIText textStyle={styles.titleText}>Create your account</UIText>
      </View>

      <Controller
        control={control}
        name="displayName"
        render={({ field }) => (
          <UITextInput
            style={styles.input}
            textStyle={styles.inputText}
            placeholder="Name"
            autoComplete="name"
            defaultValue={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      {errors.displayName && <Text style={styles.error}>{errors.displayName.message}</Text>}

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <UITextInput
            style={styles.input}
            textStyle={styles.inputText}
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            defaultValue={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <UITextInput
            style={styles.input}
            textStyle={styles.inputText}
            placeholder="Password (min. 8 characters)"
            secureTextEntry
            autoComplete="new-password"
            defaultValue={field.value}
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

      <View style={styles.buttonBox}>
        <Button
          variant="text"
          onPress={handleSubmit((values) => mutation.mutate(values))}
          disabled={mutation.isPending}
          style={styles.button}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <UIText textStyle={styles.buttonText}>Sign up</UIText>
          )}
        </Button>
      </View>

      <Link href="/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  titleBox: { marginBottom: 12 },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  inputText: { fontSize: 16, color: '#000' },
  error: {
    color: '#d92d20',
    fontSize: 13,
  },
  buttonBox: { marginTop: 8 },
  button: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
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
