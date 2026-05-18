import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ProfileSummaryCard } from '@/components/profile-summary-card';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, radii, spacing, typography } from '@/design/theme';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';

const steps = [
  {
    title: 'Upload a boxing clip',
    copy: 'Native media picker and local upload should connect to the existing FastAPI video endpoint.',
  },
  {
    title: 'Use the athlete profile',
    copy: 'Future analyses should read the single stored athlete profile instead of the current web demo persona system.',
  },
  {
    title: 'Add an optional focus note',
    copy: 'Support inputs like “I’m the boxer on the right” without letting them override visible evidence.',
  },
  {
    title: 'Run Gemini and review',
    copy: 'Show structured summary, strengths, issues, next steps, notes, and raw output on mobile.',
  },
] as const;

export default function NewAnalysisScreen() {
  const router = useRouter();
  const { profile, hasProfile } = useAthleteProfile();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppScreen
        eyebrow="New analysis"
        title="This route is the first native shell for the future mobile flow."
        subtitle="Keep the backend exactly as it is. Replace the current web demo setup with mobile-native athlete onboarding, upload, and review over time."
        rightSlot={
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Feather name="x" size={20} color={palette.text} />
          </Pressable>
        }>
        <SectionCard tone="accent">
          <StatusPill
            label={hasProfile ? 'Ready for upload next' : 'Profile required first'}
            tone={hasProfile ? 'success' : 'warning'}
          />
          <Text style={styles.heroText}>
            {hasProfile
              ? 'The backend is ready. Native upload and result review are the next implementation track.'
              : 'Before native upload, the app needs the athlete profile that will calibrate future analysis.'}
          </Text>
        </SectionCard>

        {profile ? <ProfileSummaryCard profile={profile} /> : null}

        <SectionCard title="Native flow breakdown">
          <View style={styles.stepList}>
            {steps.map((step, index) => (
              <View key={step.title} style={styles.stepCard}>
                <Text style={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.copy}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <PrimaryButton
          label={hasProfile ? 'Back to mobile home' : 'Set up athlete profile first'}
          hint={
            hasProfile
              ? 'Keep the shell in place, then implement upload and analysis next'
              : 'Open the guided onboarding flow now'
          }
          onPress={() => router.replace(hasProfile ? '/' : '/onboarding')}
        />
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  heroText: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  stepList: {
    gap: spacing.md,
  },
  stepCard: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderStrong,
  },
  stepNumber: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: palette.textSoft,
  },
  stepTitle: {
    fontSize: typography.heading,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.text,
  },
  stepBody: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.textMuted,
  },
});
