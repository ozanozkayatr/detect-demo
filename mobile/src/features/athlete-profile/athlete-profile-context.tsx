import type { PropsWithChildren } from 'react';
import { createContext, useContext, useState } from 'react';

import type { AthleteProfile } from '@/features/athlete-profile/types';

type AthleteProfileContextValue = {
  profile: AthleteProfile | null;
  hasProfile: boolean;
  setProfile: (profile: AthleteProfile) => void;
  clearProfile: () => void;
};

const AthleteProfileContext = createContext<AthleteProfileContextValue | null>(null);

export function AthleteProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfileState] = useState<AthleteProfile | null>(null);

  return (
    <AthleteProfileContext.Provider
      value={{
        profile,
        hasProfile: profile !== null,
        setProfile: setProfileState,
        clearProfile: () => setProfileState(null),
      }}>
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
