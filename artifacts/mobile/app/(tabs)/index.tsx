import React, { useEffect, useRef } from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  Platform, RefreshControl, Linking, ImageBackground, Image, Dimensions, Animated,
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

  // Animación de pulso y rotación interactiva
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

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
    Animated.sequence([
      Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(spinAnim, { toValue: 0, duration: 0, useNativeDriver: true })
    ]).start();

    await cargarDatosDeAPI();
    setRefreshing(false);
  }, [cargarDatosDeAPI, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

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
      {/* Hero Header Institucional Interactivo */}
      <View style={[styles.hero, { paddingTop: headerTopPadding }]}>
        <ImageBackground
          source={require("../../attached_assets/images/congreso_nacional_1.jpg")}
          style={styles.heroBg}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(5, 20, 45, 0.2)", "rgba(5, 20, 45, 0.7)", "rgba(5, 20, 45, 0.95)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroScrim}
          >
            {/* Logo institucional */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../../attached_assets/images/escudo-paraguay.png")}
                style={styles.fullLogoImage}
                resizeMode="contain"
              />
            </View>

            {/* Barra de Sincronización Interactiva */}
            {lastSync && (
              <TouchableOpacity 
                style={styles.syncContainerButton}
                onPress={onRefresh}
                activeOpacity={0.8}
              >
                <View style={styles.syncRow}>
                  <Animated.View 
                    style={[
                      styles.syncDot, 
                      { 
                        backgroundColor: online ? "#34D399" : "#F87171",
                        transform: [{ scale: online ? pulseAnim : 1 }] 
                      }
                    ]} 
                  />
                  <Text style={styles.syncText}>
                    {online ? `${t("dashboard.updated").replace("{time}", lastSync || "")}` : t("dashboard.offline")}
                  </Text>
                  <Animated.View style={{ transform: [{ rotate: spin }], marginLeft: 4 }}>
                    <Ionicons name="sync-outline" size={13} color="rgba(255,255,255,0.8)" />
                  </Animated.View>
                </View>
              </TouchableOpacity>
            )}

            {/* Barra de sesión en vivo interactiva */}
            {data?.sesionEnVivo ? (
              <TouchableOpacity
                style={[styles.liveBar, { backgroundColor: "rgba(220, 38, 38, 0.35)", borderColor: "rgba(239, 68, 68, 0.6)" }]}
                onPress={() => router.push(`/session/${data.sesionEnVivo!.id}`)}
                activeOpacity={0.75}
              >
                <Badge label="EN VIVO" variant="live" size="sm" />
                <Text style={styles.liveText} numberOfLines={1}>
                  {data.sesionEnVivo.tipo} — {data.sesionEnVivo.horaInicio}
                </Text>
                <View style={styles.liveActionBadge}>
                  <Text style={styles.liveActionText}>Ver</Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.liveBar, { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.2)" }]}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.liveText} numberOfLines={1}>
                  Sin sesiones plenarias en curso ahora mismo
                </Text>
              </View>
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

        {/* Accesos Directos - Tarjetas en Cuadrícula con Imagen de Fondo */}
        <View style={styles.section}>
          <SectionHeader title={t("dashboard.quickLinks", "Accesos rápidos")} />
          <View style={styles.gridContainer}>
            {[
              { 
                icon: "people-outline", 
                label: t("tabs.deputies", "Legisladores"), 
                subtitle: "Nómina oficial",
                route: "/(tabs)/deputies",
                bgImage: require("../../attached_assets/images/deputies-bg.jpg"),
              },
              { 
                icon: "tv-outline", 
                label: t("tabs.sessions", "Sesiones"), 
                subtitle: "En directo",
                route: "/(tabs)/sessions",
                bgImage: require("../../attached_assets/images/sessions-bg.jpg"),
              },
              { 
                icon: "document-text-outline", 
                label: t("tabs.projects", "Proyectos"), 
                subtitle: "Leyes y expedientes",
                route: "/(tabs)/projects",
                bgImage: require("../../attached_assets/images/projects-bg.jpg"),
              },
              { 
                icon: "sparkles-outline", 
                label: t("ai.title", "Asistente IA"), 
                subtitle: "Consulta inteligente",
                route: "/ai-assistant",
                bgImage: require("../../attached_assets/images/ai-bg.jpg"),
              },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.gridCard, { borderColor: colors.border }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.85}
              >
                <ImageBackground
                  source={item.bgImage}
                  style={styles.gridCardBg}
                  imageStyle={styles.gridCardImageStyle}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={["rgba(5, 20, 45, 0.2)", "rgba(5, 20, 45, 0.85)", "rgba(5, 20, 45, 0.95)"]}
                    style={styles.gridCardScrim}
                  >
                    <View style={styles.gridIconBox}>
                      <Ionicons name={item.icon as any} size={18} color="#D4AF37" />
                    </View>
                    <View style={styles.gridTextContainer}>
                      <Text style={styles.gridCardTitle} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={styles.gridCardSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </LinearGradient>
                </ImageBackground>
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

  syncContainerButton: {
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  syncRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  
  liveBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10, 
    padding: 10, 
    paddingHorizontal: 12,
    borderRadius: 12, 
    borderWidth: 1,
  },
  liveText: { flex: 1, color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  liveActionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  liveActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
  },

  innerBody: { paddingHorizontal: 16, gap: 4 },

  section: { marginBottom: 20 },

  // Estilos para la cuadrícula con imagen de fondo
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  gridCard: {
    width: (SCREEN_WIDTH - 32 - 12) / 2, // Ancho exacto para 2 columnas (con padding lateral de 16 y gap de 12)
    height: 125,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  gridCardBg: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  gridCardImageStyle: {
    borderRadius: 16,
  },
  gridCardScrim: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  gridIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(212, 175, 55, 0.4)",
  },
  gridTextContainer: {
    gap: 1,
  },
  gridCardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
  },
  gridCardSubtitle: {
    color: "#D4AF37", // Acento dorado institucional
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  
  errorText: { fontSize: 14, textAlign: "center", padding: 20, fontFamily: "Inter_400Regular" },
  
  lawsBox: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  lawRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  lawNum: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lawNumText: { fontSize: 11, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  lawTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  
  divider: { height: 1, marginHorizontal: 14 },

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