import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/design/theme';

type SectionCardProps = PropsWithChildren<{
  title?: string;
  caption?: string;
  tone?: 'default' | 'muted' | 'accent';
}>;

export function SectionCard({
  children,
  title,
  caption,
  tone = 'default',
}: SectionCardProps) {
  return (
    <View
      style={[
        styles.card,
        tone === 'muted' && styles.muted,
        tone === 'accent' && styles.accent,
      ]}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  muted: {
    backgroundColor: palette.surfaceMuted,
  },
  accent: {
    backgroundColor: palette.accentSoft,
    borderColor: 'rgba(106, 31, 42, 0.18)',
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.heading,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.text,
  },
  caption: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
});
