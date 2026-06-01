import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Legislador } from "@workspace/api-client-react";

interface DeputyCardProps {
  deputy: Legislador;
  onPress: () => void;
  compact?: boolean;
}

const PARTY_COLORS: Record<string, string> = {
  "ANR": "#C8102E",
  "PLRA": "#1E3A8A",
  "Frente Guasú": "#7C3AED",
  "Honor Colorado": "#DC2626",
  "Patria Querida": "#0D9488",
  "PPS": "#0891B2",
};

function getPartyColor(partido: string): string {
  return PARTY_COLORS[partido] ?? "#6B7280";
}

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export function DeputyCard({ deputy, onPress, compact = false }: DeputyCardProps) {
  const colors = useColors();
  const partyColor = getPartyColor(deputy.partido);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: partyColor + "18" }]}>
        <Text style={[styles.initials, { color: partyColor }]}>
          {getInitials(deputy.nombre, deputy.apellido)}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {deputy.nombre} {deputy.apellido}
        </Text>
        <Text style={[styles.party, { color: partyColor }]} numberOfLines={1}>
          {deputy.partido}
        </Text>
        {!compact && (
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{deputy.departamento}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export { getPartyColor };

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 16,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  info: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  party: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
