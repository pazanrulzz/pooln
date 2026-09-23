import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { loginSchema, type LoginInput } from '@pooln/shared';
import * as authApi from '../api/auth';
import * as invitesApi from '../api/invites';
import { ApiError } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { AuthLayout } from '../components/AuthLayout';
import { AppText, Banner, Button, TextField } from '../ui';

export default function SignIn() {
  const { inviteToken } = useLocalSearchParams<{ inviteToken?: string }>();
  const setTokens = useAuthStore((s) => s.setTokens);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      setTokens(data);
      if (inviteToken) {
        const group = await invitesApi.acceptInvite(inviteToken);
        router.replace(`/groups/${group.id}`);
      }
    },
  });

  const submit = handleSubmit((values) => mutation.mutate(values));

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={inviteToken ? 'Sign in to accept your group invite.' : 'Sign in to see who owes what.'}
      footer={
        <AppText variant="subhead" tone="secondary">
          New to Pooln?{' '}
          <Link href={{ pathname: '/sign-up', params: inviteToken ? { inviteToken } : {} }}>
            <AppText variant="subhead" tone="brand" weight="600">
              Create an account
            </AppText>
          </Link>
        </AppText>
      }
    >
      {mutation.isError && (
        <Banner tone="error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong. Please try again.'}
        </Banner>
      )}

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            variant="filled"
            label="Email"
            icon="envelope"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            variant="filled"
            label="Password"
            icon="lock"
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
          />
        )}
      />

      <Button title="Sign in" onPress={submit} loading={mutation.isPending} />
    </AuthLayout>
  );
}
