import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, radii, spacing, typography } from '@/design/theme';
import { fetchAnalyses, type AnalysisRecord } from '@/lib/api';

export default function AnalysesTab() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyses = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const nextAnalyses = await fetchAnalyses(signal);
      setAnalyses(nextAnalyses);
    } catch (nextError) {
      if (signal?.aborted) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : 'Could not load analyses.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void loadAnalyses(controller.signal);
      return () => {
        controller.abort();
      };
    }, [loadAnalyses]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalyses();
    setRefreshing(false);
  }, [loadAnalyses]);
  const completedCount = analyses.filter((analysis) => analysis.status === 'completed').length;
  const latestRecordedAt = analyses[0]?.created_at ?? null;

  return (
    <AppScreen
      eyebrow="Training log"
      title="Your review log lives here."
      subtitle="Completed analyses are loaded from the backend so the app keeps a real training archive."
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard>
        <StatusPill label={`${analyses.length} review${analyses.length === 1 ? '' : 's'}`} tone="success" />
        <Text style={styles.bigCopy}>
          Every saved review stays here for follow-up.
        </Text>
        <View style={styles.metricsGrid}>
          <MetricCell label="Saved" value={String(analyses.length)} />
          <MetricCell label="Completed" value={String(completedCount)} />
          <MetricCell
            label="Latest"
            value={latestRecordedAt ? formatShortDate(latestRecordedAt) : 'None yet'}
          />
        </View>
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
          <PrimaryButton
            label="Retry log"
            hint="Fetch analysis history again"
            onPress={() => void loadAnalyses()}
          />
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
                <View style={styles.cardHeaderRow}>
                  <StatusPill
                    label={analysis.status}
                    tone={analysis.status === 'completed' ? 'success' : 'warning'}
                  />
                  <Text style={styles.cardMetaText}>
                    {formatPersonaLabel(analysis.persona_key_snapshot)}
                  </Text>
                </View>
                <Text style={styles.rowText}>
                  {analysis.parsed_response?.summary ||
                    analysis.raw_response ||
                    'Analysis completed.'}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.metaText}>
                    {analysis.template_key_snapshot ?? analysis.prompt_template.key}
                  </Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {analysis.video.original_filename}
                  </Text>
                  <Text style={styles.metaText}>
                    Model {analysis.model_name ?? 'n/a'}
                  </Text>
                </View>
              </SectionCard>
            </Pressable>
          ))}
        </View>
      ) : (
        <SectionCard title="No reviews yet" caption="Run one clip from the analysis flow to populate the log.">
          <Text style={styles.rowText}>
            Your first completed clip will appear here as soon as the analysis finishes.
          </Text>
          <PrimaryButton
            label="Start first review"
            hint="Open the analysis flow"
            onPress={() => router.push('/analysis/new')}
          />
        </SectionCard>
      )}
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

const styles = StyleSheet.create({
  bigCopy: {
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
    minWidth: 92,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
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
    fontSize: typography.body,
    lineHeight: 24,
    fontWeight: '700',
    color: palette.text,
  },
  list: {
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
  cardMetaText: {
    flex: 1,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    textAlign: 'right',
    color: palette.textMuted,
  },
  cardFooter: {
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
});

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatPersonaLabel(personaKey: string | null) {
  switch (personaKey) {
    case 'experienced_boxer_coach':
      return 'Experienced boxer / coach';
    case 'beginner_amateur':
      return 'Beginner amateur';
    case null:
      return 'No athlete lens';
    default:
      return personaKey
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}
