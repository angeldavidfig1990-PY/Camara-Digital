import React from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  Platform, Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetLegisladorById } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPartyColor } from "@/components/deputy/DeputyCard";

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export default function DeputyDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useGetLegisladorById(id ?? "", {
    query: { queryKey: ["legislador", id], enabled: !!id },
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const partyColor = data ? getPartyColor(data.partido) : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
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
        <EmptyState icon="person-outline" title="Diputado no encontrado" subtitle="No se pudo cargar la información." actionLabel="Volver" onAction={() => router.back()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPad + 56, paddingBottom: Platform.OS === "web" ? 100 : 60 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: partyColor + "20" }]}>
              <Text style={[styles.initials, { color: partyColor }]}>
                {getInitials(data.nombre, data.apellido)}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {data.cargo} {data.nombre} {data.apellido}
            </Text>
            <View style={styles.badges}>
              <Badge label={data.partido} variant="default" />
              <Badge label={data.departamento} variant="muted" />
            </View>
            <Text style={[styles.periodo, { color: colors.mutedForeground }]}>
              Período {data.periodo}
            </Text>
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            {[
              { icon: "people-outline", label: "Bancada", value: data.bancada },
              { icon: "location-outline", label: "Departamento", value: data.departamento },
              { icon: "briefcase-outline", label: "Cargo", value: data.cargo },
              { icon: "calendar-outline", label: "Período", value: data.periodo },
            ].map((item, i) => (
              <View key={i} style={[styles.infoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Bio */}
          {data.bio && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Biografía</Text>
              <Text style={[styles.bioText, { color: colors.mutedForeground }]}>{data.bio}</Text>
            </View>
          )}

          {/* Comisiones */}
          {data.comisiones && data.comisiones.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Comisiones</Text>
              {data.comisiones.map((com, i) => (
                <View key={i} style={[styles.comisionRow, { borderTopColor: i > 0 ? colors.border : "transparent" }]}>
                  <View style={[styles.comisionDot, { backgroundColor: partyColor }]} />
                  <Text style={[styles.comisionText, { color: colors.foreground }]}>{com}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Contact */}
          {data.email && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contacto</Text>
              <TouchableOpacity
                style={[styles.contactRow, { backgroundColor: colors.primary + "12" }]}
                onPress={() => Linking.openURL(`mailto:${data.email}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={18} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.primary }]}>{data.email}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Party Stats */}
          <View style={[styles.section, { backgroundColor: partyColor + "10", borderColor: partyColor + "30" }]}>
            <View style={styles.partyHeader}>
              <View style={[styles.partyDot, { backgroundColor: partyColor }]} />
              <Text style={[styles.sectionTitle, { color: partyColor }]}>{data.partido}</Text>
            </View>
            <Text style={[styles.bancadaText, { color: colors.mutedForeground }]}>
              Bancada: {data.bancada}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: "absolute", left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  content: { padding: 16, gap: 12 },
  profileCard: {
    borderRadius: 20, borderWidth: 1, padding: 24,
    alignItems: "center", gap: 8,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  initials: { fontSize: 28, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  name: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold", textAlign: "center" },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  periodo: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoItem: {
    width: "47%", flexGrow: 1,
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 6,
  },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  bioText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  comisionRow: {
    flexDirection: "row", alignItems: "center",
    gap: 10, paddingTop: 10, borderTopWidth: 1,
  },
  comisionDot: { width: 8, height: 8, borderRadius: 4 },
  comisionText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  contactRow: {
    flexDirection: "row", alignItems: "center",
    gap: 10, padding: 12, borderRadius: 10,
  },
  contactText: { fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  partyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  partyDot: { width: 12, height: 12, borderRadius: 6 },
  bancadaText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
