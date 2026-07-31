import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, Linking, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

export default function SessionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Estados locales para el fetch nativo
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [votaciones, setVotaciones] = useState<any>(null);
  const [isLoadingVotaciones, setIsLoadingVotaciones] = useState(false);

  const cargarSesion = React.useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.146:3000";
    if (!id) return;
    try {
      setIsLoading(true);
      setError(false);
      const res = await fetch(`${baseUrl}/api/legislative/sesiones/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Error cargando sesion:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const cargarVotaciones = React.useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.146:3000";
    if (!id) return;
    try {
      setIsLoadingVotaciones(true);
      const res = await fetch(`${baseUrl}/api/legislative/sesiones/${id}/votaciones`);
      if (res.ok) {
        const json = await res.json();
        setVotaciones(json);
      }
    } catch (err) {
      console.error("Error cargando votaciones:", err);
    } finally {
      setIsLoadingVotaciones(false);
    }
  }, [id]);

  React.useEffect(() => {
    cargarSesion();
  }, [cargarSesion]);

  React.useEffect(() => {
    if (data && !isLoading) {
      cargarVotaciones();
    }
  }, [data, isLoading, cargarVotaciones]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isLive = data?.estado === "en vivo";
  const isProgramada = data?.estado === "programada";

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
          <SkeletonList count={3} />
        </ScrollView>
      ) : error || !data ? (
        <EmptyState icon="calendar-outline" title="Sesión no encontrada" subtitle="No se pudo cargar la información de la sesión." actionLabel="Volver" onAction={() => router.back()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPad + 56, paddingBottom: Platform.OS === "web" ? 100 : 60 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={[styles.headerCard, {
            backgroundColor: isLive ? colors.live + "12" : colors.card,
            borderColor: isLive ? colors.live + "40" : colors.border,
          }]}>
            <View style={styles.headerTop}>
              <View style={[styles.iconWrap, {
                backgroundColor: isLive ? colors.live + "20" : colors.primary + "15",
              }]}>
                <Ionicons
                  name={isLive ? "radio" : isProgramada ? "calendar" : "checkmark-circle"}
                  size={28}
                  color={isLive ? colors.live : colors.primary}
                />
              </View>
              <Badge
                label={isLive ? "EN VIVO" : isProgramada ? "Programada" : "Finalizada"}
                variant={isLive ? "live" : isProgramada ? "warning" : "success"}
              />
            </View>
            <Text style={[styles.sessionType, { color: colors.foreground }]}>{data.tipo}</Text>
            <Text style={[styles.sessionDate, { color: colors.mutedForeground }]}>{formatDate(data.fecha)}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                {data.horaInicio}{data.horaFin ? ` — ${data.horaFin}` : " (en curso)"}
              </Text>
            </View>
          </View>

          {/* Live Streaming */}
          {(isLive || isProgramada) && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Seguimiento</Text>
              <View style={styles.streamBtns}>
                <TouchableOpacity
                  style={[styles.streamBtn, { backgroundColor: colors.primary }]}
                  onPress={() => Linking.openURL("https://www.diputados.gov.py/sesiones/sesion-digital-comision-permanente")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="videocam-outline" size={18} color="#FFF" />
                  <Text style={styles.streamBtnText}>Sesión Digital</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.streamBtn, { backgroundColor: "#FF0000" }]}
                  onPress={() => Linking.openURL("https://www.youtube.com/@tvcamarahcd/streams")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-youtube" size={18} color="#FFF" />
                  <Text style={styles.streamBtnText}>YouTube</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Info */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Detalles</Text>
            {[
              { label: "Tipo", value: data.tipo, icon: "document-text-outline" },
              { label: "Período", value: data.periodo, icon: "calendar-outline" },
              { label: "Estado", value: data.estado, icon: "checkmark-circle-outline" },
            ].map((item, i) => (
              <View key={i} style={[styles.detailRow, { borderTopColor: i > 0 ? colors.border : "transparent" }]}>
                <Ionicons name={item.icon as any} size={16} color={colors.primary} />
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
            {data.descripcion && (
              <View style={[styles.detailRow, { borderTopColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Descripción</Text>
                <Text style={[styles.detailValue, { color: colors.foreground, flex: 1 }]}>{data.descripcion}</Text>
              </View>
            )}
          </View>

          {/* Orden del Día */}
          {data.orden_del_dia && data.orden_del_dia.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Orden del Día</Text>
              </View>
              {data.orden_del_dia.map((item, i) => (
                <View key={i} style={[styles.ordenItem, { borderTopColor: i > 0 ? colors.border : "transparent" }]}>
                  <View style={[styles.ordenNum, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.ordenNumText, { color: colors.primary }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.ordenText, { color: colors.foreground }]}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Votaciones */}
          {votaciones && votaciones.data && votaciones.data.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Votaciones</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{votaciones.data.length}</Text>
              </View>
              {isLoadingVotaciones ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                votaciones.data.map((v: any) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.votacionItem, { borderTopColor: colors.border }]}
                    onPress={() => router.push(`/votacion/${v.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.votacionHeader}>
                      <Text style={[styles.votacionTitle, { color: colors.foreground }]} numberOfLines={2}>{v.titulo}</Text>
                      <View style={[styles.votacionBadge, { backgroundColor: v.resultado === "Aprobado" ? colors.success + "18" : colors.destructive + "18" }]}>
                        <Text style={[styles.votacionBadgeText, { color: v.resultado === "Aprobado" ? colors.success : colors.destructive }]}>{v.resultado}</Text>
                      </View>
                    </View>
                    <View style={styles.votacionStats}>
                      <View style={styles.votacionStat}>
                        <Text style={[styles.votacionStatValue, { color: colors.success }]}>{v.favor}</Text>
                        <Text style={[styles.votacionStatLabel, { color: colors.mutedForeground }]}>A favor</Text>
                      </View>
                      <View style={styles.votacionStat}>
                        <Text style={[styles.votacionStatValue, { color: colors.destructive }]}>{v.contra}</Text>
                        <Text style={[styles.votacionStatLabel, { color: colors.mutedForeground }]}>En contra</Text>
                      </View>
                      <View style={styles.votacionStat}>
                        <Text style={[styles.votacionStatValue, { color: colors.warning }]}>{v.abstenciones}</Text>
                        <Text style={[styles.votacionStatLabel, { color: colors.mutedForeground }]}>Abst.</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Enlace oficial de la sesión (appURL) o Diario de Sesiones */}
          <TouchableOpacity
            style={[styles.diarioBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={() =>
              Linking.openURL(
                data.appURL ?? "https://www.diputados.gov.py/sesiones/diario-sesiones-comision-permanente",
              )
            }
            activeOpacity={0.8}
          >
            <Ionicons name="newspaper-outline" size={18} color={colors.primary} />
            <Text style={[styles.diarioBtnText, { color: colors.primary }]}>
              {data.appURL ? "Ver ficha oficial de la sesión" : "Ver Diario de Sesiones"}
            </Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
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
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sessionType: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  sessionDate: { fontSize: 14, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  sectionCount: { fontSize: 13, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  streamBtns: { flexDirection: "row", gap: 10 },
  streamBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12,
  },
  streamBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  detailRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 10, paddingTop: 10, borderTopWidth: 1,
  },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular", width: 90 },
  detailValue: { fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const, flex: 1 },
  ordenItem: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 12, paddingTop: 10, borderTopWidth: 1,
  },
  ordenNum: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  ordenNumText: { fontSize: 12, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  ordenText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  diarioBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 16, borderRadius: 14, borderWidth: 1,
  },
  diarioBtnText: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  centered: { paddingVertical: 20, alignItems: "center" },
  votacionItem: { paddingTop: 12, borderTopWidth: 1 },
  votacionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  votacionTitle: { flex: 1, fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  votacionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  votacionBadgeText: { fontSize: 11, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  votacionStats: { flexDirection: "row", gap: 16 },
  votacionStat: { alignItems: "center" },
  votacionStatValue: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  votacionStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
