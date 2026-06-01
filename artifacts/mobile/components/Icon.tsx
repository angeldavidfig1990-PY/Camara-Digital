import {
  createIconSet,
  Feather as VectorFeather,
  Ionicons as VectorIonicons,
} from "@expo/vector-icons";

// On Android, Expo Go pre-registers the stock "Ionicons"/"Feather" font
// families inside its own binary. A runtime font registered under the same
// family name is silently ignored by the native font manager, so the bundled
// glyphs (which may not match our @expo/vector-icons glyph map) render as
// tofu boxes. Registering under unique family names sidesteps the collision
// so our own font files are actually used.
export const IONICONS_FONT_FAMILY = "AppIonicons";
export const FEATHER_FONT_FAMILY = "AppFeather";

export const Ionicons = createIconSet(
  VectorIonicons.glyphMap,
  IONICONS_FONT_FAMILY,
  "Ionicons.ttf",
);

export const Feather = createIconSet(
  VectorFeather.glyphMap,
  FEATHER_FONT_FAMILY,
  "Feather.ttf",
);
