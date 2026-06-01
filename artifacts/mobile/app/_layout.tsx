import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import StockIonicons from "@expo/vector-icons/Ionicons";
import {
  FEATHER_FONT_FAMILY,
  IONICONS_FONT_FAMILY,
  Ionicons,
} from "@/components/Icon";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { setBaseUrl } from "@workspace/api-client-react";

// Point the generated API client to our backend proxy
const REPL_DOMAIN =
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_DOMAIN : undefined;
setBaseUrl(REPL_DOMAIN ? `https://${REPL_DOMAIN}` : "");

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="deputy/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="project/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="session/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="comisiones"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="comision/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="ai-assistant"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="votaciones"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="configuracion"
        options={{ headerShown: false, presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    [IONICONS_FONT_FAMILY]: require("../assets/fonts/Ionicons.ttf"),
    [FEATHER_FONT_FAMILY]: require("../assets/fonts/Feather.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SettingsProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
                {__DEV__ ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 44,
                      left: 8,
                      right: 8,
                      zIndex: 99999,
                      backgroundColor: "rgba(0,0,0,0.92)",
                      padding: 8,
                      borderRadius: 8,
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: "#FFD400", fontSize: 13, fontWeight: "700" }}>
                      DIAG v4 · OS:{Platform.OS} loaded:{String(fontsLoaded)} err:
                      {fontError ? String(fontError.message ?? fontError) : "none"}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                      <Text style={{ color: "#fff", fontSize: 11, width: 110 }}>
                        stock (ExpoGo):
                      </Text>
                      <StockIonicons name="home" size={26} color="#fff" />
                      <Text style={{ color: "#fff", fontFamily: "ionicons", fontSize: 26 }}>
                        {String.fromCodePoint(Number(Ionicons.glyphMap.home))}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                      <Text style={{ color: "#fff", fontSize: 11, width: 110 }}>
                        custom (runtime):
                      </Text>
                      <Ionicons name="home" size={26} color="#fff" />
                      <Text style={{ color: "#fff", fontFamily: IONICONS_FONT_FAMILY, fontSize: 26 }}>
                        {String.fromCodePoint(Number(Ionicons.glyphMap.home))}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
