import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import {
  getExperienceLevelLabel,
  getStanceLabel,
} from '@/features/athlete-profile/options';
import { fetchHealth, type HealthResponse } from '@/lib/api';
import { useAppClerk } from '@/lib/auth';
import { isLoopbackApiBaseUrl, mobileConfig } from '@/lib/config';

export default function SettingsTab() {
  const { isDevBypass, signOut } = useAppClerk();
  const router = useRouter();
  const {
    isBootstrapping,
    profile,
    refreshProfile,
    user,
  } = useAthleteProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const nextHealth = await fetchHealth(signal);
      setHealth(nextHealth);
    } catch (nextError) {
      if (signal?.aborted) {
        return;
      }
      setHealth(null);
      setHealthError(
        nextError instanceof Error ? nextError.message : 'Could not check the review system.',
      );
    } finally {
      if (!signal?.aborted) {
        setLoadingHealth(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal);
    return () => controller.abort();
  }, [loadHealth]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshProfile(), loadHealth()]);
    setRefreshing(false);
  }, [loadHealth, refreshProfile]);

  if (!isBootstrapping && !profile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AppScreen
      title="Settings"
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard tone="accent" title="Account">
        <StatusPill
          label={isBootstrapping ? 'Loading' : 'Active'}
          tone={isBootstrapping ? 'neutral' : 'success'}
        />
        <View style={styles.stack}>
          <Text style={styles.heroText}>{user?.display_name ?? 'Account'}</Text>
          <View style={styles.metricsGrid}>
            <MetricCell label="Contact" value={formatContact(user)} />
            <MetricCell
              label="Member since"
              value={user ? formatDate(user.created_at) : 'n/a'}
            />
          </View>
        </View>
        <PrimaryButton
          label="Refresh app state"
          onPress={() => void handleRefresh()}
        />
        {!isDevBypass ? (
          <PrimaryButton
            label="Sign out"
            onPress={() => void signOut()}
          />
        ) : null}
      </SectionCard>

      <SectionCard title="Profile">
        <StatusPill label="Profile active" tone="success" />
        {profile ? (
          <View style={styles.metricsGrid}>
            <MetricCell label="Athlete" value={profile.name} />
            <MetricCell label="Stance" value={getStanceLabel(profile.stance)} />
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
        <PrimaryButton
          label="Edit athlete profile"
          onPress={() => router.push('/profile/edit')}
        />
      </SectionCard>

      <SectionCard title="System">
        {loadingHealth ? (
          <View style={styles.inlineStatus}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.body}>Checking system...</Text>
          </View>
        ) : healthError ? (
          <View style={styles.stack}>
            <StatusPill label="Unavailable" tone="warning" />
            <Text style={styles.body}>Could not reach the review service.</Text>
            <Text style={styles.metaText}>{healthError}</Text>
            <PrimaryButton
              label="Retry check"
              onPress={() => void loadHealth()}
            />
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.pillRow}>
              <StatusPill
                label={health?.status === 'ok' ? 'API ready' : 'API issue'}
                tone={health?.status === 'ok' ? 'success' : 'warning'}
              />
              <StatusPill
                label={health?.database === 'connected' ? 'Database ready' : 'Database issue'}
                tone={health?.database === 'connected' ? 'success' : 'warning'}
              />
              <StatusPill
                label={health?.gemini_configured ? 'Gemini ready' : 'Gemini missing'}
                tone={health?.gemini_configured ? 'success' : 'warning'}
              />
            </View>
            <Text style={styles.body}>
              {health?.gemini_configured ? 'Ready for new reviews.' : 'Gemini is not configured.'}
            </Text>
            <View style={styles.metricsGrid}>
              <MetricCell label="Model" value={health?.gemini_model ?? 'n/a'} />
              <MetricCell
                label="API base"
                value={isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl) ? 'Localhost' : 'Remote'}
              />
            </View>
          </View>
        )}
      </SectionCard>
    </AppScreen>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatContact(user: {
  email: string | null;
  phone_number: string | null;
} | null) {
  if (!user) {
    return 'n/a';
  }

  return user.email ?? user.phone_number ?? 'Not provided';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatTrainingRhythm(days: number | null) {
  if (!days) {
    return 'Not recorded';
  }

  return `${days} day${days === 1 ? '' : 's'} / week`;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroText: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  metricCell: {
    minWidth: 120,
    flexGrow: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    backgroundColor: palette.surfaceMuted,
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  metaText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
});
