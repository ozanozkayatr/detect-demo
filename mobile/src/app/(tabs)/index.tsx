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
  const { bootstrapError, isBootstrapping, profile } = useAthleteProfile();
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisRecord | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetchHealth(controller.signal)
      .then(setHealth)
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const controller = new AbortController();
      setLatestLoading(true);

      fetchAnalyses(controller.signal)
        .then((analyses) => {
          if (!cancelled) {
            setLatestAnalysis(analyses[0] ?? null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLatestAnalysis(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLatestLoading(false);
          }
        });

      return () => {
        cancelled = true;
        controller.abort();
      };
    }, []),
  );

  const geminiReady = Boolean(health?.gemini_configured);

  return (
    <AppScreen
      eyebrow="Detect"
      title="AI boxing review that feels like a private coach."
      subtitle="Move straight into upload, analysis, and structured boxing feedback.">
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
          Review a boxing clip with an active athlete profile.
        </Text>
        <Text style={styles.heroBody}>
          Upload a clip, choose the analysis prompt, and read structured Gemini feedback in one pass.
        </Text>
        <PrimaryButton
          label="Review a boxing clip"
          hint="Open the analysis flow"
          icon={<Feather name="arrow-right" size={20} color="#ffffff" />}
          disabled={isBootstrapping || Boolean(bootstrapError)}
          onPress={() => router.push('/analysis/new')}
        />
      </SectionCard>

      {bootstrapError ? (
        <SectionCard tone="muted" title="Profile loading issue">
          <Text style={styles.bodyText}>{bootstrapError}</Text>
        </SectionCard>
      ) : null}

      {profile ? <ProfileSummaryCard profile={profile} /> : null}

      {latestLoading ? (
        <SectionCard title="Latest review" caption="Checking recent analysis history.">
          <View style={styles.statusRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.bodyText}>Loading the most recent review...</Text>
          </View>
        </SectionCard>
      ) : latestAnalysis ? (
        <SectionCard title="Latest review" caption="The most recent mobile analysis in this session.">
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
      ) : null}

      <SectionCard title="System status" caption="Live check against the current local backend.">
        {loading ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.bodyText}>Checking backend health...</Text>
          </View>
        ) : error ? (
          <View style={styles.stack}>
            <StatusPill label="Unavailable" tone="warning" />
            <Text style={styles.bodyText}>
              Could not reach {mobileConfig.apiBaseUrl}. If you are on a physical device,
              replace localhost with your computer&apos;s LAN IP.
            </Text>
            <Text style={styles.metaText}>{error}</Text>
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

      <SectionCard title="How it works">
        <View style={styles.stepList}>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>01</Text>
            <Text style={styles.stepText}>Your athlete profile is already active.</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>02</Text>
            <Text style={styles.stepText}>Choose a clip, add an optional focus note, and run Gemini.</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>03</Text>
            <Text style={styles.stepText}>Review structured feedback and keep the session in the in-app log.</Text>
          </View>
        </View>
      </SectionCard>

      {isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl) ? (
        <SectionCard tone="muted" title="Physical device note">
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
