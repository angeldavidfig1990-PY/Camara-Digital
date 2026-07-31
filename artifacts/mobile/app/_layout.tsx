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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { setBaseUrl } from "@workspace/api-client-react";

// Initialize i18n immediately
import "@/i18n";

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
        name="votacion/[id]"
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
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
