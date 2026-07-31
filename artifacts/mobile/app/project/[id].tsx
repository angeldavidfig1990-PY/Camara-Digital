import React, { useState } from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";

function getEstadoVariant(estado: string): "default" | "success" | "warning" | "destructive" | "muted" {
  const e = estado.toLowerCase();
  if (e.includes("aprobado") || e.includes("promulgado")) return "success";
  if (e.includes("tratamiento") || e.includes("comisi")) return "warning";
  if (e.includes("rechazado")) return "destructive";
  if (e.includes("pendiente")) return "muted";
  return "default";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

export default function ProjectDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Estados locales para el fetch nativo
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const cargarProyecto = React.useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.146:3000";
    if (!id) return;
    try {
      setIsLoading(true);
      setError(false);
      const res = await fetch(`${baseUrl}/api/legislative/proyectos/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Error cargando proyecto:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    cargarProyecto();
  }, [cargarProyecto]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.backBtn, { top: topPad + 8, backgroundColor: colors.card + "EE", borderColor: colors.border }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </TouchableOpacity>

      {isLoading ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 56 }]}>
          <SkeletonList count={4} />
        </ScrollView>
      ) : error || !data ? (
        <EmptyState icon="document-text-outline" title="Proyecto no encontrado" subtitle="No se encontró el expediente solicitado." actionLabel="Volver" onAction={() => router.back()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPad + 56, paddingBottom: Platform.OS === "web" ? 100 : 60 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.numRow}>
              <View style={[styles.numBadge, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.numText, { color: colors.primary }]}>Exp. {data.numero}</Text>
              </View>
              <Badge label={data.estado} variant={getEstadoVariant(data.estado)} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{data.titulo}</Text>
            <Text style={[styles.iniciativa, { color: colors.mutedForeground }]}>
              Iniciativa: {data.iniciativa}
            </Text>
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            {[
              { icon: "layers-outline", label: "Etapa Actual", value: data.etapa },
              { icon: "calendar-outline", label: "Fecha de Ingreso", value: formatDate(data.fechaIngreso) },
              ...(data.comision ? [{ icon: "briefcase-outline", label: "Comisión", value: data.comision }] : []),
            ].map((item, i) => (
              <View key={i} style={[styles.infoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          {data.descripcion && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Resumen Ejecutivo</Text>
              </View>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{data.descripcion}</Text>
            </View>
          )}

          {/* Timeline / Historial */}
          {data.historial && data.historial.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historial Legislativo</Text>
              </View>
              <View style={styles.timeline}>
                {data.historial.map((h, i) => (
                  <View key={i} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: i === 0 ? colors.primary : colors.mutedForeground }]} />
                      {i < data.historial!.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineDate, { color: colors.mutedForeground }]}>{formatDate(h.fecha)}</Text>
                      <Text style={[styles.timelineEvent, { color: colors.foreground }]}>{h.evento}</Text>
                      <Text style={[styles.timelineDesc, { color: colors.mutedForeground }]}>{h.descripcion}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Status Progress */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Estado del Proceso</Text>
            </View>
            {["Presentación", "Comisión", "Primera Lectura", "Segunda Lectura", "Votación", "Aprobado", "Promulgado"].map((step, i) => {
              const isActive = data.etapa.toLowerCase().includes(step.toLowerCase()) || data.estado.toLowerCase().includes(step.toLowerCase());
              const isPast = data.historial?.some(h => h.evento.toLowerCase().includes(step.toLowerCase())) ?? false;
              return (
                <View key={i} style={styles.progressStep}>
                  <View style={[styles.progressDot, {
                    backgroundColor: isActive ? colors.primary : isPast ? colors.success : colors.border,
                    width: isActive ? 12 : 10, height: isActive ? 12 : 10,
                    borderRadius: isActive ? 6 : 5,
                  }]} />
                  <Text style={[styles.progressText, {
                    color: isActive ? colors.primary : isPast ? colors.success : colors.mutedForeground,
                    fontWeight: isActive ? "600" : "400",
                  }]}>{step}</Text>
                  {isActive && <Badge label="Actual" variant="default" size="sm" />}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: "absolute", left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  content: { padding: 16, gap: 12 },
  headerCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 10 },
  numRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  numBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  numText: { fontSize: 13, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  title: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold", lineHeight: 26 },
  iniciativa: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoItem: { flex: 1, minWidth: "44%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: "row", gap: 14 },
  timelineLeft: { width: 16, alignItems: "center" },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 16, gap: 2 },
  timelineDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  timelineEvent: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  timelineDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  progressStep: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  progressDot: {},
  progressText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
});
