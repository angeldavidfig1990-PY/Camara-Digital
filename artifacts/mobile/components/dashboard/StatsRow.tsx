import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";

interface Stat {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  color?: string;
}

interface StatsRowProps {
  stats: Stat[];
}

export function StatsRow({ stats }: StatsRowProps) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <View key={i} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: (stat.color ?? colors.primary) + "18" }]}>
            <Ionicons name={stat.icon} size={20} color={stat.color ?? colors.primary} />
          </View>
          <Text style={[styles.value, { color: colors.foreground }]}>{stat.value}</Text>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 22,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 11,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
  },
});
