import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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

export default function HomeTab() {
  const router = useRouter();
  const {
    isBootstrapping,
    profile,
    refreshProfile,
    reviewSubject,
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

  if (!isBootstrapping && !profile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AppScreen
      eyebrow="Dashboard"
      title="Keep the next round in motion."
      subtitle="Run reviews, revisit feedback, and keep the active athlete context aligned with training."
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard tone="accent">
        <StatusPill
          label={isBootstrapping ? 'Loading athlete' : 'Ready for review'}
          tone={isBootstrapping ? 'neutral' : 'success'}
        />
        <Text style={styles.heroTitle}>
          Ready to turn the next clip into clear coaching.
        </Text>
        <Text style={styles.heroBody}>
          {reviewSubject?.displayName ?? profile?.name ?? 'Your athlete profile'} is the active
          context for the next saved review.
        </Text>
        <PrimaryButton
          label="Review a boxing clip"
          hint="Open the review flow"
          icon={<Feather name="arrow-right" size={20} color="#ffffff" />}
          disabled={isBootstrapping}
          onPress={() => router.push('/analysis/new')}
        />
      </SectionCard>

      {profile ? <ProfileSummaryCard profile={profile} /> : null}

      <SectionCard title="Quick actions" caption="Move between capture, history, and profile updates.">
        <View style={styles.actionList}>
          <QuickActionTile
            icon="play-circle"
            title="Start a new review"
            description="Upload the next clip and save fresh feedback."
            onPress={() => router.push('/analysis/new')}
          />
          <QuickActionTile
            icon="clock"
            title="Open the review log"
            description="Revisit previous notes, issues, and next steps."
            onPress={() => router.push('/(tabs)/analyses')}
          />
          <QuickActionTile
            icon="user"
            title="Update athlete profile"
            description="Keep level, routine, and stance aligned with training."
            onPress={() => router.push('/profile/edit')}
          />
        </View>
      </SectionCard>

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
            hint="Check the most recent review again"
            onPress={() => void loadLatestAnalysis()}
          />
        </SectionCard>
      ) : latestAnalysis ? (
        <SectionCard title="Latest review" caption="Pick up from the newest saved result.">
          <Text style={styles.latestTitle}>{latestAnalysis.prompt_template.title}</Text>
          <Text style={styles.bodyText}>
            {latestAnalysis.parsed_response?.summary ||
              latestAnalysis.raw_response ||
              'Review completed.'}
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
            label="Start first review"
            hint="Open the review flow"
            onPress={() => router.push('/analysis/new')}
          />
        </SectionCard>
      )}

      {!loading && (error || !geminiReady) ? (
        <SectionCard title="Review setup issue" tone="muted">
          {error ? (
            <>
              <Text style={styles.bodyText}>
                The app could not reach the review service. Check the backend, then try again.
              </Text>
              <Text style={styles.metaText}>{error}</Text>
              <PrimaryButton
                label="Retry service check"
                hint="Run the health check again"
                onPress={() => void loadHealth()}
              />
            </>
          ) : (
            <>
              <Text style={styles.bodyText}>
                Gemini is not configured yet, so new reviews will not complete until the model is available.
              </Text>
              <PrimaryButton
                label="Open settings"
                hint="Review the current app configuration"
                onPress={() => router.push('/(tabs)/settings')}
              />
            </>
          )}
        </SectionCard>
      ) : null}
    </AppScreen>
  );
}

function QuickActionTile({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionTile, pressed && styles.actionTilePressed]}>
      <View style={styles.actionIconWrap}>
        <Feather name={icon} size={18} color={palette.text} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={palette.textSoft} />
    </Pressable>
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
  actionList: {
    gap: spacing.sm,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  actionTilePressed: {
    opacity: 0.92,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  actionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  actionTitle: {
    fontSize: typography.body,
    lineHeight: 24,
    fontWeight: '700',
    color: palette.text,
  },
  actionDescription: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
});
