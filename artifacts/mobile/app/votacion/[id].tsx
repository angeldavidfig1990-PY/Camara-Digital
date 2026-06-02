import React from "react";
import {
  Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetVotacionById } from "@workspace/api-client-react";
import type { VotacionVotosItem } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";

type Sentido = "favor" | "contra" | "abstencion" | "ausente" | "otro";

const SENTIDO_ORDER: Sentido[] = ["favor", "contra", "abstencion", "ausente", "otro"];

const SENTIDO_META: Record<Sentido, { label: string; icon: string }> = {
  favor: { label: "A favor", icon: "thumbs-up-outline" },
  contra: { label: "En contra", icon: "thumbs-down-outline" },
  abstencion: { label: "Abstención", icon: "remove-circle-outline" },
  ausente: { label: "Ausente", icon: "person-remove-outline" },
  otro: { label: "Otros", icon: "help-circle-outline" },
};

function classifySentido(raw: string): Sentido {
  const s = (raw || "").toLowerCase();
  if (s.includes("favor") || s === "si" || s === "sí" || s.includes("afirm")) return "favor";
  if (s.includes("contra") || s === "no" || s.includes("negativ")) return "contra";
  if (s.includes("absten")) return "abstencion";
  if (s.includes("ausen") || s.includes("no vota")) return "ausente";
  return "otro";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

export default function VotacionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [filter, setFilter] = React.useState<Sentido | "todos">("todos");

  const { data, isLoading, error } = useGetVotacionById(id ?? "", {
    query: { queryKey: ["votacion", id], enabled: !!id },
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const sentidoColor = (s: Sentido): string => {
    switch (s) {
      case "favor": return colors.success;
      case "contra": return colors.destructive;
      case "abstencion": return colors.warning;
      default: return colors.mutedForeground;
    }
  };

  const votos = data?.votos ?? [];
  const counts: Record<Sentido, number> = { favor: 0, contra: 0, abstencion: 0, ausente: 0, otro: 0 };
  for (const v of votos) counts[classifySentido(v.sentido)]++;

  const filtered = votos
    .filter((v) => filter === "todos" || classifySentido(v.sentido) === filter)
    .slice()
    .sort((a, b) => a.legislador.localeCompare(b.legislador, "es"));

  const isApproved = data?.resultado === "Aprobado";

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
          <SkeletonList count={4} />
        </ScrollView>
      ) : error || !data ? (
        <EmptyState
          icon="stats-chart-outline"
          title="Votación no encontrada"
          subtitle="No existen datos disponibles en las fuentes oficiales sincronizadas."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPad + 56, paddingBottom: Platform.OS === "web" ? 100 : 60 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.numRow}>
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {formatDate(data.fecha)} · {data.tipo}
              </Text>
              <View style={[styles.resultBadge, { backgroundColor: isApproved ? colors.success + "18" : colors.destructive + "18" }]}>
                <Ionicons name={isApproved ? "checkmark-circle" : "close-circle"} size={14} color={isApproved ? colors.success : colors.destructive} />
                <Text style={[styles.resultText, { color: isApproved ? colors.success : colors.destructive }]}>{data.resultado}</Text>
              </View>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{data.titulo}</Text>
            {!!data.descripcion && (
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>{data.descripcion}</Text>
            )}
          </View>

          {/* Totals */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Resultado</Text>
            </View>
            <View style={styles.totalsRow}>
              {[
                { label: "A favor", value: data.favor, color: colors.success },
                { label: "En contra", value: data.contra, color: colors.destructive },
                { label: "Abstenciones", value: data.abstenciones, color: colors.warning },
                { label: "Ausentes", value: data.ausentes, color: colors.mutedForeground },
              ].map((t, i) => (
                <View key={i} style={styles.total}>
                  <Text style={[styles.totalValue, { color: t.color }]}>{t.value}</Text>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>{t.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Nominal vote list */}
          {votos.length === 0 ? (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <EmptyState
                icon="people-outline"
                title="Sin voto nominal"
                subtitle="Esta votación no tiene registro individual de diputados en las fuentes oficiales."
              />
            </View>
          ) : (
            <>
              {/* Filter chips */}
              <View style={styles.chipsRow}>
                <FilterChip
                  label={`Todos (${votos.length})`}
                  active={filter === "todos"}
                  color={colors.primary}
                  onPress={() => setFilter("todos")}
                  colors={colors}
                />
                {SENTIDO_ORDER.filter((s) => counts[s] > 0).map((s) => (
                  <FilterChip
                    key={s}
                    label={`${SENTIDO_META[s].label} (${counts[s]})`}
                    active={filter === s}
                    color={sentidoColor(s)}
                    onPress={() => setFilter(s)}
                    colors={colors}
                  />
                ))}
              </View>

              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 6 }]}>
                {filtered.map((v, i) => (
                  <VoteRow
                    key={`${v.legislador}-${i}`}
                    voto={v}
                    sentido={classifySentido(v.sentido)}
                    color={sentidoColor(classifySentido(v.sentido))}
                    icon={SENTIDO_META[classifySentido(v.sentido)].icon}
                    last={i === filtered.length - 1}
                    colors={colors}
                  />
                ))}
              </View>
            </>
          )}

          {/* Official link */}
          {!!data.appURL && (
            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: colors.primary }]}
              onPress={() => Linking.openURL(data.appURL!)}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.linkText, { color: colors.primaryForeground }]}>Ver ficha oficial</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function FilterChip({ label, active, color, onPress, colors }: {
  label: string; active: boolean; color: string; onPress: () => void; colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, {
        backgroundColor: active ? color + "1A" : colors.card,
        borderColor: active ? color : colors.border,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color: active ? color : colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function VoteRow({ voto, color, icon, last, colors }: {
  voto: VotacionVotosItem; sentido: Sentido; color: string; icon: string; last: boolean; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.voteRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={[styles.voteIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.voteName, { color: colors.foreground }]} numberOfLines={1}>{voto.legislador}</Text>
        {!!voto.partido && (
          <Text style={[styles.votePartido, { color: colors.mutedForeground }]} numberOfLines={1}>{voto.partido}</Text>
        )}
      </View>
      <Badge label={voto.sentido} variant="muted" size="sm" />
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
  numRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  resultBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  resultText: { fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold", lineHeight: 26 },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  total: { alignItems: "center", gap: 3, flex: 1 },
  totalValue: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  totalLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  voteRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  voteIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  voteName: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  votePartido: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  linkText: { fontSize: 15, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
});
