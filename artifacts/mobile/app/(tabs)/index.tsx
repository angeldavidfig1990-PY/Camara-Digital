import React from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  Platform, RefreshControl, Linking, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useGetDashboard } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { SessionCard } from "@/components/session/SessionCard";
import { ProjectCard } from "@/components/project/ProjectCard";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { Badge } from "@/components/ui/Badge";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, isLoading, error, refetch } = useGetDashboard({
    query: { queryKey: ["dashboard"] },
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 100 : 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero Header */}
      <LinearGradient
        colors={[colors.primary, colors.primary + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <View>
            <Text style={styles.heroEyebrow}>REPÚBLICA DEL PARAGUAY</Text>
            <Text style={styles.heroTitle}>Cámara de{"\n"}Diputados</Text>
            <Text style={styles.heroSub}>Honorable Congreso Nacional</Text>
          </View>
          <View style={styles.heroLogoWrap}>
            <Image
              source={require("../../assets/images/logo-camara.png")}
              style={styles.heroLogo}
            />
          </View>
        </View>

        {data?.sesionEnVivo && (
          <TouchableOpacity
            style={[styles.liveBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            onPress={() => router.push(`/session/${data.sesionEnVivo!.id}`)}
            activeOpacity={0.8}
          >
            <Badge label="EN VIVO" variant="live" size="sm" />
            <Text style={styles.liveText} numberOfLines={1}>
              {data.sesionEnVivo.tipo} — {data.sesionEnVivo.horaInicio}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Stats */}
      {isLoading ? (
        <View style={styles.section}>
          <SkeletonList count={1} />
        </View>
      ) : data && (
        <View style={styles.section}>
          <StatsRow stats={[
            { icon: "people", value: data.totalLegisladores, label: "Diputados", color: colors.primary },
            { icon: "briefcase", value: data.totalComisiones, label: "Comisiones", color: "#7C3AED" },
            { icon: "document-text", value: data.proyectosPendientes, label: "Proyectos", color: colors.warning },
            { icon: "ribbon", value: data.leyesAprobadas, label: "Leyes 2025", color: colors.success },
          ]} />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <SectionHeader title="Acceso Rápido" />
        <View style={styles.quickGrid}>
          {[
            { icon: "people-outline", label: "Diputados", color: colors.primary, route: "/(tabs)/deputies" },
            { icon: "tv-outline", label: "Sesiones", color: "#7C3AED", route: "/(tabs)/sessions" },
            { icon: "document-text-outline", label: "Proyectos", color: colors.warning, route: "/(tabs)/projects" },
            { icon: "briefcase-outline", label: "Comisiones", color: "#0D9488", route: "/comisiones" },
            { icon: "scale-outline", label: "Leyes", color: colors.success, route: "/(tabs)/projects" },
            { icon: "sparkles-outline", label: "Asistente IA", color: colors.accent, route: "/ai-assistant" },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.quickItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + "18" }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.foreground }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Próximas Sesiones */}
      {(isLoading || (data?.proximasSesiones && data.proximasSesiones.length > 0)) && (
        <View style={styles.section}>
          <SectionHeader
            title="Próximas Sesiones"
            onPress={() => router.push("/(tabs)/sessions")}
          />
          {isLoading ? <SkeletonList count={2} /> : data?.proximasSesiones.map(s => (
            <SessionCard key={s.id} session={s} onPress={() => router.push(`/session/${s.id}`)} />
          ))}
        </View>
      )}

      {/* Últimos Proyectos */}
      <View style={styles.section}>
        <SectionHeader
          title="Últimos Proyectos"
          subtitle="Actividad legislativa reciente"
          onPress={() => router.push("/(tabs)/projects")}
        />
        {isLoading ? (
          <SkeletonList count={3} />
        ) : error ? (
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            No se pudo cargar la información
          </Text>
        ) : data?.ultimosProyectos.map(p => (
          <ProjectCard key={p.id} project={p} onPress={() => router.push(`/project/${p.id}`)} />
        ))}
      </View>

      {/* Leyes Recientes */}
      {data?.ultimasLeyes && data.ultimasLeyes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Leyes Sancionadas" subtitle="Legislación vigente" />
          <View style={[styles.lawsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {data.ultimasLeyes.slice(0, 4).map((ley, i) => (
              <View key={ley.numero}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={styles.lawRow}>
                  <View style={[styles.lawNum, { backgroundColor: colors.success + "18" }]}>
                    <Text style={[styles.lawNumText, { color: colors.success }]}>N° {ley.numero}</Text>
                  </View>
                  <Text style={[styles.lawTitle, { color: colors.foreground }]} numberOfLines={2}>{ley.titulo}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* External Links */}
      <View style={styles.section}>
        <SectionHeader title="Portales Oficiales" />
        <View style={[styles.linksBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "Sitio Oficial", url: "https://www.diputados.gov.py", icon: "globe-outline" },
            { label: "Datos Abiertos", url: "https://datos.congreso.gov.py/opendata/", icon: "cloud-download-outline" },
            { label: "Sesión Digital", url: "https://www.diputados.gov.py/sesiones/sesion-digital-comision-permanente", icon: "videocam-outline" },
          ].map((link, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.7}
              >
                <Ionicons name={link.icon as any} size={18} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.foreground }]}>{link.label}</Text>
                <Ionicons name="open-outline" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  hero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    gap: 14,
  },
  heroContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroEyebrow: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  heroTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "700" as const, fontFamily: "Inter_700Bold", lineHeight: 34, marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4, fontFamily: "Inter_400Regular" },
  heroShield: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroLogoWrap: { width: 72, height: 72, borderRadius: 36, overflow: "hidden" as const },
  heroLogo: { width: 168, height: 168, marginLeft: -48, marginTop: -3 },
  liveBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  liveText: { flex: 1, color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  section: { marginBottom: 20 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickItem: {
    width: "30%",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    flexGrow: 1,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" as const, textAlign: "center" },
  errorText: { fontSize: 14, textAlign: "center", padding: 20, fontFamily: "Inter_400Regular" },
  lawsBox: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  lawRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  lawNum: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lawNumText: { fontSize: 11, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  lawTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  divider: { height: 1, marginHorizontal: 14 },
  linksBox: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  linkText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
});
