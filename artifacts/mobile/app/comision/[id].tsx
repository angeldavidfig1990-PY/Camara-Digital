import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetComisionById } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ComisionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, error } = useGetComisionById(id ?? "", {
    query: { queryKey: ["comision", id], enabled: !!id },
  });

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
          <SkeletonList count={3} />
        </ScrollView>
      ) : error || !data ? (
        <EmptyState icon="briefcase-outline" title="Comisión no encontrada" actionLabel="Volver" onAction={() => router.back()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPad + 56, paddingBottom: Platform.OS === "web" ? 100 : 60 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.headerCard, { backgroundColor: "#7C3AED12", borderColor: "#7C3AED30" }]}>
            <View style={[styles.headerIcon, { backgroundColor: "#7C3AED18" }]}>
              <Ionicons name="briefcase" size={28} color="#7C3AED" />
            </View>
            <Text style={[styles.comisionName, { color: colors.foreground }]}>{data.nombre}</Text>
            <Text style={[styles.comisionType, { color: colors.mutedForeground }]}>{data.tipo} · {data.camara}</Text>
          </View>

          {/* Authorities */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Autoridades</Text>
            {data.presidente && (
              <View style={styles.authorityRow}>
                <View style={[styles.authorityBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[styles.authorityTitle, { color: colors.primary }]}>Presidente</Text>
                </View>
                <Text style={[styles.authorityName, { color: colors.foreground }]}>{data.presidente}</Text>
              </View>
            )}
            {data.vicepresidente && (
              <View style={[styles.authorityRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[styles.authorityBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.authorityTitle, { color: colors.mutedForeground }]}>Vicepresidente</Text>
                </View>
                <Text style={[styles.authorityName, { color: colors.foreground }]}>{data.vicepresidente}</Text>
              </View>
            )}
          </View>

          {/* Members */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Miembros ({data.miembros.length})
              </Text>
            </View>
            {data.miembros.map((member, i) => (
              <View key={i} style={[styles.memberRow, { borderTopColor: i > 0 ? colors.border : "transparent" }]}>
                <View style={[styles.memberAvatar, { backgroundColor: "#7C3AED18" }]}>
                  <Text style={[styles.memberInitial, { color: "#7C3AED" }]}>{member.charAt(0)}</Text>
                </View>
                <Text style={[styles.memberName, { color: colors.foreground }]}>{member}</Text>
              </View>
            ))}
          </View>

          {/* Contact */}
          {data.email && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contacto Institucional</Text>
              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: colors.primary + "12" }]}
                onPress={() => Linking.openURL(`mailto:${data.email}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={18} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.primary }]}>{data.email}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Full Commission List Link */}
          <TouchableOpacity
            style={[styles.linkBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={() => Linking.openURL("https://www.diputados.gov.py/comisiones/comisiones-permanentes")}
            activeOpacity={0.8}
          >
            <Ionicons name="globe-outline" size={16} color={colors.primary} />
            <Text style={[styles.linkBtnText, { color: colors.primary }]}>Ver todas las comisiones oficiales</Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
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
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  content: { padding: 16, gap: 12 },
  headerCard: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: "center", gap: 10 },
  headerIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  comisionName: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold", textAlign: "center" },
  comisionType: { fontSize: 14, fontFamily: "Inter_400Regular" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  authorityRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8 },
  authorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  authorityTitle: { fontSize: 11, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  authorityName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  memberInitial: { fontSize: 14, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  memberName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  contactBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10 },
  contactText: { fontSize: 14, fontFamily: "Inter_500Medium", fontWeight: "500" as const },
  linkBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  linkBtnText: { fontSize: 14, fontWeight: "500" as const, fontFamily: "Inter_500Medium" },
});
