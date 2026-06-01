import * as React from "react";
import {
  Feather as VectorFeather,
  Ionicons as VectorIonicons,
} from "@expo/vector-icons";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  CloudDownload,
  ExternalLink,
  File,
  FileText,
  Funnel,
  Globe,
  House,
  Info,
  Languages,
  Layers,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Monitor,
  Newspaper,
  Radio,
  Scale,
  Search,
  Send,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Tv,
  Type,
  UserMinus,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react-native";

// Icon fonts (Ionicons/Feather via @expo/vector-icons) render as tofu boxes on
// Android under Expo SDK 54 + New Architecture: runtime-registered glyph fonts
// are not picked up by the native font manager (Expo issue #351). SVG icons
// (react-native-svg) draw as vector paths with no font registration, so they
// render reliably everywhere. We keep the original `<Ionicons name=... />` API
// and map each Ionicons/Feather name to a lucide SVG component.

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}>;

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const IONICON_MAP: Record<string, IconComponent> = {
  home: House,
  "home-outline": House,
  people: Users,
  "people-outline": Users,
  person: UserRound,
  "person-outline": UserRound,
  "person-remove-outline": UserMinus,
  tv: Tv,
  "tv-outline": Tv,
  "document-text": FileText,
  "document-text-outline": FileText,
  document: File,
  "document-outline": File,
  grid: LayoutGrid,
  "grid-outline": LayoutGrid,
  briefcase: Briefcase,
  "briefcase-outline": Briefcase,
  business: Building2,
  "business-outline": Building2,
  calendar: Calendar,
  "calendar-outline": Calendar,
  "checkmark-circle": CircleCheck,
  "checkmark-circle-outline": CircleCheck,
  "close-circle": CircleX,
  "chevron-back": ChevronLeft,
  "chevron-forward": ChevronRight,
  "alert-circle": CircleAlert,
  "alert-circle-outline": CircleAlert,
  "filter-outline": Funnel,
  "options-outline": Funnel,
  "globe-outline": Globe,
  "information-circle-outline": Info,
  "language-outline": Languages,
  "layers-outline": Layers,
  "list-outline": List,
  "location-outline": MapPin,
  "logo-youtube": Video,
  "mail-outline": Mail,
  "newspaper-outline": Newspaper,
  "open-outline": ExternalLink,
  radio: Radio,
  "radio-outline": Radio,
  "search-outline": Search,
  send: Send,
  sparkles: Sparkles,
  "sparkles-outline": Sparkles,
  "stats-chart": ChartColumn,
  "stats-chart-outline": ChartColumn,
  "text-outline": Type,
  "time-outline": Clock,
  videocam: Video,
  "videocam-outline": Video,
  "thumbs-up-outline": ThumbsUp,
  "thumbs-down-outline": ThumbsDown,
  "remove-circle-outline": CircleMinus,
  ribbon: Award,
  "ribbon-outline": Award,
  scale: Scale,
  "scale-outline": Scale,
  "settings-outline": Settings,
  "cloud-download-outline": CloudDownload,
  "desktop-outline": Monitor,
};

const FEATHER_MAP: Record<string, IconComponent> = {
  "alert-circle": CircleAlert,
  x: X,
};

function buildIconSet<G extends Record<string, string | number>>(
  map: Record<string, IconComponent>,
  fallback: IconComponent,
  glyphMap: G,
) {
  function Icon({ name, size = 24, color = "#000000", style }: IconProps) {
    const Mapped = map[name];
    if (__DEV__ && !Mapped) {
      console.warn(`[Icon] Unmapped icon name "${name}" — rendering fallback.`);
    }
    const Cmp = Mapped ?? fallback;
    return <Cmp size={size} color={color} style={style} />;
  }
  return Object.assign(Icon, { glyphMap });
}

export const Ionicons = buildIconSet(
  IONICON_MAP,
  CircleAlert,
  VectorIonicons.glyphMap,
);

export const Feather = buildIconSet(
  FEATHER_MAP,
  CircleAlert,
  VectorFeather.glyphMap,
);
