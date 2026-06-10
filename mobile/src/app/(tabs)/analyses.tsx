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
      setError(nextError instanceof Error ? nextError.message : 'Could not load reviews.');
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
  const rollingWeekCount = analyses.filter((analysis) =>
    isWithinLastDays(analysis.created_at, 7),
  ).length;
  const latestAnalysis = analyses[0] ?? null;
  const earlierAnalyses = analyses.slice(1);
  const recentAnalyses = earlierAnalyses.filter((analysis) =>
    isWithinLastDays(analysis.created_at, 7),
  );
  const olderAnalyses = earlierAnalyses.filter(
    (analysis) => !isWithinLastDays(analysis.created_at, 7),
  );
  const focusQueue = collectFocusQueue(analyses);

  return (
    <AppScreen
      title="Review log"
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard tone="accent">
        <StatusPill
          label={latestAnalysis ? 'Active' : 'Empty'}
          tone={latestAnalysis ? 'success' : 'neutral'}
        />
        <Text style={styles.bigCopy}>
          {latestAnalysis ? 'Keep momentum.' : 'Start the log.'}
        </Text>
        <Text style={styles.heroBody}>
          {latestAnalysis
            ? `${rollingWeekCount} review${rollingWeekCount === 1 ? '' : 's'} in the last 7 days.`
            : 'Run the first review to build your archive.'}
        </Text>
        <View style={styles.metricsGrid}>
          <MetricCell label="Saved" value={String(analyses.length)} />
          <MetricCell label="Completed" value={String(completedCount)} />
          <MetricCell label="7-day" value={String(rollingWeekCount)} />
        </View>
        <PrimaryButton
          label={latestAnalysis ? 'New review' : 'Start review'}
          icon={<Feather name="arrow-right" size={20} color="#ffffff" />}
          onPress={() => router.push('/analysis/new')}
        />
      </SectionCard>

      {latestAnalysis && focusQueue.length > 0 ? (
        <SectionCard title="Focus queue">
          <View style={styles.focusList}>
            {focusQueue.map((item) => (
              <FocusItemRow key={item.id} item={item} />
            ))}
          </View>
        </SectionCard>
      ) : null}

      {loading ? (
        <SectionCard title="Review log">
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.rowText}>Loading...</Text>
          </View>
        </SectionCard>
      ) : error ? (
        <SectionCard title="Review log unavailable" tone="muted">
          <Text style={styles.rowText}>{error}</Text>
          <PrimaryButton
            label="Retry"
            onPress={() => void loadAnalyses()}
          />
        </SectionCard>
      ) : latestAnalysis ? (
        <>
          <SectionCard title="Latest review">
            <View style={styles.cardHeaderRow}>
              <StatusPill
                label={latestAnalysis.status}
                tone={getAnalysisTone(latestAnalysis.status)}
              />
              <Text style={styles.cardMetaText}>
                {formatPersonaLabel(latestAnalysis.persona_key_snapshot)}
              </Text>
            </View>
            <Text style={styles.featuredTitle}>
              {latestAnalysis.parsed_response?.summary ||
                latestAnalysis.raw_response ||
                latestAnalysis.prompt_template.title}
            </Text>
            <Text style={styles.featuredMeta}>
              {`${formatFullDateTime(latestAnalysis.created_at)} · ${formatRelativeSessionLabel(
                latestAnalysis.created_at,
              )}`}
            </Text>
            <View style={styles.metricsGrid}>
              <MetricCell
                label="Strengths"
                value={String(latestAnalysis.parsed_response?.strengths.length ?? 0)}
              />
              <MetricCell
                label="Issues"
                value={String(latestAnalysis.parsed_response?.issues.length ?? 0)}
              />
              <MetricCell
                label="Next steps"
                value={String(latestAnalysis.parsed_response?.next_steps.length ?? 0)}
              />
            </View>
            {latestAnalysis.parsed_response?.issues[0] ? (
              <View style={styles.noteBlock}>
                <Text style={styles.noteLabel}>Primary correction</Text>
                <Text style={styles.noteValue}>{latestAnalysis.parsed_response.issues[0]}</Text>
              </View>
            ) : null}
            {latestAnalysis.user_prompt_snapshot ? (
              <View style={styles.noteBlock}>
                <Text style={styles.noteLabel}>Focus note</Text>
                <Text style={styles.noteValue}>{latestAnalysis.user_prompt_snapshot}</Text>
              </View>
            ) : null}
            <View style={styles.cardFooter}>
              <Text style={styles.metaText} numberOfLines={1}>
                {latestAnalysis.video.original_filename}
              </Text>
              <Text style={styles.metaText}>
                Model {latestAnalysis.model_name ?? 'n/a'}
              </Text>
            </View>
            <PrimaryButton
              label="Open latest"
              onPress={() => router.push(`/analysis/${latestAnalysis.id}`)}
            />
          </SectionCard>

          {earlierAnalyses.length > 0 ? (
            <SectionCard title="Archive">
              <View style={styles.list}>
                {recentAnalyses.length > 0 ? (
                  <ArchiveGroup
                    title="Last 7 days"
                    analyses={recentAnalyses}
                    onPress={(analysisId) => router.push(`/analysis/${analysisId}`)}
                  />
                ) : null}
                {olderAnalyses.length > 0 ? (
                  <ArchiveGroup
                    title="Earlier"
                    analyses={olderAnalyses}
                    onPress={(analysisId) => router.push(`/analysis/${analysisId}`)}
                  />
                ) : null}
              </View>
            </SectionCard>
          ) : null}
        </>
      ) : (
        <SectionCard title="No reviews yet">
          <Text style={styles.rowText}>Run one review to start the archive.</Text>
          <PrimaryButton
            label="Start review"
            onPress={() => router.push('/analysis/new')}
          />
        </SectionCard>
      )}
    </AppScreen>
  );
}

