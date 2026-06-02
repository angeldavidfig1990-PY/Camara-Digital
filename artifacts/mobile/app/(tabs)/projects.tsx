import React, { useState, useMemo } from "react";
import {
  FlatList, Platform, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProyectos } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { SearchBar } from "@/components/ui/SearchBar";
import { ProjectCard } from "@/components/project/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonCard";

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, error, refetch } = useGetProyectos(
    { limit: 50 },
    { query: { queryKey: ["proyectos"] } }
  );

  const tipos = useMemo(() => {
    const set = new Set((data?.data ?? []).map(p => p.tipo).filter(Boolean));
    return ["Todos", ...Array.from(set).sort((a, b) => a.localeCompare(b, "es"))];
  }, [data]);

  const filtered = useMemo(() => {
    let list = data?.data ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.titulo.toLowerCase().includes(q) ||
        p.numero.includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      );
    }
    if (selectedTipo !== "Todos") list = list.filter(p => p.tipo === selectedTipo);
    return list;
  }, [data, search, selectedTipo]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Proyectos</Text>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: showFilters ? colors.primary : colors.card, borderColor: colors.border }]}
            onPress={() => setShowFilters(v => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="filter-outline" size={18} color={showFilters ? "#FFF" : colors.foreground} />
          </TouchableOpacity>
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar proyecto, número..." />

        {showFilters && (
          <View style={styles.filtersBlock}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Tipo de proyecto</Text>
            <FlatList
              data={tipos}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chip, {
                    backgroundColor: selectedTipo === item ? colors.primary : colors.card,
                    borderColor: selectedTipo === item ? colors.primary : colors.border,
                  }]}
                  onPress={() => setSelectedTipo(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: selectedTipo === item ? "#FFF" : colors.foreground }]}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            />
          </View>
        )}

        {data && (
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered.length} proyecto{filtered.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          <SkeletonList count={5} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title="Error" subtitle="No se pudieron cargar los proyectos." actionLabel="Reintentar" onAction={refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.numero}
          renderItem={({ item }) => (
            <ProjectCard project={item} onPress={() => router.push(`/project/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState icon="document-text-outline" title="Sin resultados" subtitle="No se encontraron proyectos con esos criterios." actionLabel="Limpiar filtros" onAction={() => { setSearch(""); setSelectedTipo("Todos"); }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 28, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  filterBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  filtersBlock: { gap: 4 },
  filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  count: { fontSize: 13, fontFamily: "Inter_400Regular" },
  listContent: { padding: 16, paddingBottom: 100 },
});
