import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { SectionCard } from '@/components/section-card';
import { palette, radii, spacing, typography } from '@/design/theme';

const fields = [
  'Name / athlete label',
  'Height and weight',
  'Stance',
  'Boxing level and years of experience',
  'Weekly training days and session types',
  'Amateur, pro, or coaching background',
] as const;

export default function EditProfileScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppScreen
        eyebrow="Edit athlete profile"
        title="This route will replace the current persona demo with one editable athlete profile."
        rightSlot={
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Feather name="x" size={20} color={palette.text} />
          </Pressable>
        }>
        <SectionCard title="Future edit fields">
          <View style={styles.stack}>
            {fields.map((field) => (
              <View key={field} style={styles.row}>
                <Text style={styles.field}>{field}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  stack: {
    gap: spacing.sm,
  },
  row: {
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderStrong,
  },
  field: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
});
