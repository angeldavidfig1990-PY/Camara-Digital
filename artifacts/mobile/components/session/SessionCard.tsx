import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import type { Sesion } from "@workspace/api-client-react";

interface SessionCardProps {
  session: Sesion;
  onPress: () => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" });
  } catch { return dateStr; }
}

function getEstadoBadge(estado: string): { label: string; variant: "live" | "success" | "warning" | "muted" } {
  switch (estado) {
    case "en-vivo": return { label: "EN VIVO", variant: "live" };
    case "programada": return { label: "Programada", variant: "warning" };
    case "completada": return { label: "Finalizada", variant: "success" };
    default: return { label: estado, variant: "muted" };
  }
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const colors = useColors();
  const { label, variant } = getEstadoBadge(session.estado);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name={session.estado === "en-vivo" ? "radio" : "calendar"} size={20} color={colors.primary} />
        </View>
        <Badge label={label} variant={variant} size="sm" />
      </View>
      <Text style={[styles.tipo, { color: colors.foreground }]}>{session.tipo}</Text>
      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{formatDate(session.fecha)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {session.horaInicio}{session.horaFin ? ` - ${session.horaFin}` : ""}
          </Text>
        </View>
      </View>
      {session.descripcion && (
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {session.descripcion}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tipo: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  meta: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
