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
  const { profile } = useAthleteProfile();

  return (
    <AppScreen
      eyebrow="Athlete profile"
      title="One athlete profile shapes every review."
      subtitle="Adjust the athlete profile whenever you want to tune the coaching context.">
      <SectionCard>
        <StatusPill label="Profile active" tone="success" />
        <Text style={styles.heroText}>
          One athlete context, edited over time, driving analysis tone and difficulty.
        </Text>
      </SectionCard>

      {profile ? <ProfileSummaryCard profile={profile} /> : null}
      <PrimaryButton
        label="Edit athlete profile"
        hint="Update the one profile that future analyses should use"
        onPress={() => router.push('/profile/edit')}
      />
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
});
