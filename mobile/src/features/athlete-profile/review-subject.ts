import type { AthleteProfile } from '@/features/athlete-profile/types';
import type { AppUserRecord } from '@/lib/api';

export type ReviewSubject = {
  kind: 'self';
  displayName: string;
  shortLabel: string;
  description: string;
};

export function createReviewSubject({
  user,
  profile,
}: {
  user: AppUserRecord | null;
  profile: AthleteProfile | null;
}): ReviewSubject | null {
  if (!user && !profile) {
    return null;
  }

  const displayName = profile?.name || user?.display_name || 'Athlete';

  return {
    kind: 'self',
    displayName,
    shortLabel: 'Self review',
    description: `${displayName} is the active solo review target for future reviews.`,
  };
}
