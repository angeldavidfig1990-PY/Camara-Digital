import React from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  Platform, RefreshControl, Linking, ImageBackground,
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

  // Estados locales para los datos de la API
  const [data, setData] = React.useState<any>(null);
  const [status, setStatus] = React.useState<any>(null);
  const [noticias, setNoticias] = React.useState<any>(null);

  // Función sincronizada con las rutas reales encontradas en legislative.ts y app.ts
  const cargarDatosDeAPI = React.useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.146:3000";
    
    try {
      setError(false);
      
      // Consultamos en paralelo a las rutas reales del backend
      const [resDashboard, resStatus, resNoticias] = await Promise.all([
        fetch(`${baseUrl}/api/legislative/dashboard`).then(r => r.ok ? r.json() : null),
        fetch(`${baseUrl}/api/system/status`).then(r => r.ok ? r.json() : null).catch(() => null), // se asume /api/system/status o similar por router.use(systemRouter)
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
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero Header */}
      <View style={styles.hero}>
        <ImageBackground
          source={require("../../assets/images/header-building.png")}
          style={styles.heroBg}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,14,42,0.10)", "rgba(0,14,42,0.55)", "rgba(0,14,42,0.94)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroScrim}
          >
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>{t("dashboard.eyebrow")}</Text>
              <Text style={styles.heroTitle}>{t("dashboard.title")}</Text>
              <Text style={styles.heroSub}>{t("dashboard.subtitle")}</Text>
              {lastSync && (
                <View style={styles.syncRow}>
                  <View style={[styles.syncDot, { backgroundColor: online ? "#34D399" : "#F87171" }]} />
                  <Text style={styles.syncText}>
                    {online ? `${t("dashboard.updated").replace("{time}", lastSync || "")}` : t("dashboard.offline")}
                  </Text>
                </View>
              )}
            </View>

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

      {/* Noticias oficiales */}
      {noticias?.data && noticias.data.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t("dashboard.news")} subtitle={t("dashboard.newsSubtitle")} />
          <NewsCarousel noticias={noticias.data} />
        </View>
      )}

      {/* Enlaces Claves */}
      <View style={styles.section}>
        <SectionHeader title={t("dashboard.quickLinks")} />
        <View style={styles.quickGrid}>
          {[
            { icon: "people-outline", label: t("tabs.deputies"), color: colors.primary, route: "/(tabs)/deputies" },
            { icon: "tv-outline", label: t("tabs.sessions"), color: "#7C3AED", route: "/(tabs)/sessions" },
            { icon: "document-text-outline", label: t("tabs.projects"), color: colors.warning, route: "/(tabs)/projects" },
            { icon: "briefcase-outline", label: t("commissions.title"), color: "#0D9488", route: "/comisiones" },
            { icon: "scale-outline", label: t("dashboard.laws"), color: colors.success, route: "/(tabs)/projects" },
            { icon: "sparkles-outline", label: t("ai.title"), color: colors.accent, route: "/ai-assistant" },
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

      {/* La Cámara */}
      <View style={styles.section}>
        <SectionHeader title={t("dashboard.chamber")} subtitle={t("dashboard.chamberSubtitle")} />
        <View style={[styles.linksBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: t("dashboard.officialSite"), url: "https://www.diputados.gov.py", icon: "globe-outline" },
            { label: t("dashboard.openData"), url: "https://datos.congreso.gov.py/opendata/", icon: "cloud-download-outline" },
            { label: t("dashboard.digitalSession"), url: "https://www.diputados.gov.py/sesiones/sesion-digital-comision-permanente", icon: "videocam-outline" },
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

      {/* Redes Sociales */}
      <View style={styles.section}>
        <SectionHeader title={t("dashboard.socialMedia")} subtitle={t("dashboard.socialMediaSubtitle")} />
        <View style={styles.socialGrid}>
          {[
            { label: "Facebook", url: "https://www.facebook.com/diputadospy", icon: "logo-facebook", color: "#1877F2" },
            { label: "Instagram", url: "https://www.instagram.com/diputadospy", icon: "logo-instagram", color: "#E4405F" },
            { label: "X (Twitter)", url: "https://twitter.com/DiputadosPy", icon: "logo-twitter", color: "#0F1419" },
            { label: "YouTube", url: "https://www.youtube.com/@tvcamarahcd", icon: "logo-youtube", color: "#FF0000" },
          ].map((red) => (
            <TouchableOpacity
              key={red.label}
              style={[styles.socialItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Linking.openURL(red.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.socialIcon, { backgroundColor: red.color + "18" }]}>
                <Ionicons name={red.icon as any} size={22} color={red.color} />
              </View>
              <Text style={[styles.socialLabel, { color: colors.foreground }]}>{red.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  hero: { borderRadius: 20, marginBottom: 20, overflow: "hidden" as const },
  heroBg: { width: "100%", minHeight: 250, justifyContent: "flex-end" },
  heroBgImage: { borderRadius: 20 },
  heroScrim: { flex: 1, minHeight: 250, justifyContent: "flex-end", padding: 20, gap: 14 },
  heroTextWrap: {},
  heroEyebrow: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.5, fontFamily: "Inter_700Bold", textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroTitle: { color: "#FFFFFF", fontSize: 30, fontWeight: "700" as const, fontFamily: "Inter_700Bold", lineHeight: 35, marginTop: 4, textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  heroSub: { color: "rgba(255,255,255,0.92)", fontSize: 13, marginTop: 4, fontFamily: "Inter_400Regular", textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  liveBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  liveText: { flex: 1, color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  section: { marginBottom: 20 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickItem: { width: "30%", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 8, flexGrow: 1 },
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
  socialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  socialItem: { flexDirection: "row", alignItems: "center", gap: 10, width: "47%", flexGrow: 1, padding: 12, borderRadius: 14, borderWidth: 1 },
  socialIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  socialLabel: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
});