import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const MOCK_VOTACIONES = [
  {
    id: "1", proyecto: "Ley N° 7847 - Protección de Datos Personales",
    fecha: "2025-05-28", tipo: "Final",
    favor: 52, contra: 18, abstenciones: 4, ausentes: 6,
    resultado: "Aprobado",
  },
  {
    id: "2", proyecto: "Ley N° 7846 - Economía Social y Solidaria",
    fecha: "2025-05-28", tipo: "Final",
    favor: 48, contra: 22, abstenciones: 6, ausentes: 4,
    resultado: "Aprobado",
  },
  {
    id: "3", proyecto: "Reforma al Código Laboral",
    fecha: "2025-05-21", tipo: "Primera Lectura",
    favor: 38, contra: 32, abstenciones: 3, ausentes: 7,
    resultado: "Aprobado",
  },
  {
    id: "4", proyecto: "Ley de Inversiones Extranjeras",
    fecha: "2025-05-14", tipo: "Comisión",
    favor: 25, contra: 40, abstenciones: 8, ausentes: 7,
    resultado: "Rechazado",
  },
];

function VotacionCard({ v }: { v: typeof MOCK_VOTACIONES[0] }) {
  const colors = useColors();
  const total = v.favor + v.contra + v.abstenciones + v.ausentes;
  const pctFavor = Math.round((v.favor / total) * 100);
  const pctContra = Math.round((v.contra / total) * 100);
  const isApproved = v.resultado === "Aprobado";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{v.proyecto}</Text>
          <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{v.fecha} · {v.tipo}</Text>
        </View>
        <View style={[styles.resultBadge, { backgroundColor: isApproved ? colors.success + "18" : colors.destructive + "18" }]}>
          <Ionicons name={isApproved ? "checkmark-circle" : "close-circle"} size={14} color={isApproved ? colors.success : colors.destructive} />
          <Text style={[styles.resultText, { color: isApproved ? colors.success : colors.destructive }]}>{v.resultado}</Text>
        </View>
      </View>

      {/* Vote Bar */}
      <View style={[styles.bar, { backgroundColor: colors.muted }]}>
        <View style={[styles.barFavor, { flex: v.favor, backgroundColor: colors.success }]} />
        <View style={[styles.barContra, { flex: v.contra, backgroundColor: colors.destructive }]} />
        <View style={[styles.barAbs, { flex: v.abstenciones, backgroundColor: colors.warning }]} />
      </View>

      {/* Vote Stats */}
      <View style={styles.statsRow}>
        {[
          { label: "A favor", value: v.favor, pct: pctFavor, color: colors.success, icon: "thumbs-up-outline" },
          { label: "En contra", value: v.contra, pct: pctContra, color: colors.destructive, icon: "thumbs-down-outline" },
          { label: "Abstenciones", value: v.abstenciones, pct: null, color: colors.warning, icon: "remove-circle-outline" },
          { label: "Ausentes", value: v.ausentes, pct: null, color: colors.mutedForeground, icon: "person-remove-outline" },
        ].map((stat, i) => (
          <View key={i} style={styles.stat}>
            <Ionicons name={stat.icon as any} size={14} color={stat.color} />
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function VotacionesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Votaciones</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 100 : 80 }]} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Ionicons name="stats-chart" size={22} color={colors.primary} />
          <View>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Resumen 2025</Text>
            <Text style={[styles.summarySub, { color: colors.mutedForeground }]}>{MOCK_VOTACIONES.length} votaciones registradas</Text>
          </View>
          <View style={styles.summaryStats}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{MOCK_VOTACIONES.filter(v => v.resultado === "Aprobado").length} apr.</Text>
            <Text style={[styles.summaryValue, { color: colors.destructive }]}>{MOCK_VOTACIONES.filter(v => v.resultado === "Rechazado").length} rech.</Text>
          </View>
        </View>

        {MOCK_VOTACIONES.map(v => <VotacionCard key={v.id} v={v} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 10 },
  summaryCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 4 },
  summaryTitle: { fontSize: 15, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  summarySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryStats: { marginLeft: "auto", flexDirection: "row", gap: 12 },
  summaryValue: { fontSize: 14, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  cardDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  resultBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  resultText: { fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  bar: { height: 8, borderRadius: 4, flexDirection: "row", overflow: "hidden" },
  barFavor: {},
  barContra: {},
  barAbs: {},
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", gap: 3 },
  statValue: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
});
