import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View, ImageBackground,
  Linking, Platform, type NativeSyntheticEvent, type NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import type { Noticia } from "@workspace/api-client-react";

interface NewsCarouselProps {
  noticias: Noticia[];
}

function formatFecha(raw: string): string {
  const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" });
}

export function NewsCarousel({ noticias }: NewsCarouselProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const listRef = useRef<FlatList<Noticia>>(null);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const raw = Math.round(e.nativeEvent.contentOffset.x / width);
    const idx = Math.max(0, Math.min(raw, noticias.length - 1));
    setActive(idx);
  }, [width, noticias.length]);

  // Gentle auto-advance (paused implicitly while the user swipes a new index in).
  useEffect(() => {
    if (width <= 0 || noticias.length <= 1) return;
    const t = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % noticias.length;
        listRef.current?.scrollToOffset({ offset: next * width, animated: true });
        return next;
      });
    }, 5500);
    return () => clearInterval(t);
  }, [width, noticias.length]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          ref={listRef}
          data={noticias}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(n) => n.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={width}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.slide, { width }]}
              activeOpacity={0.9}
              onPress={() => Linking.openURL(item.url)}
            >
              <ImageBackground
                source={item.imagen ? { uri: item.imagen } : require("../../assets/images/header-building.png")}
                style={styles.bg}
                imageStyle={styles.bgImage}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={["rgba(0,14,42,0.05)", "rgba(0,14,42,0.55)", "rgba(0,14,42,0.95)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.scrim}
                >
                  <View style={styles.eyebrowRow}>
                    <View style={styles.eyebrowPill}>
                      <Ionicons name="newspaper-outline" size={11} color="#FFFFFF" />
                      <Text style={styles.eyebrowText}>NOTICIAS OFICIALES</Text>
                    </View>
                    {!!item.fecha && (
                      <Text style={styles.fecha}>{formatFecha(item.fecha)}</Text>
                    )}
                  </View>
                  <Text style={styles.title} numberOfLines={3}>{item.titulo}</Text>
                  {!!item.resumen && (
                    <Text style={styles.resumen} numberOfLines={2}>{item.resumen}</Text>
                  )}
                  <View style={styles.readRow}>
                    <Text style={styles.readText}>Leer más</Text>
                    <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          )}
        />
      )}
      <View style={styles.dots}>
        {noticias.map((n, i) => (
          <View
            key={n.id}
            style={[styles.dot, {
              backgroundColor: i === active ? colors.primary : colors.border,
              width: i === active ? 18 : 6,
            }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { borderRadius: 18, overflow: "hidden" },
  bg: { width: "100%", height: 230, justifyContent: "flex-end" },
  bgImage: { borderRadius: 18 },
  scrim: { flex: 1, justifyContent: "flex-end", padding: 16, gap: 7 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrowPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,43,127,0.85)",
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100,
  },
  eyebrowText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" as const, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  fecha: {
    color: "rgba(255,255,255,0.92)", fontSize: 11, fontFamily: "Inter_500Medium", fontWeight: "500" as const,
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  title: {
    color: "#FFFFFF", fontSize: 17, fontWeight: "700" as const, fontFamily: "Inter_700Bold", lineHeight: 23,
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  resumen: {
    color: "rgba(255,255,255,0.88)", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  readRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  readText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 12 },
  dot: { height: 6, borderRadius: 3, ...(Platform.OS === "web" ? { transitionProperty: "width" } as object : {}) },
});
