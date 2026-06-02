import * as React from "react";
import {
  Feather as VectorFeather,
  Ionicons as VectorIonicons,
} from "@expo/vector-icons";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Path as SvgPath } from "react-native-svg";
import {
  ArrowRight,
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

// lucide-react-native dropped brand glyphs, so brand icons (social networks) are
// drawn here directly from their official SVG paths via react-native-svg.
function makeBrandIcon(path: string): IconComponent {
  const Brand: IconComponent = ({ size = 24, color = "#000", style }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <SvgPath d={path} fill={color} />
    </Svg>
  );
  return Brand;
}

const FacebookBrand = makeBrandIcon(
  "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
);
const InstagramBrand = makeBrandIcon(
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
);
const TwitterBrand = makeBrandIcon(
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
);
const YoutubeBrand = makeBrandIcon(
  "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
);

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
  "arrow-forward": ArrowRight,
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
  "logo-youtube": YoutubeBrand,
  "logo-facebook": FacebookBrand,
  "logo-instagram": InstagramBrand,
  "logo-twitter": TwitterBrand,
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
