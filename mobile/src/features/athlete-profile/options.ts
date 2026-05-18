import type {
  AthleteProfile,
  AthleteProfileDraft,
  ExperienceLevel,
  Stance,
  TrainingType,
} from '@/features/athlete-profile/types';

export const stanceOptions: Array<{ value: Stance; label: string }> = [
  { value: 'orthodox', label: 'Orthodox' },
  { value: 'southpaw', label: 'Southpaw' },
  { value: 'switch', label: 'Switch' },
  { value: 'not_sure', label: 'Not sure yet' },
];

export const experienceLevelOptions: Array<{ value: ExperienceLevel; label: string }> = [
  { value: 'complete_beginner', label: 'Complete beginner' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced_amateur', label: 'Advanced amateur' },
  { value: 'experienced_competitor', label: 'Experienced competitor' },
  { value: 'coach_or_former_competitor', label: 'Coach / former competitor' },
];

export const trainingTypeOptions: Array<{ value: TrainingType; label: string }> = [
  { value: 'bag_work', label: 'Bag work' },
  { value: 'pads', label: 'Pads' },
  { value: 'sparring', label: 'Sparring' },
  { value: 'shadowboxing', label: 'Shadowboxing' },
  { value: 'strength', label: 'Strength' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'footwork_drills', label: 'Footwork drills' },
];

const experienceLevelLabels = new Map(
  experienceLevelOptions.map((option) => [option.value, option.label]),
);

const stanceLabels = new Map(stanceOptions.map((option) => [option.value, option.label]));
const trainingTypeLabels = new Map(
  trainingTypeOptions.map((option) => [option.value, option.label]),
);

export function createEmptyAthleteProfileDraft(): AthleteProfileDraft {
  return {
    name: '',
    ageRange: '',
    stance: 'orthodox',
    heightCm: '',
    weightKg: '',
    experienceLevel: 'beginner',
    yearsBoxing: '',
    weeklyTrainingDays: '',
    trainingTypes: [],
    routineSummary: '',
    hasAmateurBouts: false,
    hasProfessionalExperience: false,
    hasCoachingExperience: false,
    limitations: '',
    additionalContext: '',
  };
}

export function createDraftFromProfile(profile: AthleteProfile): AthleteProfileDraft {
  return {
    name: profile.name,
    ageRange: profile.ageRange,
    stance: profile.stance,
    heightCm: profile.heightCm ? String(profile.heightCm) : '',
    weightKg: profile.weightKg ? String(profile.weightKg) : '',
    experienceLevel: profile.experienceLevel,
    yearsBoxing: profile.yearsBoxing ? String(profile.yearsBoxing) : '',
    weeklyTrainingDays: profile.weeklyTrainingDays ? String(profile.weeklyTrainingDays) : '',
    trainingTypes: profile.trainingTypes,
    routineSummary: profile.routineSummary,
    hasAmateurBouts: profile.hasAmateurBouts,
    hasProfessionalExperience: profile.hasProfessionalExperience,
    hasCoachingExperience: profile.hasCoachingExperience,
    limitations: profile.limitations,
    additionalContext: profile.additionalContext,
  };
}

export function createProfileFromDraft(draft: AthleteProfileDraft): AthleteProfile {
  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  return {
    name: draft.name.trim(),
    ageRange: draft.ageRange.trim(),
    stance: draft.stance,
    heightCm: parseNumber(draft.heightCm),
    weightKg: parseNumber(draft.weightKg),
    experienceLevel: draft.experienceLevel,
    yearsBoxing: parseNumber(draft.yearsBoxing),
    weeklyTrainingDays: parseNumber(draft.weeklyTrainingDays),
    trainingTypes: draft.trainingTypes,
    routineSummary: draft.routineSummary.trim(),
    hasAmateurBouts: draft.hasAmateurBouts,
    hasProfessionalExperience: draft.hasProfessionalExperience,
    hasCoachingExperience: draft.hasCoachingExperience,
    limitations: draft.limitations.trim(),
    additionalContext: draft.additionalContext.trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function getExperienceLevelLabel(value: ExperienceLevel) {
  return experienceLevelLabels.get(value) ?? value;
}

export function getStanceLabel(value: Stance) {
  return stanceLabels.get(value) ?? value;
}

export function getTrainingTypeLabel(value: TrainingType) {
  return trainingTypeLabels.get(value) ?? value;
}
