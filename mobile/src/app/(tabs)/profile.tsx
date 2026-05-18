import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ProfileSummaryCard } from '@/components/profile-summary-card';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';

export default function ProfileTab() {
  const router = useRouter();
  const { profile, hasProfile } = useAthleteProfile();

  return (
    <AppScreen
      eyebrow="Athlete profile"
      title="One profile should shape every future analysis."
      subtitle="The product direction is no longer multi-persona. The app gathers one athlete profile during onboarding, then lets the user edit it later.">
      <SectionCard tone="accent">
        <StatusPill label={hasProfile ? 'Profile active' : 'Profile missing'} tone={hasProfile ? 'success' : 'warning'} />
        <Text style={styles.heroText}>
          No persona library. One athlete context, edited over time, driving analysis tone and difficulty.
        </Text>
      </SectionCard>

      {profile ? (
        <>
          <ProfileSummaryCard profile={profile} />
          <PrimaryButton
            label="Edit athlete profile"
            hint="Update the one profile that future analyses should use"
            onPress={() => router.push('/profile/edit')}
          />
        </>
      ) : (
        <SectionCard title="No athlete profile yet" caption="Create the one profile that future analyses should use.">
          <Text style={styles.bodyText}>
            Before the mobile app runs real analysis, it should know who the athlete is,
            how experienced they are, and how advanced the coaching language should be.
          </Text>
          <PrimaryButton
            label="Start profile setup"
            hint="Open the guided onboarding flow"
            onPress={() => router.push('/onboarding')}
          />
        </SectionCard>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroText: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  bodyText: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
