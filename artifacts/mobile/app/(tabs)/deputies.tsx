import React, { useState, useMemo } from "react";
import {
  FlatList, Platform, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SearchBar } from "@/components/ui/SearchBar";
import { DeputyCard, getPartyShort } from "@/components/deputy/DeputyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { useTranslation } from "react-i18next";

interface ChipRowProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  labelFn?: (value: string) => string;
}

function ChipRow({ options, selected, onSelect, labelFn }: ChipRowProps) {
  const colors = useColors();
  return (
    <FlatList
      data={options}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={i => i}
      renderItem={({ item }) => {
        const active = selected === item;
        return (
          <TouchableOpacity
            style={[styles.chip, {
              backgroundColor: active ? colors.primary : colors.card,
              borderColor: active ? colors.primary : colors.border,
            }]}
            onPress={() => onSelect(item)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, { color: active ? "#FFF" : colors.foreground }]}>
              {labelFn ? labelFn(item) : item}
            </Text>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    />
  );
}

export default function DeputiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedParty, setSelectedParty] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDept, setSelectedDept] = useState("Todos");

  // Estados locales para el fetch nativo
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const cargarLegisladores = React.useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.146:3000";
    try {
      setIsLoading(true);
      setError(false);
      const res = await fetch(`${baseUrl}/api/legislative/legisladores`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Error cargando legisladores:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargarLegisladores();
  }, [cargarLegisladores]);

  const parties = useMemo(() => {
    const set = new Set((data?.data ?? []).map((l: any) => l.partido).filter(Boolean));
    return ["Todos", ...Array.from(set).sort((a: any, b: any) => a.localeCompare(b, "es"))];
  }, [data]);

  const departments = useMemo(() => {
    const set = new Set((data?.data ?? []).map((l: any) => l.departamento).filter(Boolean));
    return ["Todos", ...Array.from(set).sort((a: any, b: any) => a.localeCompare(b, "es"))];
  }, [data]);

  const filtered = useMemo(() => {
    let list = data?.data ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l: any) =>
        l.nombre.toLowerCase().includes(q) ||
        l.apellido.toLowerCase().includes(q) ||
        l.partido.toLowerCase().includes(q) ||
        l.departamento.toLowerCase().includes(q)
      );
    }
    if (selectedParty !== "Todos") list = list.filter((l: any) => l.partido === selectedParty);
    if (selectedDept !== "Todos") list = list.filter((l: any) => l.departamento === selectedDept);
    return list;
  }, [data, search, selectedParty, selectedDept]);

  const activeFilters = (selectedParty !== "Todos" ? 1 : 0) + (selectedDept !== "Todos" ? 1 : 0);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("deputies.title")}</Text>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: showFilters ? colors.primary : colors.card, borderColor: colors.border }]}
            onPress={() => setShowFilters(v => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={18} color={showFilters ? "#FFF" : colors.foreground} />
            {activeFilters > 0 && (
              <View style={[styles.filterDot, { backgroundColor: colors.accent ?? "#C8102E", borderColor: colors.background }]}>
                <Text style={styles.filterDotText}>{activeFilters}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t("deputies.searchPlaceholder")} />
        </View>
        {showFilters && (
          <View style={styles.filtersBlock}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>{t("deputies.filterParty")}</Text>
            <ChipRow
              options={parties}
              selected={selectedParty}
              onSelect={setSelectedParty}
              labelFn={(v) => (v === "Todos" ? v : getPartyShort(v))}
            />
            <Text style={[styles.filterLabel, { color: colors.mutedForeground, marginTop: 8 }]}>{t("deputies.filterDepartment")}</Text>
            <ChipRow
              options={departments}
              selected={selectedDept}
              onSelect={setSelectedDept}
            />
            {activeFilters > 0 && (
              <TouchableOpacity
                style={styles.clearRow}
                onPress={() => { setSelectedParty("Todos"); setSelectedDept("Todos"); }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={14} color={colors.mutedForeground} />
                <Text style={[styles.clearText, { color: colors.mutedForeground }]}>{t("deputies.clearFilters")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.listContent}>
          <SkeletonList count={8} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={t("common.error")} subtitle={t("deputies.notFound")} actionLabel={t("common.retry")} onAction={cargarLegisladores} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <DeputyCard deputy={item} onPress={() => router.push(`/deputy/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          onRefresh={cargarLegisladores}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState icon="person-outline" title={t("common.noResults")} subtitle="No se encontraron diputados con los filtros aplicados." actionLabel={t("deputies.clearFilters")} onAction={() => { setSearch(""); setSelectedParty("Todos"); setSelectedDept("Todos"); }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  filterBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  searchWrap: { marginBottom: 8 },
  filtersBlock: { marginBottom: 8, gap: 4 },
  filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" as const, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  count: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 100 },
  filterDot: { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  filterDotText: { color: "#FFF", fontSize: 10, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  clearRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, alignSelf: "flex-start" },
  clearText: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
});