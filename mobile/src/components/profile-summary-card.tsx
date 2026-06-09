import { StyleSheet, Text, View } from 'react-native';

import { SectionCard } from '@/components/section-card';
import { palette, radii, spacing, typography } from '@/design/theme';
import {
  getExperienceLevelLabel,
  getStanceLabel,
  getTrainingTypeLabel,
} from '@/features/athlete-profile/options';
import type { AthleteProfile } from '@/features/athlete-profile/types';

export function ProfileSummaryCard({ profile }: { profile: AthleteProfile }) {
  const sessionTypes =
    profile.trainingTypes.length > 0
      ? profile.trainingTypes.map(getTrainingTypeLabel).join(', ')
      : 'No session types selected yet';

  const background = [
    profile.hasAmateurBouts ? 'Amateur bouts' : null,
    profile.hasProfessionalExperience ? 'Professional experience' : null,
    profile.hasCoachingExperience ? 'Coaching experience' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <SectionCard title={profile.name} caption="Active athlete context for future reviews.">
      <View style={styles.metricsGrid}>
        <MetricCell label="Stance" value={getStanceLabel(profile.stance)} />
        <MetricCell
          label="Body"
          value={`${profile.heightCm ?? '—'} cm · ${profile.weightKg ?? '—'} kg`}
        />
        <MetricCell
          label="Experience"
          value={getExperienceLevelLabel(profile.experienceLevel)}
        />
      </View>

      <View style={styles.stack}>
        <SummaryRow
          label="Training rhythm"
          value={`${profile.weeklyTrainingDays ?? '—'} days / week`}
        />
        <SummaryRow label="Session mix" value={sessionTypes} />
        <SummaryRow
          label="Background"
          value={background || 'No competitive or coaching history recorded'}
        />
        {profile.routineSummary ? (
          <SummaryRow label="Routine note" value={profile.routineSummary} />
        ) : null}
        {profile.limitations ? (
          <SummaryRow label="Limitations" value={profile.limitations} />
        ) : null}
        {profile.additionalContext ? (
          <SummaryRow label="Additional context" value={profile.additionalContext} />
        ) : null}
      </View>
    </SectionCard>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCell: {
    flexGrow: 1,
    minWidth: 96,
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
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  metricValue: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.text,
  },
  stack: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(27, 28, 28, 0.18)',
    paddingBottom: spacing.md,
  },
  label: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  value: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
