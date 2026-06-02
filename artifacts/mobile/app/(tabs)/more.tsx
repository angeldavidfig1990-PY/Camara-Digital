import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  color: string;
  onPress: () => void;
  badge?: string;
}

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.menuBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {items.map((item, i) => (
          <View key={i}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + "18" }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                {item.subtitle && <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.subtitle}</Text>}
              </View>
              {item.badge && (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 100 + botPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Explorar</Text>

      <MenuSection
        title="LEGISLATIVO"
        items={[
          {
            icon: "sparkles-outline",
            label: "Asistente IA",
            subtitle: "Consulta en lenguaje natural",
            color: colors.accent,
            onPress: () => router.push("/ai-assistant"),
            badge: "IA",
          },
          {
            icon: "briefcase-outline",
            label: "Comisiones Permanentes",
            subtitle: "Composición y agenda",
            color: "#7C3AED",
            onPress: () => router.push("/comisiones"),
          },
          {
            icon: "ribbon-outline",
            label: "Leyes Vigentes",
            subtitle: "Leyes aprobadas y promulgadas",
            color: colors.success,
            onPress: () => router.push("/(tabs)/projects"),
          },
          {
            icon: "stats-chart-outline",
            label: "Votaciones",
            subtitle: "Resultados y estadísticas",
            color: "#0891B2",
            onPress: () => router.push("/votaciones"),
          },
        ]}
      />

      <MenuSection
        title="CONFIGURACIÓN"
        items={[
          {
            icon: "settings-outline",
            label: "Configuración",
            subtitle: "Accesibilidad, idioma y portales",
            color: "#6366F1",
            onPress: () => router.push("/configuracion"),
          },
        ]}
      />

      <MenuSection
        title="TRANSPARENCIA"
        items={[
          {
            icon: "cloud-download-outline",
            label: "Datos Abiertos",
            subtitle: "Portal de datos legislativos",
            color: "#0D9488",
            onPress: () => Linking.openURL("https://datos.congreso.gov.py/opendata/"),
          },
          {
            icon: "document-outline",
            label: "Diario de Sesiones",
            subtitle: "Actas y registros oficiales",
            color: colors.primary,
            onPress: () => Linking.openURL("https://www.diputados.gov.py/sesiones/diario-sesiones-comision-permanente"),
          },
          {
            icon: "newspaper-outline",
            label: "Informes Institucionales",
            subtitle: "Informes y publicaciones",
            color: "#6366F1",
            onPress: () => Linking.openURL("https://www.diputados.gov.py"),
          },
        ]}
      />

      <MenuSection
        title="PORTALES OFICIALES"
        items={[
          {
            icon: "globe-outline",
            label: "Sitio Oficial",
            subtitle: "diputados.gov.py",
            color: colors.primary,
            onPress: () => Linking.openURL("https://www.diputados.gov.py"),
          },
          {
            icon: "desktop-outline",
            label: "Portal de Datos V2",
            subtitle: "datosv2.congreso.gov.py",
            color: "#7C3AED",
            onPress: () => Linking.openURL("https://datosv2.congreso.gov.py/web/"),
          },
          {
            icon: "videocam-outline",
            label: "Sesión Digital",
            subtitle: "Transmisión en tiempo real",
            color: "#EF4444",
            onPress: () => Linking.openURL("https://www.diputados.gov.py/sesiones/sesion-digital-comision-permanente"),
          },
        ]}
      />

      {/* App Info */}
      <View style={styles.appInfo}>
        <View style={[styles.appInfoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="business-outline" size={24} color={colors.primary} />
          <Text style={[styles.appInfoTitle, { color: colors.foreground }]}>Aplicación Legislativa</Text>
          <Text style={[styles.appInfoSub, { color: colors.mutedForeground }]}>
            Información oficial de la{"\n"}Honorable Cámara de Diputados{"\n"}República del Paraguay
          </Text>
          <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>Versión 1.0.0 · 2025</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  pageTitle: { fontSize: 28, fontWeight: "700" as const, fontFamily: "Inter_700Bold", marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8 },
  menuBox: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "500" as const, fontFamily: "Inter_500Medium" },
  menuSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: 1, marginHorizontal: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  appInfo: { marginBottom: 20 },
  appInfoBox: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  appInfoTitle: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  appInfoSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  appVersion: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
