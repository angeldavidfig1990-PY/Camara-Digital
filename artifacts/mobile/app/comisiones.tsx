import React, { useState } from "react";
import {
  FlatList, Platform, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetComisiones } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { SearchBar } from "@/components/ui/SearchBar";

export default function ComisionesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, error, refetch } = useGetComisiones({
    query: { queryKey: ["comisiones"] },
  });

  const filtered = React.useMemo(() => {
    if (!search) return data?.data ?? [];
    const q = search.toLowerCase();
    return (data?.data ?? []).filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.presidente?.toLowerCase().includes(q) ||
      c.miembros.some(m => m.toLowerCase().includes(q))
    );
  }, [data, search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Comisiones</Text>
          <View style={{ width: 24 }} />
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar comisión..." />
        {data && (
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered.length} comisión{filtered.length !== 1 ? "es" : ""} permanente{filtered.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.listContent}><SkeletonList count={6} /></View>
      ) : error ? (
        <EmptyState icon="briefcase-outline" title="Error al cargar" subtitle="No se pudieron obtener las comisiones." actionLabel="Reintentar" onAction={refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/comision/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#7C3AED18" }]}>
                <Ionicons name="briefcase-outline" size={20} color="#7C3AED" />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.nombre}</Text>
                <Text style={[styles.type, { color: colors.mutedForeground }]}>{item.tipo}</Text>
                {item.presidente && (
                  <View style={styles.presRow}>
                    <Ionicons name="person-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.pres, { color: colors.mutedForeground }]} numberOfLines={1}>
                      Pdte: {item.presidente}
                    </Text>
                  </View>
                )}
                <Text style={[styles.members, { color: colors.mutedForeground }]}>
                  {item.miembros.length} miembro{item.miembros.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState icon="briefcase-outline" title="Sin resultados" subtitle="No se encontraron comisiones con esa búsqueda." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  count: { fontSize: 13, fontFamily: "Inter_400Regular" },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  type: { fontSize: 12, fontFamily: "Inter_400Regular" },
  presRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  pres: { fontSize: 12, fontFamily: "Inter_400Regular" },
  members: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
