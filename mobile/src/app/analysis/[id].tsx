import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
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
import { resolveBackendUrl } from '@/lib/config';

export default function AnalysisDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const analysisId = useMemo(() => Number(params.id), [params.id]);
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const videoUrl = useMemo(
    () =>
      analysis?.video?.file_url ? resolveBackendUrl(analysis.video.file_url) : null,
    [analysis],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const player = useVideoPlayer(
    videoUrl ? { uri: videoUrl } : null,
    (currentPlayer) => {
      currentPlayer.loop = false;
    },
  );
  const parsedResponse = analysis?.parsed_response;
  const summary = parsedResponse?.summary?.trim() ?? '';
  const strengths = parsedResponse?.strengths ?? [];
  const issues = parsedResponse?.issues ?? [];
  const nextSteps = parsedResponse?.next_steps ?? [];
  const notes = parsedResponse?.notes ?? [];
  const hasObservedFeedback = strengths.length > 0 || issues.length > 0;
  const hasImprovementPlan = nextSteps.length > 0 || notes.length > 0;

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
        title="Analysis review"
        subtitle="Saved Gemini run with normalized boxing feedback."
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
            <SectionCard tone="accent">
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryEyebrow}>{analysis.prompt_template.title}</Text>
                <View style={styles.summaryPills}>
                  <StatusPill
                    label={analysis.status}
                    tone={analysis.status === 'completed' ? 'success' : 'warning'}
                  />
                  {analysis.parser_strategy ? (
                    <StatusPill label={analysis.parser_strategy} />
                  ) : null}
                </View>
              </View>
              <Text style={styles.summaryLabel}>Visible takeaway</Text>
              <Text style={styles.summaryText}>
                {summary || 'No normalized summary was stored for this run.'}
              </Text>
              <View style={styles.summaryFooter}>
                <Text style={styles.summaryFooterText}>
                  Template {analysis.template_key_snapshot ?? analysis.prompt_template.key}
                </Text>
                {analysis.model_name ? (
                  <Text style={styles.summaryFooterText}>Model {analysis.model_name}</Text>
                ) : null}
              </View>
            </SectionCard>

            {videoUrl ? (
              <SectionCard title="Clip review">
                <VideoView
                  style={styles.videoPlayer}
                  player={player}
                  nativeControls
                  allowsPictureInPicture
                  contentFit="contain"
                />
                <View style={styles.clipMetaRow}>
                  <View style={styles.clipMetaItem}>
                    <Text style={styles.clipMetaLabel}>Filename</Text>
                    <Text style={styles.clipMetaValue} numberOfLines={1}>
                      {analysis.video.original_filename}
                    </Text>
                  </View>
                  <View style={styles.clipMetaItem}>
                    <Text style={styles.clipMetaLabel}>Size</Text>
                    <Text style={styles.clipMetaValue}>
                      {formatFileSize(analysis.video.size_bytes)}
                    </Text>
                  </View>
                </View>
              </SectionCard>
            ) : null}

            <SectionCard title="Run overview">
              <View style={styles.detailGrid}>
                <DetailCell
                  label="Recorded"
                  value={formatTimestamp(analysis.created_at)}
                />
                <DetailCell label="Model" value={analysis.model_name ?? 'n/a'} />
                <DetailCell label="Parser" value={analysis.parser_strategy ?? 'best effort'} />
                <DetailCell label="Template" value={analysis.prompt_template.key} />
              </View>
            </SectionCard>

            {hasObservedFeedback ? (
              <SectionCard title="Observed feedback">
                <FeedbackBlock
                  title="Strengths"
                  items={strengths}
                  tone="success"
                  emptyText="No clear strengths were extracted from the normalized output."
                />
                <FeedbackBlock
                  title="Issues"
                  items={issues}
                  tone="warning"
                  emptyText="No specific issues were extracted from the normalized output."
                />
              </SectionCard>
            ) : null}

            {hasImprovementPlan ? (
              <SectionCard title="Improvement plan">
                <FeedbackBlock
                  title="Next steps"
                  items={nextSteps}
                  tone="default"
                  emptyText="No next-step guidance was extracted from the normalized output."
                />
                <FeedbackBlock
                  title="Notes"
                  items={notes}
                  tone="muted"
                  emptyText="No extra caveats or visibility notes were stored."
                />
              </SectionCard>
            ) : null}

            {analysis.raw_response ? (
              <SectionCard title="Model output" tone="muted">
                <Pressable
                  onPress={() => setShowRawResponse((current) => !current)}
                  style={({ pressed }) => [
                    styles.disclosureButton,
                    pressed && styles.disclosureButtonPressed,
                  ]}>
                  <Text style={styles.disclosureLabel}>
                    {showRawResponse ? 'Hide raw response' : 'Show raw response'}
                  </Text>
                  <Feather
                    name={showRawResponse ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={palette.textMuted}
                  />
                </Pressable>
                {showRawResponse ? (
                  <Text style={styles.rawResponseText}>{analysis.raw_response}</Text>
                ) : null}
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

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function FeedbackBlock({
  title,
  items,
  tone,
  emptyText,
}: {
  title: string;
  items: string[];
  tone: 'default' | 'success' | 'warning' | 'muted';
  emptyText: string;
}) {
  const normalizedItems = items.filter((item) => item.trim().length > 0);
  const pillTone =
    tone === 'success' || tone === 'warning' ? tone : 'neutral';

  return (
    <View
      style={[
        styles.feedbackBlock,
        tone === 'success' && styles.feedbackBlockSuccess,
        tone === 'warning' && styles.feedbackBlockWarning,
        tone === 'muted' && styles.feedbackBlockMuted,
      ]}>
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackTitle}>{title}</Text>
        <StatusPill label={getFeedbackLabel(tone)} tone={pillTone} />
      </View>
      {normalizedItems.length > 0 ? (
        <View style={styles.resultItems}>
          {normalizedItems.map((item) => (
            <View key={item} style={styles.resultItem}>
              <Text style={styles.resultItemBullet}>•</Text>
              <Text style={styles.resultItemText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{emptyText}</Text>
      )}
    </View>
  );
}

function getFeedbackLabel(tone: 'default' | 'success' | 'warning' | 'muted') {
  switch (tone) {
    case 'success':
      return 'Observed positives';
    case 'warning':
      return 'Review focus';
    case 'muted':
      return 'Context';
    default:
      return 'Priority';
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${sizeBytes} B`;
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
  bodyText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  summaryHeader: {
    gap: spacing.sm,
  },
  summaryEyebrow: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  summaryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  summaryText: {
    fontSize: typography.title,
    lineHeight: 36,
    fontWeight: '700',
    color: palette.text,
  },
  summaryFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryFooterText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  videoPlayer: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: radii.md,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  clipMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  clipMetaItem: {
    flex: 1,
    minWidth: 140,
    gap: spacing.xs,
  },
  clipMetaLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  clipMetaValue: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.text,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailCell: {
    minWidth: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  detailLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  detailValue: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.text,
  },
  feedbackBlock: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  feedbackBlockSuccess: {
    borderColor: 'rgba(46, 77, 49, 0.14)',
    backgroundColor: palette.successSoft,
  },
  feedbackBlockWarning: {
    borderColor: 'rgba(142, 15, 40, 0.14)',
    backgroundColor: palette.accentSoft,
  },
  feedbackBlockMuted: {
    backgroundColor: palette.surface,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  feedbackTitle: {
    flex: 1,
    fontSize: typography.heading,
    lineHeight: 28,
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
  emptyText: {
    fontSize: typography.bodySmall,
    lineHeight: 22,
    color: palette.textMuted,
  },
  disclosureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  disclosureButtonPressed: {
    opacity: 0.8,
  },
  disclosureLabel: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
    color: palette.text,
  },
  rawResponseText: {
    fontSize: typography.bodySmall,
    lineHeight: 22,
    color: palette.textMuted,
  },
});