function ArchiveReviewItem({
  analysis,
  onPress,
}: {
  analysis: AnalysisRecord;
  onPress: () => void;
}) {
  const issuesCount = analysis.parsed_response?.issues.length ?? 0;
  const nextStepsCount = analysis.parsed_response?.next_steps.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.archiveItem, pressed && styles.cardPressed]}>
      <View style={styles.archiveHeader}>
        <Text style={styles.archiveDate}>{formatShortDateTime(analysis.created_at)}</Text>
        <StatusPill label={analysis.status} tone={getAnalysisTone(analysis.status)} />
      </View>
      <Text style={styles.archiveTitle} numberOfLines={2}>
        {analysis.parsed_response?.summary || analysis.prompt_template.title}
      </Text>
      <Text style={styles.archiveBody} numberOfLines={2}>
        {analysis.parsed_response?.issues[0] ||
          analysis.raw_response ||
          'Open for details.'}
      </Text>
      <View style={styles.archiveMetrics}>
        <MetricChip label="Issues" value={issuesCount} />
        <MetricChip label="Next" value={nextStepsCount} />
        <MetricChip label="Mode" value={analysis.prompt_template.title} />
      </View>
      <Text style={styles.metaText} numberOfLines={1}>
        {analysis.video.original_filename}
      </Text>
    </Pressable>
  );
}

function ArchiveGroup({
  analyses,
  onPress,
  title,
}: {
  analyses: AnalysisRecord[];
  onPress: (analysisId: number) => void;
  title: string;
}) {
  return (
    <View style={styles.archiveGroup}>
      <View style={styles.archiveGroupHeader}>
        <Text style={styles.archiveGroupTitle}>{title}</Text>
        <Text style={styles.archiveGroupCount}>
          {analyses.length} review{analyses.length === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.list}>
        {analyses.map((analysis) => (
          <ArchiveReviewItem
            key={analysis.id}
            analysis={analysis}
            onPress={() => onPress(analysis.id)}
          />
        ))}
      </View>
    </View>
  );
}

function FocusItemRow({
  item,
}: {
  item: { id: string; kind: string; text: string; sourceLabel: string };
}) {
  return (
    <View style={styles.focusItem}>
      <View style={styles.focusItemHeader}>
        <Text style={styles.focusItemKind}>{item.kind}</Text>
        <Text style={styles.focusItemSource}>{item.sourceLabel}</Text>
      </View>
      <Text style={styles.focusItemText}>{item.text}</Text>
    </View>
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

function MetricChip({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipLabel}>{label}</Text>
      <Text style={styles.metricChipValue} numberOfLines={1}>
        {String(value)}
      </Text>
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
  heroBody: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.textMuted,
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
  archiveGroup: {
    gap: spacing.sm,
  },
  archiveGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  archiveGroupTitle: {
    fontSize: typography.body,
    lineHeight: 24,
    fontWeight: '700',
    color: palette.text,
  },
  archiveGroupCount: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  featuredTitle: {
    fontSize: typography.heading,
    lineHeight: 30,
    fontWeight: '700',
    color: palette.text,
  },
  featuredMeta: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  focusList: {
    gap: spacing.sm,
  },
  focusItem: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  focusItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  focusItemKind: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  focusItemSource: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  focusItemText: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
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
  archiveItem: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  archiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  archiveDate: {
    flex: 1,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  archiveTitle: {
    fontSize: typography.body,
    lineHeight: 24,
    fontWeight: '700',
    color: palette.text,
  },
  archiveBody: {
    fontSize: typography.bodySmall,
    lineHeight: 22,
    color: palette.textMuted,
  },
  archiveMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  metricChipLabel: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  metricChipValue: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.text,
    flexShrink: 1,
  },
  noteBlock: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  noteLabel: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  noteValue: {
    fontSize: typography.bodySmall,
    lineHeight: 22,
    color: palette.text,
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

function formatShortDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFullDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatRelativeSessionLabel(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return 'today';
  }

  if (days === 1) {
    return 'yesterday';
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return formatShortDate(value);
}

function getAnalysisTone(status: string): 'neutral' | 'success' | 'warning' {
  return status === 'completed' ? 'success' : 'warning';
}

function isWithinLastDays(value: string, days: number) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

function collectFocusQueue(analyses: AnalysisRecord[]) {
  const items: { id: string; kind: string; text: string; sourceLabel: string }[] = [];
  const seen = new Set<string>();

  analyses.slice(0, 3).forEach((analysis, index) => {
    const nextSteps = analysis.parsed_response?.next_steps ?? [];
    const issues = analysis.parsed_response?.issues ?? [];
    const notes = analysis.parsed_response?.notes ?? [];
    const sourceLabel =
      index === 0 ? 'Latest review' : formatRelativeSessionLabel(analysis.created_at);

    [
      ...nextSteps.map((text) => ({ kind: 'Next step', text })),
      ...issues.map((text) => ({ kind: 'Issue', text })),
      ...notes.map((text) => ({ kind: 'Note', text })),
    ].forEach((item) => {
      const normalized = item.text.trim().toLowerCase();
      if (!normalized || seen.has(normalized) || items.length >= 4) {
        return;
      }

      seen.add(normalized);
      items.push({
        id: `${analysis.id}-${item.kind}-${normalized}`,
        kind: item.kind,
        text: item.text,
        sourceLabel,
      });
    });
  });

  return items;
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
