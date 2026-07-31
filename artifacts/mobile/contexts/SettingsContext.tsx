import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { i18n } from "@/i18n";

export type FontSizeOption = "small" | "medium" | "large";
export type LanguageOption = "es" | "en" | "gn";

interface Settings {
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  fontScale: number;
  language: LanguageOption;
  setLanguage: (lang: LanguageOption) => void;
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
  language: "es",
  setLanguage: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>("medium");
  const [language, setLanguageState] = useState<LanguageOption>("es");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          const saved = JSON.parse(val) as Partial<{ fontSize: FontSizeOption; language: LanguageOption }>;
          if (saved.fontSize && saved.fontSize in FONT_SCALES) {
            setFontSizeState(saved.fontSize);
          }
          if (saved.language && ["es", "en", "gn"].includes(saved.language)) {
            setLanguageState(saved.language);
            i18n.changeLanguage(saved.language);
          }
        } catch {}
      }
    });
  }, []);

  const setFontSize = (size: FontSizeOption) => {
    setFontSizeState(size);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize: size, language }));
  };

  const setLanguage = (lang: LanguageOption) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize, language: lang }));
  };

  return (
    <SettingsContext.Provider
      value={{ fontSize, setFontSize, fontScale: FONT_SCALES[fontSize], language, setLanguage }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
