import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { palette } from '@/design/theme';
import { AnalysisHistoryProvider } from '@/features/analysis-history/analysis-history-context';
import { AthleteProfileProvider } from '@/features/athlete-profile/athlete-profile-context';

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

export default function RootLayout() {
  return (
    <AthleteProfileProvider>
      <AnalysisHistoryProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.background },
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="analysis/new" options={{ presentation: 'card' }} />
            <Stack.Screen name="profile/edit" options={{ presentation: 'card' }} />
          </Stack>
        </ThemeProvider>
      </AnalysisHistoryProvider>
    </AthleteProfileProvider>
  );
}
