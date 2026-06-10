import { Redirect, useRouter } from 'expo-router';
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
import type { AthleteProfile } from '@/features/athlete-profile/types';

export default function ProfileTab() {
  const router = useRouter();
  const {
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

  if (!isBootstrapping && !profile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AppScreen
      eyebrow="Athlete profile"
      title="Keep the athlete baseline sharp."
      subtitle="This profile shapes coaching depth, pacing, and context across every saved review."
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard tone="accent">
        <StatusPill
          label={isBootstrapping ? 'Loading profile' : 'Profile active'}
          tone={isBootstrapping ? 'neutral' : 'success'}
        />
        <Text style={styles.heroText}>
          Update the baseline whenever training volume, experience, or goals change.
        </Text>
        {profile ? (
          <View style={styles.metricsGrid}>
            <MetricCell
              label="Target"
              value={reviewSubject?.shortLabel ?? 'Self review'}
            />
            <MetricCell
              label="Level"
              value={getExperienceLevelLabel(profile.experienceLevel)}
            />
            <MetricCell
              label="Rhythm"
              value={formatTrainingRhythm(profile.weeklyTrainingDays)}
            />
          </View>
        ) : null}
      </SectionCard>

      {profile ? (
        <SectionCard
          title="Calibration snapshot"
          caption="How Detect will frame the next saved review.">
          <View style={styles.calibrationStack}>
            <CalibrationRow
              label="Coaching depth"
              value={describeCoachingDepth(profile)}
            />
            <CalibrationRow
              label="Progression pace"
              value={describeProgressLens(profile)}
            />
            <CalibrationRow
              label="Constraint lens"
              value={describeConstraintLens(profile)}
            />
          </View>
        </SectionCard>
      ) : null}

      {profile ? <ProfileSummaryCard profile={profile} /> : null}

      <PrimaryButton
        label="Edit athlete profile"
        hint="Update the profile used in future reviews"
        disabled={isBootstrapping}
        onPress={() => router.push('/profile/edit')}
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
  calibrationStack: {
    gap: spacing.md,
  },
  calibrationRow: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  calibrationLabel: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  calibrationValue: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
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

function CalibrationRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.calibrationRow}>
      <Text style={styles.calibrationLabel}>{label}</Text>
      <Text style={styles.calibrationValue}>{value}</Text>
    </View>
  );
}

function formatTrainingRhythm(days: number | null) {
  if (!days) {
    return 'Not recorded';
  }

  return `${days} day${days === 1 ? '' : 's'} / week`;
}

function describeCoachingDepth(profile: AthleteProfile) {
  if (
    profile.hasProfessionalExperience ||
    profile.hasCoachingExperience ||
    profile.experienceLevel === 'coach_or_former_competitor' ||
    profile.experienceLevel === 'experienced_competitor'
  ) {
    return 'Reviews should skip beginner framing and lean into sharper technical correction.';
  }

  if (
    profile.experienceLevel === 'advanced_amateur' ||
    profile.experienceLevel === 'intermediate'
  ) {
    return 'Reviews should balance technical critique with actionable training cues.';
  }

  return 'Reviews should stay simple, grounded, and beginner-appropriate.';
}

function describeProgressLens(profile: AthleteProfile) {
  if ((profile.weeklyTrainingDays ?? 0) >= 5) {
    return 'Next steps can assume consistent weekly repetition and higher training tolerance.';
  }

  if ((profile.weeklyTrainingDays ?? 0) >= 3) {
    return 'Next steps should assume steady weekly practice without overloading the athlete.';
  }

  return 'Next steps should stay compact and repeatable between lighter training weeks.';
}

function describeConstraintLens(profile: AthleteProfile) {
  if (profile.limitations.trim()) {
    return 'Visible feedback should respect the recorded limitations and avoid careless progression cues.';
  }

  if (profile.additionalContext.trim()) {
    return 'Added context should shape emphasis and next-step selection in future reviews.';
  }

  return 'Reviews should rely on visible movement, stated level, and routine history as the main lens.';
}
