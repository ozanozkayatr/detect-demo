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
  const { bootstrapError, hasProfile, isBootstrapping, profile } = useAthleteProfile();

  return (
    <AppScreen
      eyebrow="Athlete profile"
      title="One profile calibrates every review."
      subtitle="Keep the athlete context current so coaching stays relevant across every session.">
      <SectionCard>
        <StatusPill
          label={
            isBootstrapping
              ? 'Loading profile'
              : bootstrapError
                ? 'Profile unavailable'
                : 'Profile active'
          }
          tone={
            isBootstrapping ? 'neutral' : bootstrapError ? 'warning' : 'success'
          }
        />
        <Text style={styles.heroText}>
          {hasProfile
            ? 'Update the athlete profile whenever training volume, experience, or goals shift.'
            : 'Create the athlete profile once before you begin reviewing clips.'}
        </Text>
      </SectionCard>

      {bootstrapError ? (
        <SectionCard tone="muted">
          <Text style={styles.bodyText}>{bootstrapError}</Text>
        </SectionCard>
      ) : null}

      {profile ? <ProfileSummaryCard profile={profile} /> : null}
      <PrimaryButton
        label={profile ? 'Edit athlete profile' : 'Create athlete profile'}
        hint={
          profile
            ? 'Update the profile used in future reviews'
            : 'Create the profile used in future reviews'
        }
        disabled={isBootstrapping}
        onPress={() => router.push(hasProfile ? '/profile/edit' : '/onboarding')}
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
  bodyText: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
