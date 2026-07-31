import React, { useState } from "react";
import {
  FlatList, Platform, StyleSheet, Text, TouchableOpacity, View, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SessionCard } from "@/components/session/SessionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "react-i18next";

const FILTERS = ["Todas", "Programadas", "Completadas"];

export default function SessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("Todas");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Estados locales para el fetch nativo
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const cargarSesiones = React.useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.146:3000";
    try {
      setIsLoading(true);
      setError(false);
      const res = await fetch(`${baseUrl}/api/legislative/sesiones`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Error cargando sesiones:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

  const filtered = React.useMemo(() => {
    const list = data?.data ?? [];
    if (activeFilter === "Programadas") return list.filter(s => s.estado === "programada");
    if (activeFilter === "Completadas") return list.filter(s => s.estado === "completada");
    return list;
  }, [data, activeFilter]);

  const sesionEnVivo = data?.sesionEnVivo;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("sessions.title")}</Text>

        {/* Live Session Banner */}
        {sesionEnVivo && (
          <TouchableOpacity
            style={[styles.liveBanner, { backgroundColor: colors.live + "15", borderColor: colors.live + "40" }]}
            onPress={() => router.push(`/session/${sesionEnVivo.id}`)}
            activeOpacity={0.85}
          >
            <Badge label="EN VIVO" variant="live" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveBannerTitle, { color: colors.foreground }]}>{sesionEnVivo.tipo}</Text>
              <Text style={[styles.liveBannerSub, { color: colors.mutedForeground }]}>Iniciada a las {sesionEnVivo.horaInicio}</Text>
            </View>
            <Ionicons name="radio-outline" size={22} color={colors.live} />
          </TouchableOpacity>
        )}

        {/* Streaming Access */}
        <View style={[styles.streamBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.streamTitle, { color: colors.foreground }]}>{t("sessions.liveStreaming")}</Text>
          <View style={styles.streamBtns}>
            <TouchableOpacity
              style={[styles.streamBtn, { backgroundColor: colors.primary + "15" }]}
              onPress={() => Linking.openURL("https://www.diputados.gov.py/sesiones/sesion-digital-comision-permanente")}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam" size={16} color={colors.primary} />
              <Text style={[styles.streamBtnText, { color: colors.primary }]}>{t("sessions.digitalSession")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.streamBtn, { backgroundColor: colors.accent + "15" }]}
              onPress={() => Linking.openURL("https://www.youtube.com/@tvcamarahcd/streams")}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-youtube" size={16} color={colors.accent} />
              <Text style={[styles.streamBtnText, { color: colors.accent }]}>YouTube</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, {
                backgroundColor: activeFilter === f ? colors.primary : colors.card,
                borderColor: activeFilter === f ? colors.primary : colors.border,
              }]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { color: activeFilter === f ? "#FFF" : colors.foreground }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          <SkeletonList count={4} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={t("common.error")} subtitle={t("sessions.noSessions")} actionLabel={t("common.retry")} onAction={cargarSesiones} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <SessionCard session={item} onPress={() => router.push(`/session/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          onRefresh={cargarSesiones}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState icon="calendar-outline" title={t("common.noResults")} subtitle="No hay sesiones con el filtro seleccionado." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  headerTitle: { fontSize: 28, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  liveBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  liveBannerTitle: { fontSize: 15, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  liveBannerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  streamBox: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  streamTitle: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  streamBtns: { flexDirection: "row", gap: 10 },
  streamBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  streamBtnText: { fontSize: 13, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  filters: { flexDirection: "row", gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  listContent: { padding: 16, paddingBottom: 100 },
});
