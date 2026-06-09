import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import { isLoopbackApiBaseUrl, mobileConfig } from '@/lib/config';

export default function SettingsTab() {
  const router = useRouter();
  const {
    bootstrapError,
    hasProfile,
    isBootstrapping,
    profile,
    refreshProfile,
    reviewSubject,
    user,
  } = useAthleteProfile();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  return (
    <AppScreen
      eyebrow="Settings"
      title="Account and app settings."
      subtitle="Review the current session, athlete context, and local connection setup."
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard title="Session">
        <StatusPill
          label={
            isBootstrapping
              ? 'Refreshing session'
              : bootstrapError
                ? 'Session issue'
                : 'Session active'
          }
          tone={
            isBootstrapping ? 'neutral' : bootstrapError ? 'warning' : 'success'
          }
        />
        <View style={styles.stack}>
          <SettingsRow label="Name" value={user?.display_name ?? 'Unknown athlete'} />
          <SettingsRow label="Contact" value={formatContact(user)} />
          <SettingsRow
            label="Member since"
            value={user ? formatDate(user.created_at) : 'n/a'}
          />
        </View>
        <PrimaryButton
          label="Refresh session"
          hint="Fetch the latest account and profile data"
          onPress={() => void refreshProfile()}
        />
      </SectionCard>

      {bootstrapError ? (
        <SectionCard tone="muted" title="Session error">
          <Text style={styles.body}>
            {bootstrapError}
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Athlete context">
        <StatusPill
          label={hasProfile ? 'Profile active' : 'Profile required'}
          tone={hasProfile ? 'success' : 'warning'}
        />
        <Text style={styles.body}>
          {hasProfile
            ? reviewSubject?.description ?? `${profile?.name ?? 'Athlete'} is the current context for future reviews.`
            : 'Create the athlete profile before running the first review.'}
        </Text>
        <PrimaryButton
          label={hasProfile ? 'Edit athlete profile' : 'Create athlete profile'}
          hint={
            hasProfile
              ? 'Adjust the profile used in future reviews'
              : 'Create the profile used in future reviews'
          }
          onPress={() => router.push(hasProfile ? '/profile/edit' : '/onboarding')}
        />
      </SectionCard>

      <SectionCard title="Connection">
        <View style={styles.stack}>
          <StatusPill
            label={isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl) ? 'Simulator default' : 'Custom LAN URL'}
            tone={isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl) ? 'neutral' : 'success'}
          />
          <SettingsRow label="Base URL" value={mobileConfig.apiBaseUrl} />
          <Text style={styles.body}>
            {isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl)
              ? 'Use your Mac’s LAN IP in mobile/.env when testing on a physical phone.'
              : 'The app is configured for device testing against a custom LAN address.'}
          </Text>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function formatContact(user: {
  email: string | null;
  phone_number: string | null;
} | null) {
  if (!user) {
    return 'n/a';
  }

  return user.email ?? user.phone_number ?? 'Not provided';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  label: {
    fontSize: typography.label,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  value: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
