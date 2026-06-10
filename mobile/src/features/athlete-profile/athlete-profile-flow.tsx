import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type PropsWithChildren, useEffect, useState } from 'react';
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
import type {
  AthleteProfileDraft,
  ExperienceLevel,
  TrainingType,
} from '@/features/athlete-profile/types';
import { useAppClerk } from '@/lib/auth';

type AthleteProfileFlowProps = {
  mode: 'create' | 'edit';
};

const totalSteps = 6;
const stepLabels = ['Identity', 'Body', 'Level', 'Routine', 'Context', 'Review'];
const trainingDayOptions = ['1', '2', '3', '4', '5', '6', '7'];
const experienceLevelDescriptions: Record<ExperienceLevel, string> = {
  complete_beginner: 'No meaningful boxing background yet.',
  beginner: 'Early-stage training with basic technique work.',
  intermediate: 'Comfortable with core mechanics and regular sessions.',
  advanced_amateur: 'Competition-oriented amateur training background.',
  experienced_competitor: 'High-experience athlete with substantial ring time.',
  coach_or_former_competitor: 'Experienced athlete or coach who needs higher-level feedback.',
};

export function AthleteProfileFlow({ mode }: AthleteProfileFlowProps) {
  const { signOut } = useAppClerk();
  const router = useRouter();
  const { bootstrapError, isBootstrapping, isSaving, profile, saveProfile } =
    useAthleteProfile();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<AthleteProfileDraft>(() =>
    mode === 'edit' && profile ? createDraftFromProfile(profile) : createEmptyAthleteProfileDraft(),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const titles = [
    'Who is the athlete behind the clips?',
    'What body profile should guide movement feedback?',
    'What level should Detect coach for?',
    'How often is this athlete training right now?',
    'What context should the review respect?',
    'Check the review calibration before saving.',
  ];

  const captions = [
    'Name and stance become the identity layer behind every saved review.',
    'Approximate height and weight keep movement feedback proportional and realistic.',
    'Detect should sound very different for a beginner than for an experienced competitor.',
    'Training rhythm changes how demanding the next-step guidance should feel.',
    'History, limitations, and goals prevent generic coaching.',
    'This last step shows how the app will calibrate future reviews.',
  ];
  const screenTitle =
    mode === 'create' ? 'Set the athlete baseline.' : 'Refine the athlete baseline.';
  const screenSubtitle =
    mode === 'create'
      ? 'This one-time intake sets coaching depth, progression, and review tone before the first saved clip.'
      : 'Update the athlete context so future reviews stay aligned with the current training reality.';
  const nextStepLabel =
    stepLabels[stepIndex + 1] ??
    (mode === 'create' ? 'Save and review' : 'Save changes');

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
    router.replace(mode === 'create' ? '/(tabs)' : '/(tabs)/profile');
  }

  function handleBack() {
    if (stepIndex === 0) {
      if (mode === 'create') {
        void signOut();
        return;
      }
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
          <Text style={styles.eyebrow}>{mode === 'create' ? 'Athlete setup' : 'Profile editing'}</Text>
          <Text style={styles.title}>{screenTitle}</Text>
          <Text style={styles.subtitle}>{screenSubtitle}</Text>
        </View>

        <View style={styles.stepOverview}>
          <View style={styles.stepOverviewHeader}>
            <View style={styles.stepOverviewCopy}>
              <Text style={styles.stepOverviewLabel}>Current focus</Text>
              <Text style={styles.stepOverviewTitle}>{titles[stepIndex]}</Text>
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{stepLabels[stepIndex]}</Text>
            </View>
          </View>
          <Text style={styles.stepOverviewBody}>{captions[stepIndex]}</Text>
          <View style={styles.stepOverviewMeta}>
            <StepMeta label="Progress" value={`${stepIndex + 1}/${totalSteps}`} />
            <StepMeta label="Next" value={nextStepLabel} />
          </View>
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
              {stepIndex === 0 ? (mode === 'create' ? 'Sign out' : 'Close') : 'Back'}
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
                  ? 'Save and start reviewing'
                  : 'Save profile changes'
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
          <QuestionBlock
            title="Athlete name"
            caption="Use the real name or the label you want to see in saved reviews.">
            <TextInput
              value={draft.name}
              onChangeText={(value) => setField('name', value)}
              placeholder="Mert Yilmaz"
              placeholderTextColor={palette.textSoft}
              style={styles.textInput}
            />
          </QuestionBlock>

          <QuestionBlock
            title="Age range"
            caption="Optional. Use this if you want coaching tone to feel more proportional.">
            <TextInput
              value={draft.ageRange}
              onChangeText={(value) => setField('ageRange', value)}
              placeholder="25–34"
              placeholderTextColor={palette.textSoft}
              style={styles.textInput}
            />
          </QuestionBlock>

          <QuestionBlock
            title="Stance"
            caption="This helps the coach interpret guard, balance, and foot position more accurately.">
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
          </QuestionBlock>
        </View>
      );
    case 1:
      return (
        <View style={styles.stack}>
          <QuestionBlock
            title="Body profile"
            caption="Approximate numbers are enough. They help keep movement feedback realistic.">
            <View style={styles.splitRow}>
              <View style={styles.splitColumn}>
                <FieldLabel label="Height (cm)" />
                <TextInput
                  value={draft.heightCm}
                  onChangeText={(value) => setField('heightCm', value)}
                  placeholder="183"
                  placeholderTextColor={palette.textSoft}
                  style={styles.textInput}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.splitColumn}>
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
            </View>
          </QuestionBlock>
        </View>
      );
    case 2:
      return (
        <View style={styles.stack}>
          <QuestionBlock
            title="Current boxing level"
            caption="Pick the level that best matches current ability, not idealized potential.">
            <View style={styles.optionColumn}>
              {experienceLevelOptions.map((option) => (
                <SelectableRow
                  key={option.value}
                  label={option.label}
                  description={experienceLevelDescriptions[option.value]}
                  selected={draft.experienceLevel === option.value}
                  onPress={() => setField('experienceLevel', option.value)}
                />
              ))}
            </View>
          </QuestionBlock>

          <QuestionBlock
            title="Years boxing"
            caption="Optional. Useful when overall level and total time in the sport differ.">
            <TextInput
              value={draft.yearsBoxing}
              onChangeText={(value) => setField('yearsBoxing', value)}
              placeholder="10"
              placeholderTextColor={palette.textSoft}
              style={styles.textInput}
              keyboardType="decimal-pad"
            />
          </QuestionBlock>
        </View>
      );
    case 3:
      return (
        <View style={styles.stack}>
          <QuestionBlock
            title="Training days per week"
            caption="Pick the usual rhythm. This helps the coach size the next steps realistically.">
            <View style={styles.chipGrid}>
              {trainingDayOptions.map((option) => (
                <SelectableChip
                  key={option}
                  label={`${option} day${option === '1' ? '' : 's'}`}
                  selected={draft.weeklyTrainingDays === option}
                  onPress={() => setField('weeklyTrainingDays', option)}
                />
              ))}
            </View>
            <TextInput
              value={draft.weeklyTrainingDays}
              onChangeText={(value) => setField('weeklyTrainingDays', value)}
              placeholder="Or type a number"
              placeholderTextColor={palette.textSoft}
              style={styles.textInput}
              keyboardType="number-pad"
            />
          </QuestionBlock>

          <QuestionBlock
            title="Training types"
            caption="Select the session types that define the current training week.">
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
          </QuestionBlock>

          <QuestionBlock
            title="Routine summary"
            caption="Optional. Add one short note about how training is currently structured.">
            <TextInput
              value={draft.routineSummary}
              onChangeText={(value) => setField('routineSummary', value)}
              placeholder="Bag work, pads, and conditioning after work."
              placeholderTextColor={palette.textSoft}
              multiline
              style={[styles.textInput, styles.multilineInput]}
            />
          </QuestionBlock>
        </View>
      );
    case 4:
      return (
        <View style={styles.stack}>
          <QuestionBlock
            title="Training history"
            caption="Switch on the background signals that should influence coaching depth and assumptions.">
            <View style={styles.optionColumn}>
              <BooleanRow
                label="Has amateur bouts"
                description="Useful when the athlete already has ring experience."
                selected={draft.hasAmateurBouts}
                onPress={() => setField('hasAmateurBouts', !draft.hasAmateurBouts)}
              />
              <BooleanRow
                label="Has professional experience"
                description="Signals that the review should avoid beginner framing."
                selected={draft.hasProfessionalExperience}
                onPress={() =>
                  setField('hasProfessionalExperience', !draft.hasProfessionalExperience)
                }
              />
              <BooleanRow
                label="Has coaching experience"
                description="Helps the model avoid overly basic explanations."
                selected={draft.hasCoachingExperience}
                onPress={() => setField('hasCoachingExperience', !draft.hasCoachingExperience)}
              />
            </View>
          </QuestionBlock>

          <QuestionBlock
            title="Injuries or limitations"
            caption="Optional. Add anything the coach should treat carefully.">
            <TextInput
              value={draft.limitations}
              onChangeText={(value) => setField('limitations', value)}
              placeholder="Right shoulder mobility can tighten after sparring."
              placeholderTextColor={palette.textSoft}
              multiline
              style={[styles.textInput, styles.multilineInput]}
            />
          </QuestionBlock>

          <QuestionBlock
            title="Additional context"
            caption="Optional. Add goals, upcoming bouts, or anything that should shape the coaching lens.">
            <TextInput
              value={draft.additionalContext}
              onChangeText={(value) => setField('additionalContext', value)}
              placeholder="Preparing for an amateur bout in 8 weeks."
              placeholderTextColor={palette.textSoft}
              multiline
              style={[styles.textInput, styles.multilineInput]}
            />
          </QuestionBlock>
        </View>
      );
    case 5:
    default:
      return (
        <View style={styles.stack}>
          <View style={styles.reviewHero}>
            <Text style={styles.reviewHeroEyebrow}>Review calibration</Text>
            <Text style={styles.reviewHeroTitle}>
              {draft.name || 'Athlete profile'}
            </Text>
            <Text style={styles.reviewHeroBody}>
              {describeProfileCalibration(draft)}
            </Text>
          </View>

          <View style={styles.reviewMetrics}>
            <ReviewMetric
              label="Stance"
              value={getStanceLabel(draft.stance)}
            />
            <ReviewMetric
              label="Level"
              value={getExperienceLevelLabel(draft.experienceLevel)}
            />
            <ReviewMetric
              label="Rhythm"
              value={formatTrainingRhythm(draft.weeklyTrainingDays)}
            />
          </View>

          <View style={styles.calibrationBlock}>
            <Text style={styles.calibrationTitle}>What Detect will assume</Text>
            <CalibrationNote
              label="Coaching depth"
              value={describeCoachingDepth(draft)}
            />
            <CalibrationNote
              label="Progression pace"
              value={describeProgressLens(draft)}
            />
            <CalibrationNote
              label="Risk lens"
              value={describeConstraintLens(draft)}
            />
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
            value={`${formatTrainingRhythm(draft.weeklyTrainingDays)} · ${
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

function QuestionBlock({
  caption,
  children,
  title,
}: PropsWithChildren<{ caption: string; title: string }>) {
  return (
    <View style={styles.questionBlock}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionTitle}>{title}</Text>
        <Text style={styles.questionCaption}>{caption}</Text>
      </View>
      {children}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function StepMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stepMetaCell}>
      <Text style={styles.stepMetaLabel}>{label}</Text>
      <Text style={styles.stepMetaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
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
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.rowOption, selected && styles.rowOptionSelected]}>
      <View style={styles.rowOptionCopy}>
        <Text style={[styles.rowOptionLabel, selected && styles.rowOptionLabelSelected]}>
          {label}
        </Text>
        {description ? (
          <Text
            style={[
              styles.rowOptionDescription,
              selected && styles.rowOptionDescriptionSelected,
            ]}>
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? <Feather name="check" size={18} color={palette.accent} /> : null}
    </Pressable>
  );
}

function BooleanRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <SelectableRow
      label={label}
      description={description}
      selected={selected}
      onPress={onPress}
    />
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewMetric}>
      <Text style={styles.reviewMetricLabel}>{label}</Text>
      <Text style={styles.reviewMetricValue}>{value}</Text>
    </View>
  );
}

function CalibrationNote({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.calibrationNote}>
      <Text style={styles.calibrationLabel}>{label}</Text>
      <Text style={styles.calibrationValue}>{value}</Text>
    </View>
  );
}

function formatTrainingRhythm(value: string) {
  if (!value) {
    return 'Not set yet';
  }

  return `${value} day${value === '1' ? '' : 's'} / week`;
}

function describeProfileCalibration(draft: AthleteProfileDraft) {
  return `${describeCoachingDepth(draft)} ${describeProgressLens(draft)}`;
}

function describeCoachingDepth(draft: AthleteProfileDraft) {
  if (
    draft.hasProfessionalExperience ||
    draft.hasCoachingExperience ||
    draft.experienceLevel === 'coach_or_former_competitor' ||
    draft.experienceLevel === 'experienced_competitor'
  ) {
    return 'Detect will skip beginner framing and lean into sharper technical correction.';
  }

  if (draft.experienceLevel === 'advanced_amateur' || draft.experienceLevel === 'intermediate') {
    return 'Detect will balance technical critique with actionable training cues.';
  }

  return 'Detect will keep feedback simple, grounded, and beginner-appropriate.';
}

function describeProgressLens(draft: AthleteProfileDraft) {
  const weeklyDays = Number(draft.weeklyTrainingDays);
  if (Number.isFinite(weeklyDays) && weeklyDays >= 5) {
    return 'Next steps can assume consistent weekly repetition and higher training tolerance.';
  }

  if (Number.isFinite(weeklyDays) && weeklyDays >= 3) {
    return 'Next steps will assume steady weekly practice without overloading the athlete.';
  }

  return 'Next steps will stay compact and repeatable between lighter training weeks.';
}

function describeConstraintLens(draft: AthleteProfileDraft) {
  if (draft.limitations.trim()) {
    return 'Detect will keep visible feedback aware of the recorded limitations and avoid careless progression cues.';
  }

  if (draft.additionalContext.trim()) {
    return 'Detect will treat the added context as a priority lens when choosing emphasis and next steps.';
  }

  return 'Detect will rely on visible movement, stated level, and routine history as the primary coaching lens.';
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
  stepOverview: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(106, 31, 42, 0.18)',
    borderRadius: radii.lg,
    backgroundColor: palette.accentSoft,
    padding: spacing.lg,
  },
  stepOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepOverviewCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  stepOverviewLabel: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  stepOverviewTitle: {
    fontSize: typography.heading,
    lineHeight: 30,
    fontWeight: '700',
    color: palette.text,
  },
  stepOverviewBody: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.textMuted,
  },
  stepBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(106, 31, 42, 0.18)',
    backgroundColor: palette.surface,
  },
  stepBadgeText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    fontWeight: '700',
    color: palette.accent,
  },
  stepOverviewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepMetaCell: {
    flexGrow: 1,
    minWidth: 110,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(106, 31, 42, 0.12)',
    borderRadius: radii.md,
    backgroundColor: palette.surface,
  },
  stepMetaLabel: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  stepMetaValue: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.text,
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
  questionBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderStrong,
  },
  questionHeader: {
    gap: spacing.xs,
  },
  questionTitle: {
    fontSize: typography.heading,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.text,
  },
  questionCaption: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
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
  splitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  splitColumn: {
    flex: 1,
    minWidth: 130,
    gap: spacing.sm,
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
  rowOptionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  rowOptionLabel: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  rowOptionLabelSelected: {
    color: palette.accent,
    fontWeight: '700',
  },
  rowOptionDescription: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  rowOptionDescriptionSelected: {
    color: palette.accent,
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
  reviewMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  calibrationBlock: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
  },
  calibrationTitle: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  calibrationNote: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderStrong,
  },
  calibrationLabel: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    fontWeight: '700',
    color: palette.text,
  },
  calibrationValue: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  reviewMetric: {
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
  reviewMetricLabel: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  reviewMetricValue: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.text,
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
