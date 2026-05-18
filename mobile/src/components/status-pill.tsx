import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/design/theme';

type StatusPillProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning';
};

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
      ]}>
      <Text
        style={[
          styles.label,
          tone === 'success' && styles.successLabel,
          tone === 'warning' && styles.warningLabel,
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  success: {
    borderColor: 'rgba(46, 77, 49, 0.16)',
    backgroundColor: palette.successSoft,
  },
  warning: {
    borderColor: 'rgba(142, 15, 40, 0.16)',
    backgroundColor: palette.accentSoft,
  },
  label: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textMuted,
  },
  successLabel: {
    color: palette.success,
  },
  warningLabel: {
    color: palette.warning,
  },
});
