import React from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetVotaciones } from "@workspace/api-client-react";
import type { Votacion } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/ui/EmptyState";

function VotacionCard({ v, onPress }: { v: Votacion; onPress: () => void }) {
  const colors = useColors();
  const total = v.favor + v.contra + v.abstenciones + v.ausentes;
  const pctFavor = total > 0 ? Math.round((v.favor / total) * 100) : 0;
  const pctContra = total > 0 ? Math.round((v.contra / total) * 100) : 0;
  const isApproved = v.resultado === "Aprobado";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={3}>{v.titulo}</Text>
          <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{v.fecha || "—"} · {v.tipo}</Text>
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
    </TouchableOpacity>
  );
}

export default function VotacionesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, error } = useGetVotaciones(undefined, {
    query: { queryKey: ["votaciones"] },
  });

  const votaciones = data?.data ?? [];
  const aprobadas = votaciones.filter((v) => v.resultado === "Aprobado").length;
  const rechazadas = votaciones.filter((v) => v.resultado === "Rechazado").length;

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
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="No se pudieron cargar las votaciones"
            subtitle="No existen datos disponibles en las fuentes oficiales sincronizadas."
          />
        ) : votaciones.length === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title="Sin votaciones"
            subtitle="No existen datos disponibles en las fuentes oficiales sincronizadas."
          />
        ) : (
          <>
            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
              <Ionicons name="stats-chart" size={22} color={colors.primary} />
              <View>
                <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Resumen</Text>
                <Text style={[styles.summarySub, { color: colors.mutedForeground }]}>{votaciones.length} votaciones registradas</Text>
              </View>
              <View style={styles.summaryStats}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{aprobadas} apr.</Text>
                <Text style={[styles.summaryValue, { color: colors.destructive }]}>{rechazadas} rech.</Text>
              </View>
            </View>

            {votaciones.map((v) => (
              <VotacionCard key={v.id} v={v} onPress={() => router.push(`/votacion/${v.id}`)} />
            ))}
          </>
        )}
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
  centered: { paddingVertical: 60, alignItems: "center" },
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
