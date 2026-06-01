import React, { useState, useMemo } from "react";
import {
  FlatList, Platform, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetLegisladores } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { SearchBar } from "@/components/ui/SearchBar";
import { DeputyCard } from "@/components/deputy/DeputyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonCard";

const PARTIES = ["Todos", "ANR", "PLRA", "Frente Guasú", "Honor Colorado", "Patria Querida"];
const DEPARTMENTS = ["Todos", "Asunción", "Central", "Alto Paraná", "Itapúa", "Caaguazú", "San Pedro", "Cordillera", "Concepción", "Amambay", "Guairá", "Misiones", "Paraguarí", "Canindeyú", "Caazapá", "Alto Paraguay"];

export default function DeputiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedParty, setSelectedParty] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDept, setSelectedDept] = useState("Todos");

  const { data, isLoading, error, refetch } = useGetLegisladores(
    { limit: 80 },
    { query: { queryKey: ["legisladores"] } }
  );

  const filtered = useMemo(() => {
    let list = data?.data ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.nombre.toLowerCase().includes(q) ||
        l.apellido.toLowerCase().includes(q) ||
        l.partido.toLowerCase().includes(q) ||
        l.departamento.toLowerCase().includes(q)
      );
    }
    if (selectedParty !== "Todos") list = list.filter(l => l.partido === selectedParty);
    if (selectedDept !== "Todos") list = list.filter(l => l.departamento === selectedDept);
    return list;
  }, [data, search, selectedParty, selectedDept]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Diputados</Text>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: showFilters ? colors.primary : colors.card, borderColor: colors.border }]}
            onPress={() => setShowFilters(v => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={18} color={showFilters ? "#FFF" : colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar diputado, partido..." />
        </View>
        {showFilters && (
          <View style={styles.filtersBlock}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Partido</Text>
            <FlatList
              data={PARTIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chip, {
                    backgroundColor: selectedParty === item ? colors.primary : colors.card,
                    borderColor: selectedParty === item ? colors.primary : colors.border,
                  }]}
                  onPress={() => setSelectedParty(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: selectedParty === item ? "#FFF" : colors.foreground }]}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            />
          </View>
        )}
        {data && (
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered.length} diputado{filtered.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.listContent}>
          <SkeletonList count={8} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title="Error al cargar" subtitle="No se pudo obtener la lista de diputados." actionLabel="Reintentar" onAction={refetch} />
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
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState icon="person-outline" title="Sin resultados" subtitle="No se encontraron diputados con los filtros aplicados." actionLabel="Limpiar filtros" onAction={() => { setSearch(""); setSelectedParty("Todos"); setSelectedDept("Todos"); }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchWrap: { marginBottom: 8 },
  filtersBlock: { marginBottom: 8, gap: 4 },
  filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" as const, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  count: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 100 },
});
