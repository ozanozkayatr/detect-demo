import type { PropsWithChildren, ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, spacing, typography } from '@/design/theme';

type AppScreenProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}>;

export function AppScreen({
  children,
  title,
  eyebrow,
  subtitle,
  rightSlot,
  onRefresh,
  refreshing = false,
}: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent}
            />
          ) : undefined
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightSlot ? <View>{rightSlot}</View> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.md,
  },
  headerText: {
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  title: {
    fontSize: typography.display,
    lineHeight: 40,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    maxWidth: 560,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.textMuted,
  },
});
