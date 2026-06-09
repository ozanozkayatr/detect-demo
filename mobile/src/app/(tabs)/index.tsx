import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ProfileSummaryCard } from '@/components/profile-summary-card';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, radii, spacing, typography } from '@/design/theme';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import {
  fetchAnalyses,
  fetchHealth,
  type AnalysisRecord,
  type HealthResponse,
} from '@/lib/api';
import { isLoopbackApiBaseUrl, mobileConfig } from '@/lib/config';

export default function HomeTab() {
  const router = useRouter();
  const {
    bootstrapError,
    hasProfile,
    isBootstrapping,
    profile,
    refreshProfile,
  } = useAthleteProfile();
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisRecord | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const nextHealth = await fetchHealth(signal);
      setHealth(nextHealth);
    } catch (nextError) {
      if (signal?.aborted) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : 'Could not check service status.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal);
    return () => controller.abort();
  }, [loadHealth]);

  const loadLatestAnalysis = useCallback(async (signal?: AbortSignal) => {
    setLatestLoading(true);
    setLatestError(null);
    try {
      const analyses = await fetchAnalyses(signal);
      setLatestAnalysis(analyses[0] ?? null);
    } catch (nextError) {
      if (signal?.aborted) {
        return;
      }
      setLatestAnalysis(null);
      setLatestError(
        nextError instanceof Error ? nextError.message : 'Could not load the latest review.',
      );
    } finally {
      if (!signal?.aborted) {
        setLatestLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void loadLatestAnalysis(controller.signal);
      return () => {
        controller.abort();
      };
    }, [loadLatestAnalysis]),
  );

  const geminiReady = Boolean(health?.gemini_configured);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refreshProfile(),
      loadHealth(),
      loadLatestAnalysis(),
    ]);
    setRefreshing(false);
  }, [loadHealth, loadLatestAnalysis, refreshProfile]);

  return (
    <AppScreen
      eyebrow="Detect"
      title="AI review built for boxing training."
      subtitle="Capture a session, run analysis, and turn each round into clear next steps."
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard>
        <StatusPill
          label={
            isBootstrapping
              ? 'Loading profile'
              : bootstrapError
                ? 'Profile unavailable'
                : 'Profile ready'
          }
          tone={
            isBootstrapping ? 'neutral' : bootstrapError ? 'warning' : 'success'
          }
        />
        <Text style={styles.heroTitle}>
          {hasProfile
            ? 'Start a review with the active athlete profile.'
            : 'Create the athlete profile before the first review.'}
        </Text>
        <Text style={styles.heroBody}>
          {hasProfile
            ? 'Upload a clip, choose the review mode, and save structured feedback to the training log.'
            : 'This profile sets coaching tone, difficulty, and progression for every future analysis.'}
        </Text>
        <PrimaryButton
          label={hasProfile ? 'Review a boxing clip' : 'Set up athlete profile'}
          hint={
            hasProfile ? 'Open the review flow' : 'Create the athlete context first'
          }
          icon={<Feather name="arrow-right" size={20} color="#ffffff" />}
          disabled={isBootstrapping || Boolean(bootstrapError)}
          onPress={() => router.push(hasProfile ? '/analysis/new' : '/onboarding')}
        />
      </SectionCard>

      {bootstrapError ? (
        <SectionCard tone="muted" title="Profile loading issue">
          <Text style={styles.bodyText}>{bootstrapError}</Text>
          <PrimaryButton
            label="Retry profile"
            hint="Fetch the athlete context again"
            onPress={() => void refreshProfile()}
          />
        </SectionCard>
      ) : null}

      {profile ? <ProfileSummaryCard profile={profile} /> : null}

      {latestLoading ? (
        <SectionCard title="Latest review" caption="Checking the newest saved session.">
          <View style={styles.statusRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.bodyText}>Loading the most recent review...</Text>
          </View>
        </SectionCard>
      ) : latestError ? (
        <SectionCard title="Could not load latest review" tone="muted">
          <Text style={styles.bodyText}>{latestError}</Text>
          <PrimaryButton
            label="Retry latest review"
            hint="Check the most recent analysis again"
            onPress={() => void loadLatestAnalysis()}
          />
        </SectionCard>
      ) : latestAnalysis ? (
        <SectionCard title="Latest review" caption="Pick up from the most recent saved analysis.">
          <Text style={styles.latestTitle}>{latestAnalysis.prompt_template.title}</Text>
          <Text style={styles.bodyText}>
            {latestAnalysis.parsed_response?.summary ||
              latestAnalysis.raw_response ||
              'Analysis completed.'}
          </Text>
          <PrimaryButton
            label="Open review"
            hint="See the full structured result"
            onPress={() => router.push(`/analysis/${latestAnalysis.id}`)}
          />
        </SectionCard>
      ) : (
        <SectionCard
          title="Latest review"
          caption="Your first saved review will appear here.">
          <Text style={styles.bodyText}>
            Run the first clip review to start building the training log.
          </Text>
          <PrimaryButton
            label={hasProfile ? 'Start first review' : 'Set up athlete profile'}
            hint={
              hasProfile
                ? 'Open the review flow'
                : 'Create the athlete context first'
            }
            onPress={() => router.push(hasProfile ? '/analysis/new' : '/onboarding')}
          />
        </SectionCard>
      )}

      <SectionCard title="Connection status" caption="Check backend, database, and model readiness.">
        {loading ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.bodyText}>Checking service availability...</Text>
          </View>
        ) : error ? (
          <View style={styles.stack}>
            <StatusPill label="Unavailable" tone="warning" />
            <Text style={styles.bodyText}>
              Could not reach {mobileConfig.apiBaseUrl}. On a physical device, replace localhost
              with your computer&apos;s LAN IP.
            </Text>
            <Text style={styles.metaText}>{error}</Text>
            <PrimaryButton
              label="Retry connection check"
              hint="Run the health check again"
              onPress={() => void loadHealth()}
            />
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.healthRow}>
              <StatusPill
                label={health?.database === 'connected' ? 'Database connected' : 'Database issue'}
                tone={health?.database === 'connected' ? 'success' : 'warning'}
              />
              <StatusPill
                label={geminiReady ? 'Gemini ready' : 'Gemini missing'}
                tone={geminiReady ? 'success' : 'warning'}
              />
            </View>
            <Text style={styles.bodyText}>
              API base URL: {mobileConfig.apiBaseUrl}
            </Text>
            <Text style={styles.metaText}>
              Model: {health?.gemini_model ?? 'n/a'}
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard title="Training loop">
        <View style={styles.stepList}>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>01</Text>
            <Text style={styles.stepText}>Set the athlete context that should shape review quality and tone.</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>02</Text>
            <Text style={styles.stepText}>Upload a clip, add an optional focus note, and run the review.</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>03</Text>
            <Text style={styles.stepText}>Save the result, review the feedback, and build a cleaner training log.</Text>
          </View>
        </View>
      </SectionCard>

      {isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl) ? (
        <SectionCard tone="muted" title="Device setup">
          <Text style={styles.bodyText}>
            Expo Go on a real phone cannot reach 127.0.0.1 on your computer. Use your Mac&apos;s
            LAN IP in `mobile/.env` for device testing.
          </Text>
        </SectionCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  heroBody: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.textMuted,
  },
  stack: {
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  healthRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  bodyText: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  latestTitle: {
    fontSize: typography.heading,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.text,
  },
  metaText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  stepList: {
    gap: spacing.md,
  },
  stepItem: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: palette.surfaceMuted,
  },
  stepLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: palette.textSoft,
  },
  stepText: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
