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

export default function ProfileTab() {
  const router = useRouter();
  const {
    isBootstrapping,
    profile,
    refreshProfile,
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
      title="Athlete profile"
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard tone="accent">
        <StatusPill
          label={isBootstrapping ? 'Loading' : 'Active'}
          tone={isBootstrapping ? 'neutral' : 'success'}
        />
        <Text style={styles.heroText}>
          Update the baseline when training changes.
        </Text>
        {profile ? (
          <View style={styles.metricsGrid}>
            <MetricCell
              label="Level"
              value={getExperienceLevelLabel(profile.experienceLevel)}
            />
            <MetricCell label="Stance" value={profile.stance} />
            <MetricCell
              label="Rhythm"
              value={formatTrainingRhythm(profile.weeklyTrainingDays)}
            />
          </View>
        ) : null}
      </SectionCard>

      {profile ? <ProfileSummaryCard profile={profile} /> : null}

      <PrimaryButton
        label="Edit athlete profile"
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
});

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatTrainingRhythm(days: number | null) {
  if (!days) {
    return 'Not recorded';
  }

  return `${days} day${days === 1 ? '' : 's'} / week`;
}
