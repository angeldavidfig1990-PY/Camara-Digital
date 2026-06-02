import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import type { Proyecto } from "@workspace/api-client-react";

interface ProjectCardProps {
  project: Proyecto;
  onPress: () => void;
}

function getTipoVariant(tipo: string): "default" | "success" | "warning" | "destructive" | "muted" {
  const t = tipo.toLowerCase();
  if (t.includes("ley")) return "success";
  if (t.includes("declaraci")) return "default";
  if (t.includes("pedido")) return "warning";
  if (t.includes("resoluci") || t.includes("acuerdo")) return "muted";
  return "default";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-PY", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <View style={[styles.numBadge, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.num, { color: colors.primary }]}>{project.numero}</Text>
        </View>
        <Badge label={project.tipo} variant={getTipoVariant(project.tipo)} size="sm" />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {project.titulo}
      </Text>
      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="layers-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{project.etapa}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{formatDate(project.fechaIngreso)}</Text>
        </View>
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  numBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  num: {
    fontSize: 12,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
  },
  meta: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
