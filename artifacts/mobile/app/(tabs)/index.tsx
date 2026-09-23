import React from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  Platform, RefreshControl, Linking, ImageBackground, Image, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { SessionCard } from "@/components/session/SessionCard";
import { ProjectCard } from "@/components/project/ProjectCard";
import { NewsCarousel } from "@/components/dashboard/NewsCarousel";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatRelative(iso?: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<boolean>(false);

  const [data, setData] = React.useState<any>(null);
  const [status, setStatus] = React.useState<any>(null);
  const [noticias, setNoticias] = React.useState<any>(null);

  const cargarDatosDeAPI = React.useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.3.4:3000";
    
    try {
      setError(false);
      const [resDashboard, resStatus, resNoticias] = await Promise.all([
        fetch(`${baseUrl}/api/legislative/dashboard`).then(r => r.ok ? r.json() : null),
        fetch(`${baseUrl}/api/system/status`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/api/legislative/noticias`).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (resDashboard) setData(resDashboard);
      if (resStatus) setStatus(resStatus);
      if (resNoticias) setNoticias(resNoticias);
      
    } catch (err) {
      console.error("Error estirando datos:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargarDatosDeAPI();
  }, [cargarDatosDeAPI]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await cargarDatosDeAPI();
    setRefreshing(false);
  }, [cargarDatosDeAPI]);

  const lastSync = formatRelative(status?.lastSync);
  const online = status ? status.status !== "offline" : true;
  const headerTopPadding = Platform.OS === "web" ? 12 : Math.max(insets.top, 10);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero Header Institucional compacto */}
      <View style={[styles.hero, { paddingTop: headerTopPadding }]}>
        <ImageBackground
          source={require("../../attached_assets/images/congreso_nacional_1.jpg")}
          style={styles.heroBg}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(5, 20, 45, 0.15)", "rgba(5, 20, 45, 0.65)", "rgba(5, 20, 45, 0.92)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroScrim}
          >
            {/* Logo institucional conservando su tamaño original */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../../attached_assets/images/escudo-paraguay.png")}
                style={styles.fullLogoImage}
                resizeMode="contain"
              />
            </View>

            {/* Sincronización o estado */}
            {lastSync && (
              <View style={styles.syncRow}>
                <View style={[styles.syncDot, { backgroundColor: online ? "#34D399" : "#F87171" }]} />
                <Text style={styles.syncText}>
                  {online ? `${t("dashboard.updated").replace("{time}", lastSync || "")}` : t("dashboard.offline")}
                </Text>
              </View>
            )}

            {/* Barra de sesión en vivo */}
            {data?.sesionEnVivo && (
              <TouchableOpacity
                style={[styles.liveBar, { backgroundColor: "rgba(255,255,255,0.18)" }]}
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
        </ImageBackground>
      </View>

      {/* Contenedor con márgenes para el resto de la aplicación */}
      <View style={styles.innerBody}>
        {/* Noticias oficiales */}
        {noticias?.data && noticias.data.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={t("dashboard.news")} subtitle={t("dashboard.newsSubtitle")} />
            <NewsCarousel noticias={noticias.data} />
          </View>
        )}

        {/* Accesos Directos - Opción C: Tarjetas de Fila Ancha (Lista Institucional) */}
        <View style={styles.section}>
          <SectionHeader title={t("dashboard.quickLinks")} />
          <View style={styles.listContainer}>
            {[
              { 
                icon: "people-outline", 
                label: t("tabs.deputies"), 
                color: colors.primary, 
                route: "/(tabs)/deputies",
                desc: t("dashboard.deputiesDesc", "Conoce la nómina oficial de legisladores")
              },
              { 
                icon: "tv-outline", 
                label: t("tabs.sessions"), 
                color: "#7C3AED", 
                route: "/(tabs)/sessions",
                desc: t("dashboard.sessionsDesc", "Plenarias en directo y transmisiones")
              },
              { 
                icon: "document-text-outline", 
                label: t("tabs.projects"), 
                color: colors.warning, 
                route: "/(tabs)/projects",
                desc: t("dashboard.projectsDesc", "Seguimiento de proyectos y leyes")
              },
              { 
                icon: "sparkles-outline", 
                label: t("ai.title"), 
                color: colors.accent, 
                route: "/ai-assistant",
                desc: t("dashboard.aiDesc", "Consulta asistida por inteligencia artificial")
              },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.rowCard, 
                  { 
                    backgroundColor: colors.card, 
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.rowIconBox, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={[styles.rowCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[styles.rowCardDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.desc}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Próximas Sesiones */}
        {data?.proximasSesiones && data.proximasSesiones.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t("dashboard.upcomingSessions")}
              onPress={() => router.push("/(tabs)/sessions")}
            />
            {isLoading ? <SkeletonList count={2} /> : data.proximasSesiones.map((s: any) => (
              <SessionCard key={s.id} session={s} onPress={() => router.push(`/session/${s.id}`)} />
            ))}
          </View>
        )}

        {/* Últimos Proyectos */}
        <View style={styles.section}>
          <SectionHeader
            title={t("dashboard.recentProjects")}
            subtitle={t("dashboard.recentProjectsSubtitle")}
            onPress={() => router.push("/(tabs)/projects")}
          />
          {isLoading ? (
            <SkeletonList count={3} />
          ) : error ? (
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              No se pudo cargar la información
            </Text>
          ) : data?.ultimosProyectos ? (
            data.ultimosProyectos.slice(0, 5).map((p: any) => (
              <ProjectCard key={p.id} project={p} onPress={() => router.push(`/project/${p.id}`)} />
            ))
          ) : null}
        </View>

        {/* Leyes Recientes */}
        {data?.ultimasLeyes && data.ultimasLeyes.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={t("dashboard.laws")} subtitle={t("dashboard.lawsSubtitle")} />
            <View style={[styles.lawsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {data.ultimasLeyes.slice(0, 4).map((ley: any, i: number) => (
                <View key={ley.numero}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <TouchableOpacity 
                    style={styles.lawRow}
                    onPress={() => router.push("/(tabs)/projects")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.lawNum, { backgroundColor: colors.success + "18" }]}>
                      <Text style={[styles.lawNumText, { color: colors.success }]}>N° {ley.numero}</Text>
                    </View>
                    <Text style={[styles.lawTitle, { color: colors.foreground }]} numberOfLines={2}>{ley.titulo}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Redes Sociales */}
        <View style={styles.section}>
          <SectionHeader title={t("dashboard.socialMedia")} subtitle={t("dashboard.socialMediaSubtitle")} />
          <View style={[styles.socialRowContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { label: "Facebook", url: "https://www.facebook.com/diputadospy", icon: "logo-facebook", color: "#1877F2" },
              { label: "Instagram", url: "https://www.instagram.com/diputadospy", icon: "logo-instagram", color: "#E4405F" },
              { label: "X (Twitter)", url: "https://twitter.com/DiputadosPy", icon: "logo-twitter", color: "#0F1419" },
              { label: "YouTube", url: "https://www.youtube.com/@tvcamarahcd", icon: "logo-youtube", color: "#FF0000" },
            ].map((red, index) => (
              <React.Fragment key={red.label}>
                {index > 0 && <View style={[styles.socialDivider, { backgroundColor: colors.border }]} />}
                <TouchableOpacity
                  style={styles.socialButtonCompact}
                  onPress={() => Linking.openURL(red.url)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.socialIconCompact, { backgroundColor: red.color + "18" }]}>
                    <Ionicons name={red.icon as any} size={20} color={red.color} />
                  </View>
                  <Text style={[styles.socialLabelCompact, { color: colors.foreground }]} numberOfLines={1}>
                    {red.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 100 },
  
  hero: { 
    width: SCREEN_WIDTH,
    marginBottom: 16, 
    overflow: "hidden" as const,
  },
  heroBg: { 
    width: "100%", 
    minHeight: 220, 
    justifyContent: "flex-end",
  },
  heroBgImage: {},
  heroScrim: { 
    flex: 1, 
    minHeight: 225, 
    justifyContent: "flex-end", 
    paddingHorizontal: 16,
    paddingBottom: 16, 
    gap: 10, 
  },
  
  logoContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 2,
  },
  fullLogoImage: {
    width: SCREEN_WIDTH, 
    height: 120,         
  },

  syncRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  liveBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12 },
  liveText: { flex: 1, color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },

  innerBody: { paddingHorizontal: 16, gap: 4 },

  section: { marginBottom: 20 },

  // --- Estilos Opción C: Lista de Tarjetas Anchas Institucionales ---
  listContainer: {
    gap: 10,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  rowIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextContainer: {
    flex: 1,
    gap: 2,
  },
  rowCardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
  },
  rowCardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  // -----------------------------------------------------
  
  errorText: { fontSize: 14, textAlign: "center", padding: 20, fontFamily: "Inter_400Regular" },
  
  lawsBox: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  lawRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  lawNum: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lawNumText: { fontSize: 11, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  lawTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  
  divider: { height: 1, marginHorizontal: 14 },

  // Barra horizontal compacta de Redes Sociales
  socialRowContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "space-between",
  },
  socialButtonCompact: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  socialIconCompact: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLabelCompact: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
    textAlign: "center",
  },
  socialDivider: {
    width: 1,
    height: "60%",
  },
});