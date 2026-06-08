import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, radii, spacing, typography } from '@/design/theme';
import { fetchAnalysisById, type AnalysisRecord } from '@/lib/api';

export default function AnalysisDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const analysisId = useMemo(() => Number(params.id), [params.id]);
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(analysisId)) {
      setError('This analysis id is not valid.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchAnalysisById(analysisId, controller.signal)
      .then((nextAnalysis) => {
        if (!cancelled) {
          setAnalysis(nextAnalysis);
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
  }, [analysisId]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppScreen
        eyebrow="Analysis"
        title="Structured review"
        subtitle="Stored result from the live Gemini analysis flow."
        rightSlot={
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Feather name="x" size={20} color={palette.text} />
          </Pressable>
        }>
        {loading ? (
          <SectionCard title="Loading review">
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.bodyText}>Fetching the saved analysis result...</Text>
            </View>
          </SectionCard>
        ) : error ? (
          <SectionCard title="Could not load analysis" tone="muted">
            <Text style={styles.bodyText}>{error}</Text>
            <PrimaryButton
              label="Back to reviews"
              hint="Return to the training log"
              onPress={() => router.replace('/(tabs)/analyses')}
            />
          </SectionCard>
        ) : analysis ? (
          <>
            <SectionCard title={analysis.prompt_template.title}>
              <View style={styles.headerMeta}>
                <StatusPill
                  label={analysis.status}
                  tone={analysis.status === 'completed' ? 'success' : 'warning'}
                />
                {analysis.parser_strategy ? (
                  <Text style={styles.metaText}>Parser: {analysis.parser_strategy}</Text>
                ) : null}
              </View>
              <Text style={styles.metaText}>
                {new Date(analysis.created_at).toLocaleString()} · Video #{analysis.video_id}
              </Text>
              <Text style={styles.metaText}>
                Model: {analysis.model_name ?? 'n/a'}
              </Text>
            </SectionCard>

            {analysis.parsed_response ? (
              <SectionCard title="Summary">
                <Text style={styles.summaryText}>{analysis.parsed_response.summary}</Text>
              </SectionCard>
            ) : null}

            <ResultSection title="Strengths" items={analysis.parsed_response?.strengths ?? []} />
            <ResultSection title="Issues" items={analysis.parsed_response?.issues ?? []} />
            <ResultSection title="Next steps" items={analysis.parsed_response?.next_steps ?? []} />
            <ResultSection title="Notes" items={analysis.parsed_response?.notes ?? []} />

            {analysis.raw_response ? (
              <SectionCard title="Raw response" caption="Stored Gemini output for deeper inspection.">
                <Text style={styles.rawResponseText}>{analysis.raw_response}</Text>
              </SectionCard>
            ) : null}

            <PrimaryButton
              label="Back to review log"
              hint="Open the full analyses list"
              onPress={() => router.replace('/(tabs)/analyses')}
            />
          </>
        ) : null}
      </AppScreen>
    </>
  );
}

function ResultSection({ title, items }: { title: string; items: string[] }) {
  const normalizedItems = items.filter((item) => item.trim().length > 0);

  if (normalizedItems.length === 0) {
    return null;
  }

  return (
    <SectionCard title={title}>
      <View style={styles.resultItems}>
        {normalizedItems.map((item) => (
          <View key={item} style={styles.resultItem}>
            <Text style={styles.resultItemBullet}>•</Text>
            <Text style={styles.resultItemText}>{item}</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerMeta: {
    gap: spacing.sm,
  },
  bodyText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  metaText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  summaryText: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  resultItems: {
    gap: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  resultItemBullet: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.textSoft,
  },
  resultItemText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  rawResponseText: {
    fontSize: typography.bodySmall,
    lineHeight: 22,
    color: palette.textMuted,
  },
});
