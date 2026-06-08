import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/design/theme';

type PrimaryButtonProps = {
  label: string;
  hint?: string;
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  hint,
  icon,
  onPress,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 68,
    borderRadius: radii.lg,
    backgroundColor: palette.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  hint: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
