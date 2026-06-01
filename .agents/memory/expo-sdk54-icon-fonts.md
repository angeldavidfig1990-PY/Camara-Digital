---
name: Expo SDK 54 icon fonts render as tofu on Android
description: Why icon FONTS (Ionicons/Feather) show boxes on Android under New Architecture, and the SVG fix
---

# Symptom
On Android (Expo Go, both physical device and simulator), ALL icon-font glyphs
(@expo/vector-icons Ionicons/Feather) render as tofu/boxes, while web renders fine.
Text (Inter) looks fine because it silently falls back to Roboto; icon glyphs live in
the PUA range with no fallback, so they show boxes.

# Root cause
Expo SDK 54 + New Architecture (Fabric) on Android does not reliably register
runtime-loaded glyph fonts with the native font manager (Expo issue #351). Confirmed
on-device: even Expo Go's STOCK pre-bundled Ionicons render as boxes. So it is NOT a
download failure (the .ttf serves fine through the Replit proxy) nor a glyphMap↔ttf
version mismatch — it is the runtime font-registration path itself.

# Fix (durable decision)
Do NOT depend on icon fonts in this app. Use SVG icons instead — `lucide-react-native`
on top of `react-native-svg` (which is in the Expo Go runtime). SVGs draw as vector
paths with zero font registration, so they render identically on web + native.

`components/Icon.tsx` keeps the original `<Ionicons name="..."/>` / `<Feather .../>`
API but maps each Ionicons/Feather name → a lucide component, so the ~20 call sites
stay unchanged. `.glyphMap` is re-attached from @expo/vector-icons so existing
`keyof typeof Ionicons.glyphMap` typings keep working.

**Why:** keeps a huge refactor to a single wrapper file and survives the SDK-54 bug.
**How to apply:** when adding an icon, add its name→lucide-component entry in Icon.tsx.
A `__DEV__` console.warn fires for any unmapped name (renders CircleAlert fallback).

# Gotchas
- lucide-react-native v1.x dropped old aliases: Home→House, XCircle→CircleX,
  AlertCircle→CircleAlert, CheckCircle2→CircleCheck, Filter→Funnel, BarChart3→ChartColumn,
  MinusCircle→CircleMinus, DownloadCloud→CloudDownload. Verify export names before using.
- lucide style prop expects ViewStyle (not TextStyle); glyphMap values are `string|number`.
