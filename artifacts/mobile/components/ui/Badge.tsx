import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "live" | "muted";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

export function Badge({ label, variant = "default", size = "md" }: BadgeProps) {
  const colors = useColors();

  const getColors = (): { bg: string; text: string } => {
    switch (variant) {
      case "success": return { bg: colors.success + "22", text: colors.success };
      case "warning": return { bg: colors.warning + "22", text: colors.warning };
      case "destructive": return { bg: colors.destructive + "22", text: colors.destructive };
      case "live": return { bg: colors.live, text: colors.liveForeground };
      case "muted": return { bg: colors.muted, text: colors.mutedForeground };
      default: return { bg: colors.primary + "18", text: colors.primary };
    }
  };

  const { bg, text } = getColors();
  const isLive = variant === "live";

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === "sm" && styles.sm]}>
      {isLive && <View style={[styles.dot, { backgroundColor: text }]} />}
      <Text style={[styles.label, { color: text }, size === "sm" && styles.labelSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 5,
    alignSelf: "flex-start",
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
  labelSm: {
    fontSize: 11,
  },
});
