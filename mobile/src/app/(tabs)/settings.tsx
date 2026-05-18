import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';
import { isLoopbackApiBaseUrl, mobileConfig } from '@/lib/config';

export default function SettingsTab() {
  return (
    <AppScreen
      eyebrow="Settings"
      title="Keep local development clear while the mobile product grows."
      subtitle="This screen currently documents the app environment and the backend connection assumptions.">
      <SectionCard title="API environment">
        <View style={styles.stack}>
          <StatusPill
            label={isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl) ? 'Simulator default' : 'Custom LAN URL'}
            tone={isLoopbackApiBaseUrl(mobileConfig.apiBaseUrl) ? 'neutral' : 'success'}
          />
          <Text style={styles.body}>Base URL</Text>
          <Text style={styles.code}>{mobileConfig.apiBaseUrl}</Text>
        </View>
      </SectionCard>

      <SectionCard title="Local testing notes" caption="Useful while backend remains on your laptop.">
        <View style={styles.stack}>
          <Text style={styles.body}>• iOS simulator can use `127.0.0.1`.</Text>
          <Text style={styles.body}>• A physical phone needs your computer’s LAN IP.</Text>
          <Text style={styles.body}>• Keep FastAPI on port `8000` unless you also update `mobile/.env`.</Text>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  code: {
    fontSize: typography.bodySmall,
    lineHeight: 22,
    color: palette.textMuted,
  },
});
