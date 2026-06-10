import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
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
      title="Ready for the next round."
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard tone="accent">
        <StatusPill
          label={isBootstrapping ? 'Loading' : 'Ready'}
          tone={isBootstrapping ? 'neutral' : 'success'}
        />
        <Text style={styles.heroTitle}>Start the next review.</Text>
        <Text style={styles.heroBody}>
          {reviewSubject?.displayName ?? profile?.name ?? 'Your athlete profile'} is active.
        </Text>
        <PrimaryButton
          label="New review"
          icon={<Feather name="arrow-right" size={20} color="#ffffff" />}
          disabled={isBootstrapping}
          onPress={() => router.push('/analysis/new')}
        />
      </SectionCard>

      <SectionCard title="Quick actions">
        <View style={styles.actionList}>
          <QuickActionTile
            icon="play-circle"
            title="Start review"
            onPress={() => router.push('/analysis/new')}
          />
          <QuickActionTile
            icon="clock"
            title="Review log"
            onPress={() => router.push('/(tabs)/analyses')}
          />
          <QuickActionTile
            icon="user"
            title="Edit profile"
            onPress={() => router.push('/profile/edit')}
          />
        </View>
      </SectionCard>

      {latestLoading ? (
        <SectionCard title="Latest review">
          <View style={styles.statusRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.bodyText}>Loading...</Text>
          </View>
        </SectionCard>
      ) : latestError ? (
        <SectionCard title="Latest review unavailable" tone="muted">
          <Text style={styles.bodyText}>{latestError}</Text>
          <PrimaryButton
            label="Retry"
            onPress={() => void loadLatestAnalysis()}
          />
        </SectionCard>
      ) : latestAnalysis ? (
        <SectionCard title="Latest review">
          <Text style={styles.latestTitle}>{latestAnalysis.prompt_template.title}</Text>
          <Text style={styles.bodyText}>
            {latestAnalysis.parsed_response?.summary ||
              latestAnalysis.raw_response ||
              'Review completed.'}
          </Text>
          <PrimaryButton
            label="Open review"
            onPress={() => router.push(`/analysis/${latestAnalysis.id}`)}
          />
        </SectionCard>
      ) : (
        <SectionCard title="Latest review">
          <Text style={styles.bodyText}>No saved reviews yet.</Text>
          <PrimaryButton
            label="Start review"
            onPress={() => router.push('/analysis/new')}
          />
        </SectionCard>
      )}

      {!loading && (error || !geminiReady) ? (
        <SectionCard title="System issue" tone="muted">
          {error ? (
            <>
              <Text style={styles.bodyText}>Could not reach the review service.</Text>
              <Text style={styles.metaText}>{error}</Text>
              <PrimaryButton
                label="Retry check"
                onPress={() => void loadHealth()}
              />
            </>
          ) : (
            <>
              <Text style={styles.bodyText}>Gemini is not configured.</Text>
              <PrimaryButton
                label="Open settings"
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
  icon,
  onPress,
  title,
}: {
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
      <Text style={styles.actionTitle}>{title}</Text>
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
  actionTitle: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    fontWeight: '700',
    color: palette.text,
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
