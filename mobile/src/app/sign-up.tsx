import { isClerkAPIResponseError } from '@clerk/expo';
import { useSignUp } from '@clerk/expo/legacy';
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

  return error instanceof Error ? error.message : 'Sign up could not be completed.';
}

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, setActive, signUp } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCreateAccount() {
    if (!isLoaded) {
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
      setAwaitingVerification(true);
    } catch (error) {
      setSubmitError(formatClerkError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyEmail() {
    if (!isLoaded) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status !== 'complete' || !result.createdSessionId) {
        setSubmitError('Email verification did not finish yet. Check the code and try again.');
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.replace('/onboarding');
    } catch (error) {
      setSubmitError(formatClerkError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen
      eyebrow="Create account"
      title="Start with a real athlete identity."
      subtitle="Create the login first, then complete the required boxing profile step by step.">
      <SectionCard
        title={awaitingVerification ? 'Verify the email' : 'Create the account'}
        caption={
          awaitingVerification
            ? 'Enter the one-time code from Clerk to activate the session.'
            : 'This sign-in becomes the permanent home for saved clips and reviews.'
        }>
        {!awaitingVerification ? (
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
                autoComplete="new-password"
                placeholder="Create a password"
                placeholderTextColor={palette.textSoft}
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Repeat the password"
                placeholderTextColor={palette.textSoft}
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>
        ) : (
          <View style={styles.fieldStack}>
            <View style={styles.field}>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor={palette.textSoft}
                style={styles.input}
                value={verificationCode}
                onChangeText={setVerificationCode}
              />
            </View>
          </View>
        )}

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <PrimaryButton
          label={
            submitting
              ? awaitingVerification
                ? 'Verifying...'
                : 'Creating account...'
              : awaitingVerification
                ? 'Verify email'
                : 'Create account'
          }
          hint={
            awaitingVerification
              ? 'Activate the session and continue to onboarding'
              : 'Send the verification step to Clerk'
          }
          disabled={
            submitting ||
            !isLoaded ||
            (awaitingVerification
              ? verificationCode.trim().length < 4
              : !emailAddress.trim() || password.length < 8 || confirmPassword.length < 8)
          }
          onPress={() =>
            void (awaitingVerification ? handleVerifyEmail() : handleCreateAccount())
          }
        />
      </SectionCard>

      <SectionCard tone="muted">
        <Text style={styles.secondaryText}>Already have an account?</Text>
        <Link href="/sign-in" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Sign in instead</Text>
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
