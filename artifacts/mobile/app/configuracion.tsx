import React from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSettings, type FontSizeOption } from "@/contexts/SettingsContext";

const FONT_SIZE_LABELS: Record<FontSizeOption, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
};

const OFFICIAL_LINKS = [
  {
    icon: "globe-outline" as const,
    label: "Sitio Oficial",
    subtitle: "diputados.gov.py",
    color: "#002B7F",
    url: "https://www.diputados.gov.py",
  },
  {
    icon: "cloud-download-outline" as const,
    label: "Portal Datos Abiertos",
    subtitle: "datos.congreso.gov.py",
    color: "#0D9488",
    url: "https://datos.congreso.gov.py/opendata/",
  },
  {
    icon: "desktop-outline" as const,
    label: "Portal Legislativo V2",
    subtitle: "datosv2.congreso.gov.py",
    color: "#7C3AED",
    url: "https://datosv2.congreso.gov.py/web/",
  },
  {
    icon: "grid-outline" as const,
    label: "Datasets Legislativos",
    subtitle: "Conjuntos de datos abiertos",
    color: "#0891B2",
    url: "https://datosv2.congreso.gov.py/web/pages/datos.xhtml",
  },
  {
    icon: "videocam-outline" as const,
    label: "Sesión Digital",
    subtitle: "Transmisión en vivo",
    color: "#EF4444",
    url: "https://www.diputados.gov.py/sesiones/sesion-digital-comision-permanente",
  },
  {
    icon: "newspaper-outline" as const,
    label: "Diario de Sesiones",
    subtitle: "Actas y registros oficiales",
    color: "#6366F1",
    url: "https://www.diputados.gov.py/sesiones/diario-sesiones-comision-permanente",
  },
];

export default function ConfiguracionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fontSize, setFontSize, fontScale } = useSettings();

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Accessibility */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCESIBILIDAD</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="text-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: colors.foreground, fontSize: 15 * fontScale }]}>
                Tamaño de texto
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground, fontSize: 13 * fontScale }]}>
                {FONT_SIZE_LABELS[fontSize]}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.fontSizeRow}>
            {(["small", "medium", "large"] as FontSizeOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.fontSizeBtn,
                  {
                    backgroundColor:
                      fontSize === opt ? colors.primary : colors.background,
                    borderColor:
                      fontSize === opt ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFontSize(opt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.fontSizeBtnLabel,
                    {
                      color: fontSize === opt ? "#FFF" : colors.foreground,
                      fontSize:
                        opt === "small" ? 12 : opt === "medium" ? 14 : 17,
                    },
                  ]}
                >
                  A
                </Text>
                <Text
                  style={[
                    styles.fontSizeBtnSub,
                    {
                      color:
                        fontSize === opt ? "#FFF" : colors.mutedForeground,
                    },
                  ]}
                >
                  {FONT_SIZE_LABELS[opt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: "#0891B215" }]}>
              <Ionicons name="language-outline" size={20} color="#0891B2" />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: colors.foreground, fontSize: 15 * fontScale }]}>
                Idioma
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground, fontSize: 13 * fontScale }]}>
                Español (Paraguay)
              </Text>
            </View>
            <View style={[styles.langBadge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.langBadgeText, { color: colors.primary }]}>ES</Text>
            </View>
          </View>
        </View>

        {/* Official Portals */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>
          PORTALES OFICIALES
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {OFFICIAL_LINKS.map((link, i) => (
            <View key={link.url}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: link.color + "15" }]}>
                  <Ionicons name={link.icon} size={20} color={link.color} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardLabel, { color: colors.foreground, fontSize: 15 * fontScale }]}>
                    {link.label}
                  </Text>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground, fontSize: 13 * fontScale }]}>
                    {link.subtitle}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>
          ACERCA DE
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.aboutBox}>
            <View style={[styles.aboutIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="business" size={28} color="#FFF" />
            </View>
            <Text style={[styles.aboutTitle, { color: colors.foreground, fontSize: 17 * fontScale }]}>
              Diputados Paraguay
            </Text>
            <Text style={[styles.aboutSub, { color: colors.mutedForeground, fontSize: 13 * fontScale }]}>
              App institucional de la{"\n"}Honorable Cámara de Diputados{"\n"}República del Paraguay
            </Text>
            <View style={[styles.versionRow, { borderColor: colors.border }]}>
              <Text style={[styles.versionText, { color: colors.mutedForeground, fontSize: 12 * fontScale }]}>
                Versión 1.0.0
              </Text>
              <View style={[styles.dot, { backgroundColor: colors.border }]} />
              <Text style={[styles.versionText, { color: colors.mutedForeground, fontSize: 12 * fontScale }]}>
                2025
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 0 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1 },
  cardLabel: { fontWeight: "500" as const, fontFamily: "Inter_500Medium" },
  cardSub: { fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: 1, marginHorizontal: 16 },
  fontSizeRow: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 12 },
  fontSizeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  fontSizeBtnLabel: { fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  fontSizeBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  langBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  langBadgeText: { fontSize: 12, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  aboutBox: { alignItems: "center", gap: 10, padding: 24 },
  aboutIcon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  aboutTitle: { fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  aboutSub: { fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  versionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, borderTopWidth: 1, marginTop: 4 },
  dot: { width: 3, height: 3, borderRadius: 2 },
  versionText: { fontFamily: "Inter_400Regular" },
});
