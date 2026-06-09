import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  createAthleteProfilePayload,
  createProfileFromApiRecord,
} from '@/features/athlete-profile/options';
import type { AthleteProfile } from '@/features/athlete-profile/types';
import {
  fetchAppSession,
  saveAthleteProfile,
  type AppUserRecord,
} from '@/lib/api';

type AthleteProfileContextValue = {
  user: AppUserRecord | null;
  profile: AthleteProfile | null;
  hasProfile: boolean;
  isBootstrapping: boolean;
  isSaving: boolean;
  bootstrapError: string | null;
  saveProfile: (profile: AthleteProfile) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AthleteProfileContext = createContext<AthleteProfileContextValue | null>(null);

export function AthleteProfileProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AppUserRecord | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  async function refreshProfile() {
    setBootstrapError(null);
    setIsBootstrapping(true);
    try {
      const session = await fetchAppSession();
      setUser(session.user);
      setProfile(
        session.athlete_profile
          ? createProfileFromApiRecord(session.athlete_profile)
          : null,
      );
    } catch (error) {
      setBootstrapError(
        error instanceof Error ? error.message : 'Could not load app session.',
      );
    } finally {
      setIsBootstrapping(false);
    }
  }

  useEffect(() => {
    refreshProfile();
  }, []);

  const value = useMemo<AthleteProfileContextValue>(
    () => ({
      user,
      profile,
      hasProfile: profile !== null,
      isBootstrapping,
      isSaving,
      bootstrapError,
      saveProfile: async (nextProfile) => {
        setIsSaving(true);
        setBootstrapError(null);
        try {
          const savedProfile = await saveAthleteProfile(
            createAthleteProfilePayload(nextProfile),
          );
          setProfile(createProfileFromApiRecord(savedProfile));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Could not save athlete profile.';
          setBootstrapError(message);
          throw error;
        } finally {
          setIsSaving(false);
        }
      },
      refreshProfile,
    }),
    [bootstrapError, isBootstrapping, isSaving, profile, user],
  );

  return (
    <AthleteProfileContext.Provider value={value}>
      {children}
    </AthleteProfileContext.Provider>
  );
}

export function useAthleteProfile() {
  const context = useContext(AthleteProfileContext);

  if (!context) {
    throw new Error('useAthleteProfile must be used inside AthleteProfileProvider');
  }

  return context;
}
