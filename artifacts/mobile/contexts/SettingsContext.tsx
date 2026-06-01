import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type FontSizeOption = "small" | "medium" | "large";

interface Settings {
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  fontScale: number;
}

const FONT_SCALES: Record<FontSizeOption, number> = {
  small: 0.88,
  medium: 1.0,
  large: 1.18,
};

const STORAGE_KEY = "@diputados_settings";

const SettingsContext = createContext<Settings>({
  fontSize: "medium",
  setFontSize: () => {},
  fontScale: 1.0,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>("medium");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          const saved = JSON.parse(val) as Partial<{ fontSize: FontSizeOption }>;
          if (saved.fontSize && saved.fontSize in FONT_SCALES) {
            setFontSizeState(saved.fontSize);
          }
        } catch {}
      }
    });
  }, []);

  const setFontSize = (size: FontSizeOption) => {
    setFontSizeState(size);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize: size }));
  };

  return (
    <SettingsContext.Provider
      value={{ fontSize, setFontSize, fontScale: FONT_SCALES[fontSize] }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
