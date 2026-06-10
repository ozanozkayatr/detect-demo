import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { palette, spacing, typography } from '@/design/theme';
import { AthleteProfileProvider, useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import { mobileConfig } from '@/lib/config';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.background,
    border: palette.border,
    card: palette.background,
    primary: palette.accent,
    text: palette.text,
  },
};

function FullScreenState({
  title,
  message,
  loading = false,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  message: string;
  loading?: boolean;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
}) {
  return (
    <AppScreen title={title} subtitle={message}>
      <SectionCard tone="accent">
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.bodyText}>Restoring the active session…</Text>
          </View>
        ) : (
          <Text style={styles.bodyText}>{message}</Text>
        )}
        {primaryAction ? (
          <PrimaryButton
            label={primaryAction.label}
            onPress={primaryAction.onPress}
          />
        ) : null}
        {secondaryAction ? (
          <PrimaryButton
            label={secondaryAction.label}
            onPress={secondaryAction.onPress}
          />
        ) : null}
      </SectionCard>
    </AppScreen>
  );
}

function SignedInNavigator() {
  const { signOut } = useClerk();
  const {
    bootstrapError,
    hasProfile,
    isBootstrapping,
    refreshProfile,
  } = useAthleteProfile();

  if (isBootstrapping) {
    return (
      <FullScreenState
        title="Loading account"
        message="Preparing your athlete context and saved review access."
        loading
      />
    );
  }

  if (bootstrapError) {
    return (
      <FullScreenState
        title="Could not load the account"
        message={bootstrapError}
        primaryAction={{ label: 'Retry account load', onPress: () => void refreshProfile() }}
        secondaryAction={{ label: 'Sign out', onPress: () => void signOut() }}
      />
    );
  }

  if (!hasProfile) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          gestureEnabled: false,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ presentation: 'card' }} />
      </Stack>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="analysis/new" options={{ presentation: 'card' }} />
      <Stack.Screen name="analysis/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/edit" options={{ presentation: 'card' }} />
      <Stack.Screen name="onboarding" options={{ presentation: 'card' }} />
    </Stack>
  );
}

function AuthNavigation() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <FullScreenState
        title="Loading session"
        message="Checking whether a saved sign-in can be restored."
        loading
      />
    );
  }

  if (!isSignedIn) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack>
    );
  }

  return <SignedInNavigator />;
}

export default function RootLayout() {
  if (!mobileConfig.clerkPublishableKey) {
    return (
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="dark" />
        <FullScreenState
          title="Missing auth config"
          message="Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to mobile/.env before opening the app."
        />
      </ThemeProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={mobileConfig.clerkPublishableKey}
      tokenCache={tokenCache}>
      <AthleteProfileProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="dark" />
          <AuthNavigation />
        </ThemeProvider>
      </AthleteProfileProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bodyText: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
