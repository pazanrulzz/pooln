import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { signupSchema, type SignupInput } from '@pooln/shared';
import * as authApi from '../api/auth';
import * as invitesApi from '../api/invites';
import { ApiError } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { AuthLayout } from '../components/AuthLayout';
import { AppText, Banner, Button, TextField } from '../ui';

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

  const submit = handleSubmit((values) => mutation.mutate(values));

  return (
    <AuthLayout
      title="Create your account"
      subtitle={inviteToken ? 'Join Pooln to accept your group invite.' : 'It takes less than a minute.'}
      footer={
        <AppText variant="subhead" tone="secondary">
          Already have an account?{' '}
          <Link href={{ pathname: '/sign-in', params: inviteToken ? { inviteToken } : {} }}>
            <AppText variant="subhead" tone="brand" weight="600">
              Sign in
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
        name="displayName"
        render={({ field }) => (
          <TextField
            variant="filled"
            label="Name"
            icon="person"
            placeholder="Alex Morgan"
            autoComplete="name"
            textContentType="name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.displayName?.message}
          />
        )}
      />

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
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
            hint="Use 8 or more characters."
          />
        )}
      />

      <Button title="Create account" onPress={submit} loading={mutation.isPending} />
    </AuthLayout>
  );
}
