import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import type { Legislador } from "@workspace/api-client-react";

interface DeputyCardProps {
  deputy: Legislador;
  onPress: () => void;
  compact?: boolean;
}

const PARTY_COLORS: Record<string, string> = {
  ANR: "#C8102E",
  PLRA: "#1E3A8A",
  PPS: "#0891B2",
  PPQ: "#0D9488",
  PEN: "#7C3AED",
};

/** Map a (possibly full) party name to a canonical short key. */
function partyKey(partido: string): string {
  const p = partido.toUpperCase();
  if (p.includes("REPUBLICANA") || p.includes("COLORADO") || /\bANR\b/.test(p)) return "ANR";
  if (p.includes("LIBERAL") || /\bPLRA\b/.test(p)) return "PLRA";
  if (p.includes("PAÍS SOLIDARIO") || p.includes("PAIS SOLIDARIO") || /\bPPS\b/.test(p)) return "PPS";
  if (p.includes("PATRIA QUERIDA") || /\bPPQ\b/.test(p)) return "PPQ";
  if (p.includes("ENCUENTRO NACIONAL") || /\bPEN\b/.test(p)) return "PEN";
  return "";
}

function getPartyColor(partido: string): string {
  return PARTY_COLORS[partyKey(partido)] ?? "#6B7280";
}

function toTitle(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase());
}

/** A compact label for chips/badges: trailing acronym when present, else title-cased. */
function getPartyShort(partido: string): string {
  const key = partyKey(partido);
  if (key) return key;
  const words = partido.trim().split(/\s+/);
  const last = words[words.length - 1];
  if (words.length > 1 && /^[A-ZÁÉÍÓÚÑ]{2,6}$/.test(last)) return last;
  return toTitle(partido);
}

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export function DeputyCard({ deputy, onPress, compact = false }: DeputyCardProps) {
  const colors = useColors();
  const partyColor = getPartyColor(deputy.partido);
  const [imgError, setImgError] = useState(false);
  const showPhoto = !!deputy.foto && !imgError;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: partyColor + "18", borderColor: partyColor + "33" }]}>
        <Text style={[styles.initials, { color: partyColor }]}>
          {getInitials(deputy.nombre, deputy.apellido)}
        </Text>
        {showPhoto && (
          <Image
            source={{ uri: deputy.foto! }}
            style={styles.avatarImg}
            onError={() => setImgError(true)}
          />
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {deputy.nombre} {deputy.apellido}
        </Text>
        <Text style={[styles.party, { color: partyColor }]} numberOfLines={1}>
          {deputy.partido}
        </Text>
        {!compact && (
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{deputy.departamento}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export { getPartyColor, getPartyShort };

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  avatarImg: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  initials: {
    fontSize: 16,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  info: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  party: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Inter_500Medium",
    fontWeight: "500" as const,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
