import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, spacing, typography } from '@/design/theme';

export default function AnalysesTab() {
  const router = useRouter();

  return (
    <AppScreen
      eyebrow="Training log"
      title="Analyses will become the athlete’s long-term review archive."
      subtitle="The backend already stores video rows, analysis rows, raw responses, parsed responses, and model metadata.">
      <SectionCard tone="accent">
        <StatusPill label="Next implementation target" tone="warning" />
        <Text style={styles.bigCopy}>
          This tab is where session history, reopened reviews, and progress comparison will live.
        </Text>
        <PrimaryButton
          label="Open the native analysis setup shell"
          hint="Use the current backend as the first mobile integration target"
          icon={<Feather name="arrow-right" size={20} color="#ffffff" />}
          onPress={() => router.push('/analysis/new')}
        />
      </SectionCard>

      <SectionCard title="Planned history structure">
        <View style={styles.row}>
          <Feather name="film" size={18} color={palette.textSoft} />
          <Text style={styles.rowText}>Clip thumbnail and capture date</Text>
        </View>
        <View style={styles.row}>
          <Feather name="user" size={18} color={palette.textSoft} />
          <Text style={styles.rowText}>Athlete profile level used during the run</Text>
        </View>
        <View style={styles.row}>
          <Feather name="message-square" size={18} color={palette.textSoft} />
          <Text style={styles.rowText}>Summary preview, strengths, issues, next steps</Text>
        </View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bigCopy: {
    fontSize: typography.title,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
