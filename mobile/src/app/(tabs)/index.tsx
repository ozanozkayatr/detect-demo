import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, radii, spacing, typography } from '@/design/theme';
import { fetchHealth, type HealthResponse } from '@/lib/api';
import { isLoopbackApiBaseUrl, mobileConfig } from '@/lib/config';

export default function HomeTab() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchHealth(controller.signal)
      .then(setHealth)
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const geminiReady = Boolean(health?.gemini_configured);

  return (
    <AppScreen
      eyebrow="Detect"
      title="AI boxing review that feels like a private coach."
      subtitle="FastAPI stays as the system backbone. This Expo app is the new mobile shell for onboarding, upload, analysis, and long-term training review.">
      <SectionCard tone="accent">
        <StatusPill label="Mobile foundation" tone="warning" />
        <Text style={styles.heroTitle}>Build the athlete profile, then move into repeat video review.</Text>
        <Text style={styles.heroBody}>
          The next product step is a real native flow for athlete intake, clip upload,
          Gemini analysis, and structured result review.
        </Text>
        <PrimaryButton
          label="Start the mobile analysis flow"
          hint="Open the first native analysis setup screen"
          icon={<Feather name="arrow-right" size={20} color="#ffffff" />}
          onPress={() => router.push('/analysis/new')}
        />
      </SectionCard>

      <SectionCard title="Backend readiness" caption="Live check against the existing FastAPI service.">
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

      <SectionCard title="How this mobile repo should evolve">
        <View style={styles.stepList}>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>01</Text>
            <Text style={styles.stepText}>Guided athlete profile onboarding replaces demo personas.</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>02</Text>
            <Text style={styles.stepText}>Native clip upload and focus note feed the existing FastAPI analysis API.</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepLabel}>03</Text>
            <Text style={styles.stepText}>Results become a structured training log with progress over time.</Text>
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
