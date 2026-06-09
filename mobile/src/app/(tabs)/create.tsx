import { Redirect } from 'expo-router';

import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';

export default function CreateTabScreen() {
  const { bootstrapError, hasProfile, isBootstrapping } = useAthleteProfile();

  if (isBootstrapping) {
    return null;
  }

  if (bootstrapError) {
    return <Redirect href="/(tabs)/profile" />;
  }

  return <Redirect href={hasProfile ? "/analysis/new" : "/onboarding"} />;
}
