import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';

const profileRows = [
  ['Level', 'Single-athlete profile'],
  ['Body profile', 'Height, weight, stance'],
  ['Routine', 'Weekly training days and drill mix'],
  ['Background', 'Amateur / pro / coach history'],
] as const;

export default function ProfileTab() {
  const router = useRouter();

  return (
    <AppScreen
      eyebrow="Athlete profile"
      title="One profile should shape every future analysis."
      subtitle="The product direction is no longer multi-persona. The app gathers one athlete profile during onboarding, then lets the user edit it later.">
      <SectionCard tone="accent">
        <StatusPill label="Product rule" tone="warning" />
        <Text style={styles.heroText}>
          No persona library. One athlete context, edited over time, driving analysis tone and difficulty.
        </Text>
      </SectionCard>

      <SectionCard title="Profile data model">
        <View style={styles.rows}>
          {profileRows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <PrimaryButton
        label="Open edit profile shell"
        hint="This is the future athlete intake and edit flow entry point"
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
  rows: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderStrong,
    paddingBottom: spacing.md,
  },
  label: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  value: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
