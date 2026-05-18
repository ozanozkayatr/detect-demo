export type Stance = 'orthodox' | 'southpaw' | 'switch' | 'not_sure';

export type ExperienceLevel =
  | 'complete_beginner'
  | 'beginner'
  | 'intermediate'
  | 'advanced_amateur'
  | 'experienced_competitor'
  | 'coach_or_former_competitor';

export type TrainingType =
  | 'bag_work'
  | 'pads'
  | 'sparring'
  | 'shadowboxing'
  | 'strength'
  | 'conditioning'
  | 'footwork_drills';

export type AthleteProfile = {
  name: string;
  ageRange: string;
  stance: Stance;
  heightCm: number | null;
  weightKg: number | null;
  experienceLevel: ExperienceLevel;
  yearsBoxing: number | null;
  weeklyTrainingDays: number | null;
  trainingTypes: TrainingType[];
  routineSummary: string;
  hasAmateurBouts: boolean;
  hasProfessionalExperience: boolean;
  hasCoachingExperience: boolean;
  limitations: string;
  additionalContext: string;
  updatedAt: string;
};

export type AthleteProfileDraft = {
  name: string;
  ageRange: string;
  stance: Stance;
  heightCm: string;
  weightKg: string;
  experienceLevel: ExperienceLevel;
  yearsBoxing: string;
  weeklyTrainingDays: string;
  trainingTypes: TrainingType[];
  routineSummary: string;
  hasAmateurBouts: boolean;
  hasProfessionalExperience: boolean;
  hasCoachingExperience: boolean;
  limitations: string;
  additionalContext: string;
};
