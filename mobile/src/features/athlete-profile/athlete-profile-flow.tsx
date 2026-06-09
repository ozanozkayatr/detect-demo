import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radii, spacing, typography } from '@/design/theme';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import {
  createDraftFromProfile,
  createEmptyAthleteProfileDraft,
  createProfileFromDraft,
  experienceLevelOptions,
  getExperienceLevelLabel,
  getStanceLabel,
  getTrainingTypeLabel,
  stanceOptions,
  trainingTypeOptions,
} from '@/features/athlete-profile/options';
import type { AthleteProfileDraft, TrainingType } from '@/features/athlete-profile/types';

type AthleteProfileFlowProps = {
  mode: 'create' | 'edit';
};

const totalSteps = 6;
const stepLabels = ['Basics', 'Body', 'Level', 'Routine', 'Context', 'Review'];

export function AthleteProfileFlow({ mode }: AthleteProfileFlowProps) {
  const router = useRouter();
  const { bootstrapError, isBootstrapping, isSaving, profile, saveProfile } =
    useAthleteProfile();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<AthleteProfileDraft>(() =>
    mode === 'edit' && profile ? createDraftFromProfile(profile) : createEmptyAthleteProfileDraft(),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const titles = [
    'Start with the athlete.',
    'Set the body profile.',
    'Set the current level.',
    'Map the weekly routine.',
    'Add training context.',
    'Review the profile.',
  ];

  const captions = [
    'This becomes the default context behind every review.',
    'Body profile helps keep coaching grounded and proportional.',
    'Review tone should match actual boxing experience.',
    'Weekly volume shapes how aggressive the next-step guidance should be.',
    'Use background details to keep feedback practical and relevant.',
    'Save once, then use this profile across future sessions.',
  ];

  useEffect(() => {
    if (mode === 'edit' && profile) {
      setDraft(createDraftFromProfile(profile));
    }
  }, [mode, profile]);

  function setField<K extends keyof AthleteProfileDraft>(key: K, value: AthleteProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleTrainingType(value: TrainingType) {
    setDraft((current) => ({
      ...current,
      trainingTypes: current.trainingTypes.includes(value)
        ? current.trainingTypes.filter((item) => item !== value)
        : [...current.trainingTypes, value],
    }));
  }

  const canContinue = (() => {
    switch (stepIndex) {
      case 0:
        return draft.name.trim().length >= 2;
      case 1:
        return draft.heightCm.trim().length > 0 && draft.weightKg.trim().length > 0;
      case 2:
        return draft.experienceLevel.length > 0;
      case 3:
        return draft.weeklyTrainingDays.trim().length > 0;
      default:
        return true;
    }
  })();
  const continueHint = (() => {
    switch (stepIndex) {
      case 0:
        return 'Add the athlete name to continue.';
      case 1:
        return 'Enter height and weight to continue.';
      case 2:
        return 'Choose the current boxing level to continue.';
      case 3:
        return 'Enter training days per week to continue.';
      default:
        return null;
    }
  })();

  async function handleContinue() {
    if (stepIndex < totalSteps - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    setSubmitError(null);
    try {
      await saveProfile(createProfileFromDraft(draft));
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not save athlete profile.',
      );
      return;
    }
    router.replace(mode === 'create' ? '/analysis/new' : '/(tabs)/profile');
  }

  function handleBack() {
    if (stepIndex === 0) {
      router.back();
      return;
    }

    setStepIndex((current) => current - 1);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.iconButton}>
            <Feather name="arrow-left" size={18} color={palette.text} />
          </Pressable>
          <Text style={styles.stepCounter}>
            Step {stepIndex + 1} of {totalSteps}
          </Text>
          <View style={styles.iconSpacer} />
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((stepIndex + 1) / totalSteps) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            {mode === 'create' ? 'Profile setup' : 'Edit athlete profile'}
          </Text>
          <Text style={styles.title}>{titles[stepIndex]}</Text>
          <Text style={styles.subtitle}>{captions[stepIndex]}</Text>
        </View>

        <View style={styles.stepPills}>
          {stepLabels.map((label, index) => (
            <View
              key={label}
              style={[
                styles.stepPill,
                index === stepIndex && styles.stepPillActive,
                index < stepIndex && styles.stepPillComplete,
              ]}>
              <Text
                style={[
                  styles.stepPillLabel,
                  index === stepIndex && styles.stepPillLabelActive,
                  index < stepIndex && styles.stepPillLabelComplete,
                ]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {isBootstrapping ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.loadingText}>Loading the current athlete profile...</Text>
          </View>
        ) : null}

        {bootstrapError || submitError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{submitError ?? bootstrapError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>{renderStep(stepIndex, draft, setField, toggleTrainingType)}</View>

        {!canContinue && continueHint ? (
          <View style={styles.helperCard}>
            <Text style={styles.helperText}>{continueHint}</Text>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <Pressable onPress={handleBack} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              {stepIndex === 0 ? 'Close' : 'Back'}
            </Text>
          </Pressable>

          <Pressable
            disabled={!canContinue || isSaving || isBootstrapping}
            onPress={handleContinue}
            style={[
              styles.primaryButton,
              (!canContinue || isSaving || isBootstrapping) && styles.primaryButtonDisabled,
            ]}>
            <Text style={styles.primaryButtonText}>
              {isSaving
                ? 'Saving...'
                : stepIndex === totalSteps - 1
                ? mode === 'create'
                  ? 'Save profile'
                  : 'Save changes'
                : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function renderStep(
  stepIndex: number,
  draft: AthleteProfileDraft,
  setField: <K extends keyof AthleteProfileDraft>(key: K, value: AthleteProfileDraft[K]) => void,
  toggleTrainingType: (value: TrainingType) => void,
) {
  switch (stepIndex) {
    case 0:
      return (
        <View style={styles.stack}>
          <FieldLabel label="Athlete name" />
          <TextInput
            value={draft.name}
            onChangeText={(value) => setField('name', value)}
            placeholder="Mert Yilmaz"
            placeholderTextColor={palette.textSoft}
            style={styles.textInput}
          />

          <FieldLabel label="Age range (optional)" />
          <TextInput
            value={draft.ageRange}
            onChangeText={(value) => setField('ageRange', value)}
            placeholder="25–34"
            placeholderTextColor={palette.textSoft}
            style={styles.textInput}
          />

          <FieldLabel label="Stance" />
          <View style={styles.chipGrid}>
            {stanceOptions.map((option) => (
              <SelectableChip
                key={option.value}
                label={option.label}
                selected={draft.stance === option.value}
                onPress={() => setField('stance', option.value)}
              />
            ))}
          </View>
        </View>
      );
    case 1:
      return (
        <View style={styles.stack}>
          <FieldLabel label="Height (cm)" />
          <TextInput
            value={draft.heightCm}
            onChangeText={(value) => setField('heightCm', value)}
            placeholder="183"
            placeholderTextColor={palette.textSoft}
            style={styles.textInput}
            keyboardType="number-pad"
          />

          <FieldLabel label="Weight (kg)" />
          <TextInput
            value={draft.weightKg}
            onChangeText={(value) => setField('weightKg', value)}
            placeholder="81"
            placeholderTextColor={palette.textSoft}
            style={styles.textInput}
            keyboardType="decimal-pad"
          />
        </View>
      );
    case 2:
      return (
        <View style={styles.stack}>
          <FieldLabel label="Current boxing level" />
          <View style={styles.optionColumn}>
            {experienceLevelOptions.map((option) => (
              <SelectableRow
                key={option.value}
                label={option.label}
                selected={draft.experienceLevel === option.value}
                onPress={() => setField('experienceLevel', option.value)}
              />
            ))}
          </View>

          <FieldLabel label="Years boxing (optional)" />
          <TextInput
            value={draft.yearsBoxing}
            onChangeText={(value) => setField('yearsBoxing', value)}
            placeholder="10"
            placeholderTextColor={palette.textSoft}
            style={styles.textInput}
            keyboardType="decimal-pad"
          />
        </View>
      );
    case 3:
      return (
        <View style={styles.stack}>
          <FieldLabel label="Training days per week" />
          <TextInput
            value={draft.weeklyTrainingDays}
            onChangeText={(value) => setField('weeklyTrainingDays', value)}
            placeholder="4"
            placeholderTextColor={palette.textSoft}
            style={styles.textInput}
            keyboardType="number-pad"
          />

          <FieldLabel label="Training types" />
          <View style={styles.chipGrid}>
            {trainingTypeOptions.map((option) => (
              <SelectableChip
                key={option.value}
                label={option.label}
                selected={draft.trainingTypes.includes(option.value)}
                onPress={() => toggleTrainingType(option.value)}
              />
            ))}
          </View>

          <FieldLabel label="Routine summary (optional)" />
          <TextInput
            value={draft.routineSummary}
            onChangeText={(value) => setField('routineSummary', value)}
            placeholder="Bag work, pads, and conditioning after work."
            placeholderTextColor={palette.textSoft}
            multiline
            style={[styles.textInput, styles.multilineInput]}
          />
        </View>
      );
    case 4:
      return (
        <View style={styles.stack}>
          <FieldLabel label="Training history" />
          <View style={styles.optionColumn}>
            <BooleanRow
              label="Has amateur bouts"
              selected={draft.hasAmateurBouts}
              onPress={() => setField('hasAmateurBouts', !draft.hasAmateurBouts)}
            />
            <BooleanRow
              label="Has professional experience"
              selected={draft.hasProfessionalExperience}
              onPress={() =>
                setField('hasProfessionalExperience', !draft.hasProfessionalExperience)
              }
            />
            <BooleanRow
              label="Has coaching experience"
              selected={draft.hasCoachingExperience}
              onPress={() => setField('hasCoachingExperience', !draft.hasCoachingExperience)}
            />
          </View>

          <FieldLabel label="Injuries or limitations (optional)" />
          <TextInput
            value={draft.limitations}
            onChangeText={(value) => setField('limitations', value)}
            placeholder="Right shoulder mobility can tighten after sparring."
            placeholderTextColor={palette.textSoft}
            multiline
            style={[styles.textInput, styles.multilineInput]}
          />

          <FieldLabel label="Additional context (optional)" />
          <TextInput
            value={draft.additionalContext}
            onChangeText={(value) => setField('additionalContext', value)}
            placeholder="Preparing for an amateur bout in 8 weeks."
            placeholderTextColor={palette.textSoft}
            multiline
            style={[styles.textInput, styles.multilineInput]}
          />
        </View>
      );
    case 5:
    default:
      return (
        <View style={styles.stack}>
          <View style={styles.reviewHero}>
            <Text style={styles.reviewHeroEyebrow}>Ready to save</Text>
            <Text style={styles.reviewHeroTitle}>
              {draft.name || 'Athlete profile'}
            </Text>
            <Text style={styles.reviewHeroBody}>
              This profile will shape review tone, level, and progression in every new analysis.
            </Text>
          </View>

          <SummaryRow label="Name" value={draft.name || 'Not set'} />
          <SummaryRow label="Stance" value={getStanceLabel(draft.stance)} />
          <SummaryRow
            label="Body profile"
            value={`${draft.heightCm || '—'} cm · ${draft.weightKg || '—'} kg`}
          />
          <SummaryRow
            label="Level"
            value={getExperienceLevelLabel(draft.experienceLevel)}
          />
          <SummaryRow
            label="Weekly routine"
            value={`${draft.weeklyTrainingDays || '—'} days · ${
              draft.trainingTypes.length > 0
                ? draft.trainingTypes.map(getTrainingTypeLabel).join(', ')
                : 'No session types selected yet'
            }`}
          />
          <SummaryRow
            label="Background"
            value={[
              draft.hasAmateurBouts ? 'Amateur bouts' : null,
              draft.hasProfessionalExperience ? 'Professional experience' : null,
              draft.hasCoachingExperience ? 'Coaching experience' : null,
            ]
              .filter(Boolean)
              .join(', ') || 'No competitive or coaching history selected'}
          />
          {draft.routineSummary ? (
            <SummaryRow label="Routine note" value={draft.routineSummary} />
          ) : null}
          {draft.limitations ? (
            <SummaryRow label="Limitations" value={draft.limitations} />
          ) : null}
          {draft.additionalContext ? (
            <SummaryRow label="Additional context" value={draft.additionalContext} />
          ) : null}
        </View>
      );
  }
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function SelectableChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function SelectableRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.rowOption, selected && styles.rowOptionSelected]}>
      <Text style={[styles.rowOptionLabel, selected && styles.rowOptionLabelSelected]}>
        {label}
      </Text>
      {selected ? <Feather name="check" size={18} color={palette.accent} /> : null}
    </Pressable>
  );
}

function BooleanRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return <SelectableRow label={label} selected={selected} onPress={onPress} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  iconSpacer: {
    width: 40,
    height: 40,
  },
  stepCounter: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceStrong,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: palette.accent,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  title: {
    fontSize: typography.display,
    lineHeight: 40,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.textMuted,
  },
  stepPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  stepPillActive: {
    borderColor: 'rgba(106, 31, 42, 0.2)',
    backgroundColor: palette.accentSoft,
  },
  stepPillComplete: {
    borderColor: 'rgba(46, 77, 49, 0.16)',
    backgroundColor: palette.successSoft,
  },
  stepPillLabel: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    fontWeight: '600',
    color: palette.textMuted,
  },
  stepPillLabelActive: {
    color: palette.accent,
  },
  stepPillLabelComplete: {
    color: palette.success,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.lg,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  loadingText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  helperCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  helperText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.18)',
    borderRadius: radii.md,
    backgroundColor: '#ffefec',
    padding: spacing.md,
  },
  errorText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: '#93000a',
  },
  stack: {
    gap: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  textInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    color: palette.text,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  chipSelected: {
    borderColor: 'rgba(106, 31, 42, 0.2)',
    backgroundColor: palette.accentSoft,
  },
  chipLabel: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: palette.accent,
  },
  optionColumn: {
    gap: spacing.sm,
  },
  rowOption: {
    minHeight: 60,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowOptionSelected: {
    borderColor: 'rgba(106, 31, 42, 0.2)',
    backgroundColor: palette.accentSoft,
  },
  rowOptionLabel: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  rowOptionLabelSelected: {
    color: palette.accent,
    fontWeight: '700',
  },
  summaryRow: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderStrong,
  },
  summaryLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  summaryValue: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  reviewHero: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(106, 31, 42, 0.18)',
    borderRadius: radii.md,
    backgroundColor: palette.accentSoft,
    padding: spacing.md,
  },
  reviewHeroEyebrow: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  reviewHeroTitle: {
    fontSize: typography.heading,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.text,
  },
  reviewHeroBody: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
    color: palette.text,
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: palette.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
});
