import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';
import { fetchAnalyses, type AnalysisRecord } from '@/lib/api';

export default function AnalysesTab() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const controller = new AbortController();
      setLoading(true);
      setError(null);

      fetchAnalyses(controller.signal)
        .then((nextAnalyses) => {
          if (!cancelled) {
            setAnalyses(nextAnalyses);
          }
        })
        .catch((nextError: Error) => {
          if (!cancelled) {
            setError(nextError.message);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
        controller.abort();
      };
    }, []),
  );

  return (
    <AppScreen
      eyebrow="Training log"
      title="Your review log lives here."
      subtitle="Completed analyses are loaded from the backend so the app keeps a real training archive.">
      <SectionCard>
        <StatusPill label={`${analyses.length} review${analyses.length === 1 ? '' : 's'}`} tone="success" />
        <Text style={styles.bigCopy}>
          Run a clip analysis, then come back here to review it again.
        </Text>
        <PrimaryButton
          label="Review another clip"
          hint="Open the analysis flow"
          icon={<Feather name="arrow-right" size={20} color="#ffffff" />}
          onPress={() => router.push('/analysis/new')}
        />
      </SectionCard>

      {loading ? (
        <SectionCard title="Loading reviews" caption="Fetching stored analyses from the backend.">
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.rowText}>Loading your analysis history...</Text>
          </View>
        </SectionCard>
      ) : error ? (
        <SectionCard title="Could not load analyses" tone="muted">
          <Text style={styles.rowText}>{error}</Text>
        </SectionCard>
      ) : analyses.length > 0 ? (
        <View style={styles.list}>
          {analyses.map((analysis) => (
            <Pressable
              key={analysis.id}
              onPress={() => router.push(`/analysis/${analysis.id}`)}
              style={({ pressed }) => [pressed && styles.cardPressed]}>
              <SectionCard
                title={analysis.prompt_template.title}
                caption={new Date(analysis.created_at).toLocaleString()}>
                <StatusPill
                  label={analysis.status}
                  tone={analysis.status === 'completed' ? 'success' : 'warning'}
                />
                <Text style={styles.rowText}>
                  {analysis.parsed_response?.summary ||
                    analysis.raw_response ||
                    'Analysis completed.'}
                </Text>
                <Text style={styles.metaText}>
                  Model: {analysis.model_name ?? 'n/a'} · Video #{analysis.video_id}
                </Text>
              </SectionCard>
            </Pressable>
          ))}
        </View>
      ) : (
        <SectionCard title="No reviews yet" caption="Run one clip from the analysis flow to populate the log.">
          <Text style={styles.rowText}>
            Your first completed clip will appear here as soon as the analysis finishes.
          </Text>
        </SectionCard>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bigCopy: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  list: {
    gap: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.9,
  },
  rowText: {
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
