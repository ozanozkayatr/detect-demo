import { StyleSheet, Text, View } from 'react-native';

import { SectionCard } from '@/components/section-card';
import { palette, spacing, typography } from '@/design/theme';
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
    <SectionCard title={profile.name} caption="Single athlete profile used for future analyses.">
      <View style={styles.stack}>
        <SummaryRow
          label="Level"
          value={`${getExperienceLevelLabel(profile.experienceLevel)} · ${getStanceLabel(
            profile.stance,
          )}`}
        />
        <SummaryRow
          label="Body profile"
          value={`${profile.heightCm ?? '—'} cm · ${profile.weightKg ?? '—'} kg`}
        />
        <SummaryRow
          label="Routine"
          value={`${profile.weeklyTrainingDays ?? '—'} days / week · ${sessionTypes}`}
        />
        <SummaryRow label="Background" value={background || 'No competitive or coaching history recorded'} />
      </View>
    </SectionCard>
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
