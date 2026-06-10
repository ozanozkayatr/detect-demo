import { useClerk } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import { fetchHealth, type HealthResponse } from '@/lib/api';
import { isLoopbackApiBaseUrl, mobileConfig } from '@/lib/config';

export default function SettingsTab() {
  const { signOut } = useClerk();
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
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const nextHealth = await fetchHealth(signal);
      setHealth(nextHealth);
    } catch (nextError) {
      if (signal?.aborted) {
        return;
      }
      setHealth(null);
      setHealthError(
        nextError instanceof Error ? nextError.message : 'Could not check the review system.',
      );
    } finally {
      if (!signal?.aborted) {
        setLoadingHealth(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal);
    return () => controller.abort();
  }, [loadHealth]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshProfile(), loadHealth()]);
    setRefreshing(false);
  }, [loadHealth, refreshProfile]);

  return (
    <AppScreen
      eyebrow="Settings"
      title="Keep the app ready for the next review."
      subtitle="Manage account details, athlete context, and review system readiness."
      onRefresh={handleRefresh}
      refreshing={refreshing}>
      <SectionCard tone="accent" title="Account">
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
          <Text style={styles.heroText}>
            {user?.display_name ?? 'Active athlete account'}
          </Text>
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
          onPress={() => void handleRefresh()}
        />
        <PrimaryButton
          label="Sign out"
          hint="Remove the saved session from this device"
          onPress={() => void signOut()}
        />
      </SectionCard>

      {bootstrapError ? (
        <SectionCard tone="muted" title="Session error">
          <Text style={styles.body}>{bootstrapError}</Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Athlete context">
        <StatusPill
          label={hasProfile ? 'Profile active' : 'Profile required'}
          tone={hasProfile ? 'success' : 'warning'}
        />
        <Text style={styles.body}>
          {hasProfile
            ? reviewSubject?.description ??
              `${profile?.name ?? 'Athlete'} is the current context for future reviews.`
            : 'Create the athlete profile before running the first review.'}
        </Text>
        {hasProfile ? (
          <View style={styles.contextMetaRow}>
            <SettingsRow label="Review target" value={reviewSubject?.shortLabel ?? 'Self review'} />
            <SettingsRow label="Athlete name" value={profile?.name ?? 'n/a'} />
          </View>
        ) : null}
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

      <SectionCard title="Review system">
        {loadingHealth ? (
          <View style={styles.inlineStatus}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.body}>Checking review availability...</Text>
          </View>
        ) : healthError ? (
          <View style={styles.stack}>
            <StatusPill label="Review system unavailable" tone="warning" />
            <Text style={styles.body}>
              The app could not reach the review service. Make sure the backend is
              running, then try again.
            </Text>
            <Text style={styles.metaText}>{healthError}</Text>
            {isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl) ? (
              <Text style={styles.metaText}>
                If you move from simulator to a physical phone later, replace
                localhost with your Mac&apos;s LAN IP in `mobile/.env`.
              </Text>
            ) : null}
            <PrimaryButton
              label="Retry system check"
              hint="Check review availability again"
              onPress={() => void loadHealth()}
            />
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.pillRow}>
              <StatusPill
                label={health?.database === 'connected' ? 'Database ready' : 'Database issue'}
                tone={health?.database === 'connected' ? 'success' : 'warning'}
              />
              <StatusPill
                label={health?.gemini_configured ? 'Gemini ready' : 'Gemini missing'}
                tone={health?.gemini_configured ? 'success' : 'warning'}
              />
            </View>
            <Text style={styles.body}>
              {health?.gemini_configured
                ? 'The review pipeline is available and ready to save new results.'
                : 'The app can open clips and save uploads, but new Gemini reviews will not complete until the model is configured.'}
            </Text>
            <SettingsRow label="Model" value={health?.gemini_model ?? 'n/a'} />
          </View>
        )}
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
  heroText: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  row: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  contextMetaRow: {
    gap: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  metaText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
});
