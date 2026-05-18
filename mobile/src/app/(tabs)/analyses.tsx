import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';
import { useAnalysisHistory } from '@/features/analysis-history/analysis-history-context';

export default function AnalysesTab() {
  const router = useRouter();
  const { analyses } = useAnalysisHistory();

  return (
    <AppScreen
      eyebrow="Training log"
      title="Your review log lives here."
      subtitle="Every mobile analysis in this session is kept here so the app feels like a real training archive.">
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

      {analyses.length > 0 ? (
        <View style={styles.list}>
          {analyses.map((analysis) => (
            <SectionCard
              key={analysis.id}
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
