import { isClerkAPIResponseError } from '@clerk/expo';
import { useSignIn } from '@clerk/expo/legacy';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { palette, radii, spacing, typography } from '@/design/theme';

function formatClerkError(error: unknown) {
  if (isClerkAPIResponseError(error) && error.errors[0]?.longMessage) {
    return error.errors[0].longMessage;
  }

  return error instanceof Error ? error.message : 'Sign in could not be completed.';
}

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded, setActive, signIn } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!isLoaded) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (result.status !== 'complete' || !result.createdSessionId) {
        setSubmitError('Sign in needs another verification step that is not enabled here yet.');
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.replace('/');
    } catch (error) {
      setSubmitError(formatClerkError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen
      eyebrow="Sign in"
      title="Return to training."
      subtitle="Sign in once on this device and keep the active boxing account available.">
      <SectionCard title="Account access">
        <View style={styles.fieldStack}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={palette.textSoft}
              style={styles.input}
              value={emailAddress}
              onChangeText={setEmailAddress}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              placeholder="Enter your password"
              placeholderTextColor={palette.textSoft}
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <PrimaryButton
          label={submitting ? 'Signing in...' : 'Sign in'}
          hint="Restore the saved athlete account"
          disabled={
            submitting || !emailAddress.trim() || password.length < 8 || !isLoaded
          }
          onPress={() => void handleSignIn()}
        />
      </SectionCard>

      <SectionCard tone="muted">
        <Text style={styles.secondaryText}>
          New here? Create the account first, then complete the athlete profile before the first review.
        </Text>
        <Link href="/sign-up" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Create account</Text>
          </Pressable>
        </Link>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  fieldStack: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    color: palette.text,
  },
  errorText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.warning,
  },
  secondaryText: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
    color: palette.accent,
  },
});
