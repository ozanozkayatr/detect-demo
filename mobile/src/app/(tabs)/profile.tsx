import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ProfileSummaryCard } from '@/components/profile-summary-card';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, radii, spacing, typography } from '@/design/theme';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import {
  getExperienceLevelLabel,
} from '@/features/athlete-profile/options';

export default function ProfileTab() {
  const router = useRouter();
  const {
    bootstrapError,
    hasProfile,
    isBootstrapping,
    profile,
    refreshProfile,
    reviewSubject,
  } = useAthleteProfile();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  return (
    <AppScreen
      eyebrow="Athlete profile"
      title="One profile calibrates every review."
      subtitle="Keep the athlete context current so coaching stays relevant across every session."
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard tone="accent">
        <StatusPill
          label={
            isBootstrapping
              ? 'Loading profile'
              : bootstrapError
                ? 'Profile unavailable'
                : 'Profile active'
          }
          tone={
            isBootstrapping ? 'neutral' : bootstrapError ? 'warning' : 'success'
          }
        />
        <Text style={styles.heroText}>
          {hasProfile
            ? 'Update the athlete profile whenever training volume, experience, or goals shift.'
            : 'Create the athlete profile once before you begin reviewing clips.'}
        </Text>
        {profile ? (
          <View style={styles.metricsGrid}>
            <MetricCell
              label="Review target"
              value={reviewSubject?.shortLabel ?? 'Self review'}
            />
            <MetricCell
              label="Level"
              value={getExperienceLevelLabel(profile.experienceLevel)}
            />
            <MetricCell
              label="Rhythm"
              value={`${profile.weeklyTrainingDays ?? '—'} days / week`}
            />
          </View>
        ) : null}
      </SectionCard>

      {bootstrapError ? (
        <SectionCard tone="muted">
          <Text style={styles.bodyText}>{bootstrapError}</Text>
          <PrimaryButton
            label="Retry profile"
            hint="Fetch the latest athlete context"
            onPress={() => void refreshProfile()}
          />
        </SectionCard>
      ) : null}

      {profile ? (
        <ProfileSummaryCard profile={profile} />
      ) : !bootstrapError && !isBootstrapping ? (
        <SectionCard title="No athlete profile yet" tone="muted">
          <Text style={styles.bodyText}>
            Add one athlete profile first so every review has the right level, stance,
            and training context behind it.
          </Text>
        </SectionCard>
      ) : null}

      <PrimaryButton
        label={profile ? 'Edit athlete profile' : 'Create athlete profile'}
        hint={
          profile
            ? 'Update the profile used in future reviews'
            : 'Create the profile used in future reviews'
        }
        disabled={isBootstrapping}
        onPress={() => router.push(hasProfile ? '/profile/edit' : '/onboarding')}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroText: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCell: {
    flexGrow: 1,
    minWidth: 100,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
  },
  metricLabel: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  metricValue: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.text,
  },
  bodyText: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}
