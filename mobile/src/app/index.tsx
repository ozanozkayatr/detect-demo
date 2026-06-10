import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';

import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';

export default function IndexScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { hasProfile, isBootstrapping } = useAthleteProfile();

  if (!isLoaded || (isSignedIn && isBootstrapping)) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (!hasProfile) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
