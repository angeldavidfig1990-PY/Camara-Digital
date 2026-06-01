// ── Congress Open Data API v2 client (live proxy + per-resource TTL cache) ─────
//
// Source of truth: "API Datos Abiertos Legislativos v2.0"
//   base: https://datosv2.congreso.gov.py/web/api
//   envelope: { codigoEstado, mensaje, datos: [...] }
//   dates: "DD/MM/YYYY"
//
// Architecture: NO database, NO background sync. Each request reads from an
// in-memory TTL cache; on a miss it fetches live and refreshes the cache. If a
// live fetch fails but a (stale) cache entry exists, the stale value is served
// so the UI keeps working; if there is no cache at all the error propagates so
// failures are explicit (never fabricated/mock data).

const BASE = "https://datosv2.congreso.gov.py/web/api";

// Fallback to the 2025-2026 parliamentary period if /periodo lookup fails.
const FALLBACK_PERIODO_ID = 100257;

// ── TTL cache + freshness registry ─────────────────────────────────────────────

export const TTL = {
  legisladores: 24 * 60 * 60 * 1000,
  comisiones: 24 * 60 * 60 * 1000,
  sesiones: 15 * 60 * 1000,
  proyectos: 30 * 60 * 1000,
  votaciones: 30 * 60 * 1000,
  leyes: 60 * 60 * 1000,
  periodo: 24 * 60 * 60 * 1000,
  sistema: 60 * 1000,
} as const;

type Recurso = keyof typeof TTL;

interface CacheEntry {
  value: unknown;
  fetchedAt: number;
}

interface Freshness {
  fetchedAt: number | null;
  ok: boolean;
  recordsUpdated: number;
}

const cache = new Map<string, CacheEntry>();
const freshness = new Map<Recurso, Freshness>();

function markFreshness(
  recurso: Recurso,
  ok: boolean,
  at: number | null,
  records?: number,
): void {
  const prev = freshness.get(recurso);
  freshness.set(recurso, {
    ok,
    fetchedAt: at ?? prev?.fetchedAt ?? null,
    recordsUpdated: ok && records != null ? records : (prev?.recordsUpdated ?? 0),
  });
}

/**
 * Cache-aware loader. `recurso` selects the TTL and records freshness used by
 * the /system/status endpoint.
 */
export async function cached<T>(
  recurso: Recurso,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const ttl = TTL[recurso];
  const now = Date.now();
  const hit = cache.get(key);

  if (hit && now - hit.fetchedAt < ttl) {
    return hit.value as T;
  }

  try {
    const value = await loader();
    cache.set(key, { value, fetchedAt: now });
    const records = Array.isArray(value) ? value.length : value == null ? 0 : 1;
    markFreshness(recurso, true, now, records);
    return value;
  } catch (err) {
    if (hit) {
      // Serve stale data so the app keeps functioning, but flag the resource.
      markFreshness(recurso, false, hit.fetchedAt);
      return hit.value as T;
    }
    markFreshness(recurso, false, null);
    throw err;
  }
}

export interface RecursoFreshness {
  recurso: string;
  lastSync: string | null;
  recordsUpdated: number;
  dataFreshness: string;
  status: string;
}

/** Classify how fresh a resource's cache is relative to its TTL. */
function classifyFreshness(recurso: Recurso, f: Freshness): { dataFreshness: string; status: string } {
  if (!f.fetchedAt) {
    return { dataFreshness: "empty", status: "error" };
  }
  const age = Date.now() - f.fetchedAt;
  const dataFreshness = age < TTL[recurso] ? "fresh" : "stale";
  // status reflects connectivity of the last fetch; dataFreshness reflects TTL.
  const status = f.ok ? (dataFreshness === "fresh" ? "ok" : "stale") : "error";
  return { dataFreshness, status };
}

export function getFreshnessSnapshot(): {
  recursos: RecursoFreshness[];
  lastSync: string | null;
  recordsUpdated: number;
  dataFreshness: string;
  status: string;
} {
  const recursos: RecursoFreshness[] = [];
  let newest = 0;
  let totalRecords = 0;
  let anyOk = false;
  let anyError = false;
  let anyStale = false;

  for (const [recurso, f] of freshness.entries()) {
    const { dataFreshness, status } = classifyFreshness(recurso, f);
    if (status === "ok") anyOk = true;
    if (status === "error") anyError = true;
    if (status === "stale") anyStale = true;
    if (f.fetchedAt && f.fetchedAt > newest) newest = f.fetchedAt;
    totalRecords += f.recordsUpdated;
    recursos.push({
      recurso,
      lastSync: f.fetchedAt ? new Date(f.fetchedAt).toISOString() : null,
      recordsUpdated: f.recordsUpdated,
      dataFreshness,
      status,
    });
  }

  const overallStatus = anyError && !anyOk ? "offline" : anyError || anyStale ? "degraded" : "ok";
  const overallFreshness = anyStale || anyError ? "stale" : anyOk ? "fresh" : "empty";

  return {
    recursos,
    lastSync: newest > 0 ? new Date(newest).toISOString() : null,
    recordsUpdated: totalRecords,
    dataFreshness: overallFreshness,
    status: overallStatus,
  };
}

// ── Low-level fetch (unwraps the envelope) ──────────────────────────────────────

async function rawFetch(path: string, timeoutMs = 12000): Promise<unknown[]> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    // The upstream API returns HTTP 404 for a missing record — a valid empty
    // result, not an outage. Anything else non-2xx is a real gateway failure.
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
    const json = (await res.json()) as {
      codigoEstado?: number;
      mensaje?: string;
      datos?: unknown;
    };
    // 404 within the envelope means "no records", which is a valid empty result.
    if (json.codigoEstado === 404) return [];
    if (json.codigoEstado !== 200) {
      throw new Error(json.mensaje || `codigoEstado ${json.codigoEstado} en ${path}`);
    }
    const datos = json.datos;
    if (Array.isArray(datos)) return datos;
    if (datos == null) return [];
    return [datos];
  } finally {
    clearTimeout(tid);
  }
}

// ── Date / text helpers ─────────────────────────────────────────────────────────

/** Convert "DD/MM/YYYY" → ISO "YYYY-MM-DD". Returns "" for malformed/implausible dates. */
function toIso(raw: string | undefined | null): string {
  if (!raw) return "";
  const parts = raw.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  const year = Number(y);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function clean(str: string | undefined | null): string {
  if (!str) return "";
  return str.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function stripQuotes(str: string): string {
  return str.replace(/^[“"'\s]+|[”"'\s]+$/g, "").trim();
}

function toTitleCase(str: string | undefined | null): string {
  if (!str) return "";
  return str.toLowerCase().replace(/(?:^|\s|[-–/(])\S/g, (ch) => ch.toUpperCase());
}

/** Title-case only when the text is all-uppercase (legal titles arrive shouting). */
function smartTitle(str: string | undefined | null): string {
  const c = stripQuotes(clean(str));
  if (!c) return "";
  const letters = c.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
  const isShouting = letters.length > 0 && letters === letters.toUpperCase();
  return isShouting ? toTitleCase(c) : c;
}

// ── Raw API shapes (only the fields we consume) ─────────────────────────────────

interface RealLegislador {
  idLegislador: number;
  nombres: string;
  apellidos: string;
  partidoPolitico: string;
  bancada: string;
  departamento: string;
  emailParlamentario: string;
  telefonoParlamentario: string;
  fotoURL: string;
  periodoLegislativo: string;
  tipoParlamentario: string;
  camaraParlamentario: string;
  cargoBancada: string;
  appURL: string;
  activo: boolean;
}

interface RealComision {
  idComision: number;
  nombreComision: string;
  tipoComision: string;
  camaraComision: string;
  email: string;
  informacionComision: string;
  competenciaComision: string;
  numeroComision: string;
  esComisionActiva: string;
  appURL: string;
  miembros?: RealLegislador[];
}

interface RealTramitacion {
  fechaTramite: string;
  descripcionEtapa: string;
  descripcionSubEtapa: string;
  resultadoTramite: string;
  camaraTramite: string;
}

interface RealProyecto {
  idProyecto: number;
  acapite: string;
  estadoProyecto: string;
  descripcionEtapa: string;
  descripcionSubEtapa: string;
  fechaIngresoExpediente: string;
  iniciativa: string;
  origenProyecto: string;
  tipoProyecto: string;
  urgencia: string;
  expedienteCamara: string;
  appURL: string;
  autores?: RealLegislador[];
  tramitaciones?: RealTramitacion[];
}

interface RealLey {
  idLey: number;
  numeroLey: string;
  fechaSancion: string;
  fechaPromulgacion: string;
  fechaPublicacion: string;
  appURL: string;
  proyecto?: { acapite?: string; expedienteCamara?: string; idProyecto?: number };
}

interface RealPeriodo {
  idPeriodoParlamentario: number;
  periodoParlamentario: string;
}

interface RealSesion {
  idSesion: number;
  fechaSesion: string;
  horaInicio: string;
  horaFin: string;
  numeroSesion: string;
  tipoSesion: string;
  camaraSesion: string;
  appURL: string;
  periodoParlamentarioDTO?: { periodoParlamentario?: string };
  proyectos?: RealProyecto[];
}

interface RealVotacion {
  idVotacion: number;
  descripcion: string;
  observacion: string;
  appURL: string;
  totalSI: number;
  totalNO: number;
  totalAbstencion: number;
  totalAusente: number;
  totalNoVota: number;
  tramitacion?: RealTramitacion;
  proyecto?: { acapite?: string; idProyecto?: number };
  votaciones?: {
    sentidoVotacion: string;
    legislador?: RealLegislador;
  }[];
}

// ── Mapped (internal contract) shapes ───────────────────────────────────────────

export interface Legislador {
  id: string;
  nombre: string;
  apellido: string;
  partido: string;
  bancada: string;
  departamento: string;
  cargo: string;
  periodo: string;
  foto: string | null;
  email: string | null;
  bio: string | null;
  comisiones: string[];
}

export interface Comision {
  id: string;
  nombre: string;
  tipo: string;
  camara: string;
  presidente: string | null;
  vicepresidente: string | null;
  email: string | null;
  miembros: string[];
}

export interface HistorialItem {
  fecha: string;
  evento: string;
  descripcion: string;
}

export interface Proyecto {
  id: string;
  numero: string;
  titulo: string;
  estado: string;
  etapa: string;
  fechaIngreso: string;
  iniciativa: string;
  comision: string | null;
  descripcion: string | null;
  appURL: string | null;
  historial: HistorialItem[];
}

export interface Ley {
  numero: string;
  titulo: string;
  fechaSancion: string;
  fechaPromulgacion: string | null;
  proyecto: string | null;
}

export interface Sesion {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string | null;
  tipo: string;
  estado: string;
  periodo: string;
  descripcion: string | null;
  orden_del_dia: string[];
  appURL: string | null;
}

export interface Votacion {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
  camara: string;
  favor: number;
  contra: number;
  abstenciones: number;
  ausentes: number;
  resultado: string;
  appURL: string | null;
  proyectoId: string | null;
  votos?: { legislador: string; partido: string; sentido: string }[];
}

// ── Mappers ─────────────────────────────────────────────────────────────────────

function mapLegislador(p: RealLegislador): Legislador {
  const cargo = `Diputado/a ${toTitleCase(p.tipoParlamentario || "Titular")}`;
  return {
    id: String(p.idLegislador),
    nombre: toTitleCase(p.nombres),
    apellido: toTitleCase(p.apellidos),
    partido: p.partidoPolitico || "Independiente",
    bancada: p.bancada || "",
    departamento: toTitleCase(p.departamento),
    cargo,
    periodo: p.periodoLegislativo || "2023-2028",
    foto: p.fotoURL || null,
    email: p.emailParlamentario?.trim() || null,
    bio: `${cargo} por ${toTitleCase(p.departamento)}. Período legislativo ${p.periodoLegislativo}.`,
    comisiones: [],
  };
}

function mapComision(c: RealComision): Comision {
  const miembros = (c.miembros ?? [])
    .map((m) => `${toTitleCase(m.nombres)} ${toTitleCase(m.apellidos)}`.trim())
    .filter(Boolean);
  return {
    id: String(c.idComision),
    nombre: toTitleCase(c.nombreComision),
    tipo: toTitleCase(c.tipoComision),
    camara: "Diputados",
    presidente: null,
    vicepresidente: null,
    email: c.email?.trim() || null,
    miembros,
  };
}

function mapProyecto(p: RealProyecto, withDetail = false): Proyecto {
  const historial: HistorialItem[] = withDetail
    ? (p.tramitaciones ?? [])
        .map((t) => ({
          fecha: toIso(t.fechaTramite),
          evento: smartTitle(t.descripcionEtapa) || "Trámite",
          descripcion: [smartTitle(t.descripcionSubEtapa), clean(t.resultadoTramite)]
            .filter(Boolean)
            .join(" — "),
        }))
        .filter((h) => h.fecha || h.descripcion)
    : [];

  const autores = (p.autores ?? [])
    .map((a) => `${toTitleCase(a.nombres)} ${toTitleCase(a.apellidos)}`.trim())
    .filter(Boolean);

  return {
    id: String(p.idProyecto),
    numero: p.expedienteCamara || String(p.idProyecto),
    titulo: smartTitle(p.acapite) || "Sin título",
    estado: p.estadoProyecto || "EN TRAMITE",
    etapa: smartTitle(p.descripcionEtapa),
    fechaIngreso: toIso(p.fechaIngresoExpediente),
    iniciativa: toTitleCase(p.iniciativa || "Parlamentaria"),
    comision: null,
    descripcion: withDetail
      ? [
          smartTitle(p.acapite),
          autores.length ? `Autor/es: ${autores.join(", ")}.` : "",
        ]
          .filter(Boolean)
          .join("\n\n") || null
      : null,
    appURL: p.appURL || null,
    historial,
  };
}

function mapLey(l: RealLey): Ley {
  const fechaSancion = toIso(l.fechaSancion) || toIso(l.fechaPromulgacion) || toIso(l.fechaPublicacion);
  return {
    numero: l.numeroLey || String(l.idLey),
    titulo: smartTitle(l.proyecto?.acapite) || `Ley N° ${l.numeroLey}`,
    fechaSancion,
    fechaPromulgacion: toIso(l.fechaPromulgacion) || null,
    proyecto: l.proyecto?.expedienteCamara || null,
  };
}

function computeEstadoSesion(isoFecha: string, horaInicio: string, horaFin: string): string {
  if (!isoFecha) return "completada";
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  if (isoFecha > todayStr) return "programada";
  if (isoFecha < todayStr) return "completada";
  // Same day: check the time window for a live session.
  const now = today.toTimeString().slice(0, 5);
  const fin = horaFin && horaFin !== "00:00" ? horaFin : "23:59";
  if (horaInicio && now >= horaInicio && now <= fin) return "en vivo";
  if (horaInicio && now < horaInicio) return "programada";
  return "completada";
}

function mapSesion(s: RealSesion, withDetail = false): Sesion {
  const fecha = toIso(s.fechaSesion);
  const horaFin = s.horaFin && s.horaFin !== "00:00" ? s.horaFin : null;
  const orden = withDetail
    ? (s.proyectos ?? []).map((p) => smartTitle(p.acapite)).filter(Boolean)
    : [];
  return {
    id: String(s.idSesion),
    fecha,
    horaInicio: s.horaInicio || "",
    horaFin,
    tipo: toTitleCase(s.tipoSesion) || "Sesión",
    estado: computeEstadoSesion(fecha, s.horaInicio, s.horaFin),
    periodo: s.periodoParlamentarioDTO?.periodoParlamentario || "",
    descripcion: s.numeroSesion ? `Sesión N° ${s.numeroSesion}` : null,
    orden_del_dia: orden,
    appURL: s.appURL || null,
  };
}

function mapResultado(v: RealVotacion): string {
  const r = (v.tramitacion?.resultadoTramite || "").toUpperCase();
  if (r.startsWith("APROB")) return "Aprobado";
  if (r.startsWith("RECHAZ")) return "Rechazado";
  const desc = (v.descripcion || "").toUpperCase();
  if (desc.includes("APROBADO")) return "Aprobado";
  if (desc.includes("RECHAZADO")) return "Rechazado";
  return v.totalSI > v.totalNO ? "Aprobado" : "Rechazado";
}

function mapVotacion(v: RealVotacion, withDetail = false): Votacion {
  const votos = withDetail
    ? (v.votaciones ?? []).map((d) => ({
        legislador: d.legislador
          ? `${toTitleCase(d.legislador.nombres)} ${toTitleCase(d.legislador.apellidos)}`.trim()
          : "—",
        partido: d.legislador?.partidoPolitico || "",
        sentido: toTitleCase(d.sentidoVotacion),
      }))
    : undefined;

  return {
    id: String(v.idVotacion),
    titulo: smartTitle(v.proyecto?.acapite) || clean(v.descripcion).split(".")[0] || "Votación",
    descripcion: clean(v.descripcion),
    fecha: toIso(v.tramitacion?.fechaTramite),
    tipo: toTitleCase(v.tramitacion?.descripcionEtapa) || "Votación",
    camara: v.tramitacion?.camaraTramite || "",
    favor: v.totalSI ?? 0,
    contra: v.totalNO ?? 0,
    abstenciones: v.totalAbstencion ?? 0,
    ausentes: (v.totalAusente ?? 0) + (v.totalNoVota ?? 0),
    resultado: mapResultado(v),
    appURL: v.appURL || null,
    proyectoId: v.proyecto?.idProyecto ? String(v.proyecto.idProyecto) : null,
    ...(votos ? { votos } : {}),
  };
}

// ── Period helper ───────────────────────────────────────────────────────────────

async function getCurrentPeriodoId(): Promise<number> {
  return cached("periodo", "periodo:current", async () => {
    try {
      const arr = (await rawFetch("/periodo")) as RealPeriodo[];
      const ids = arr.map((p) => p.idPeriodoParlamentario).filter((n) => Number.isFinite(n));
      return ids.length ? Math.max(...ids) : FALLBACK_PERIODO_ID;
    } catch {
      return FALLBACK_PERIODO_ID;
    }
  });
}

// ── High-level services (used by routes and the AI assistant) ──────────────────

export async function getLegisladores(
  opts: { partido?: string; departamento?: string; search?: string } = {},
): Promise<Legislador[]> {
  const all = await cached("legisladores", "legisladores:D", async () => {
    const raw = (await rawFetch("/legislador?idCamara=D&page=0&size=1000")) as RealLegislador[];
    const enDiputados = raw.filter(
      (p) => p.activo && /DIPUTADOS/i.test(p.camaraParlamentario || ""),
    );
    // The API returns members across every legislative period; keep only the
    // most recent one (e.g. "2023-2028") so we surface the sitting chamber.
    const periodStart = (p: RealLegislador) => parseInt((p.periodoLegislativo || "0").slice(0, 4), 10) || 0;
    const latest = enDiputados.reduce((max, p) => Math.max(max, periodStart(p)), 0);
    return enDiputados
      .filter((p) => periodStart(p) === latest)
      .map(mapLegislador)
      .sort((a, b) => a.apellido.localeCompare(b.apellido, "es"));
  });

  let data = all;
  if (opts.partido) {
    const q = opts.partido.toLowerCase();
    data = data.filter((l) => l.partido.toLowerCase().includes(q) || l.bancada.toLowerCase().includes(q));
  }
  if (opts.departamento) {
    const q = opts.departamento.toLowerCase();
    data = data.filter((l) => l.departamento.toLowerCase().includes(q));
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    data = data.filter(
      (l) =>
        l.nombre.toLowerCase().includes(q) ||
        l.apellido.toLowerCase().includes(q) ||
        l.partido.toLowerCase().includes(q) ||
        l.departamento.toLowerCase().includes(q),
    );
  }
  return data;
}

export async function getLegisladorById(id: string): Promise<Legislador | null> {
  return cached("legisladores", `legislador:${id}`, async () => {
    const raw = (await rawFetch(`/legislador/${id}`)) as RealLegislador[];
    return raw.length ? mapLegislador(raw[0]) : null;
  });
}

export async function getComisiones(): Promise<Comision[]> {
  return cached("comisiones", "comisiones:D", async () => {
    const raw = (await rawFetch("/comision?idCamara=D&page=0&size=200")) as RealComision[];
    return raw
      .filter((c) => /SI/i.test(c.esComisionActiva || ""))
      .map((c) => mapComision(c))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  });
}

export async function getComisionById(id: string): Promise<Comision | null> {
  return cached("comisiones", `comision:${id}`, async () => {
    const periodo = await getCurrentPeriodoId();
    const [base, miembros] = await Promise.all([
      rawFetch(`/comision/${id}`) as Promise<RealComision[]>,
      rawFetch(`/comision/${id}/miembros/${periodo}`).catch(() => []) as Promise<RealComision[]>,
    ]);
    if (!base.length) return null;
    const merged: RealComision = { ...base[0], miembros: miembros[0]?.miembros ?? [] };
    return mapComision(merged);
  });
}

export async function getProyectos(
  opts: { estado?: string; search?: string; limit?: number; page?: number } = {},
): Promise<{ data: Proyecto[]; total: number }> {
  const page = opts.page ?? 0;
  const size = Math.min(opts.limit ?? 30, 50);
  const list = await cached("proyectos", `proyectos:${page}:${size}`, async () => {
    const raw = (await rawFetch(`/proyecto?page=${page}&size=${size}`)) as RealProyecto[];
    return raw.map((p) => mapProyecto(p));
  });

  let data = list;
  if (opts.estado) {
    const q = opts.estado.toLowerCase();
    data = data.filter((p) => p.estado.toLowerCase().includes(q));
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    data = data.filter(
      (p) => p.titulo.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q),
    );
  }
  return { data, total: data.length };
}

export async function getProyectoById(id: string): Promise<Proyecto | null> {
  return cached("proyectos", `proyecto:${id}`, async () => {
    const raw = (await rawFetch(`/proyecto/${id}/tramitaciones`)) as RealProyecto[];
    return raw.length ? mapProyecto(raw[0], true) : null;
  });
}

export async function getLeyes(opts: { search?: string } = {}): Promise<Ley[]> {
  const list = await cached("leyes", "leyes:periodo", async () => {
    const periodo = await getCurrentPeriodoId();
    const raw = (await rawFetch(`/ley/periodo/${periodo}`)) as RealLey[];
    return raw
      .map(mapLey)
      .sort((a, b) => (b.fechaPromulgacion ?? "").localeCompare(a.fechaPromulgacion ?? ""));
  });

  let data = list;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    data = data.filter((l) => l.titulo.toLowerCase().includes(q) || l.numero.includes(q));
  }
  return data;
}

export async function getSesiones(
  opts: { estado?: string; tipo?: string } = {},
): Promise<{ data: Sesion[]; sesionEnVivo: Sesion | null }> {
  const all = await cached("sesiones", "sesiones:D", async () => {
    const year = new Date().getFullYear();
    const [curr, prev] = await Promise.all([
      rawFetch(`/sesion?idCamara=D&anho=${year}&page=0&size=100`).catch(() => []) as Promise<RealSesion[]>,
      rawFetch(`/sesion?idCamara=D&anho=${year - 1}&page=0&size=100`).catch(() => []) as Promise<RealSesion[]>,
    ]);
    return [...curr, ...prev]
      .map((s) => mapSesion(s))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  const sesionEnVivo = all.find((s) => s.estado === "en vivo") ?? null;

  let data = all;
  if (opts.estado) data = data.filter((s) => s.estado === opts.estado);
  if (opts.tipo) data = data.filter((s) => s.tipo.toLowerCase().includes(opts.tipo!.toLowerCase()));
  return { data, sesionEnVivo };
}

export async function getSesionById(id: string): Promise<Sesion | null> {
  return cached("sesiones", `sesion:${id}`, async () => {
    const raw = (await rawFetch(`/sesion/${id}/proyectos`)) as RealSesion[];
    return raw.length ? mapSesion(raw[0], true) : null;
  });
}

export async function getVotaciones(
  opts: { search?: string; limit?: number } = {},
): Promise<Votacion[]> {
  const size = Math.min(opts.limit ?? 60, 100);
  const list = await cached("votaciones", `votaciones:${size}`, async () => {
    const raw = (await rawFetch(`/votacion?page=0&size=${size}`)) as RealVotacion[];
    return raw
      .filter((v) => /DIPUTADOS/i.test(v.tramitacion?.camaraTramite || ""))
      .map((v) => mapVotacion(v))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  let data = list;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    data = data.filter((v) => v.titulo.toLowerCase().includes(q) || v.descripcion.toLowerCase().includes(q));
  }
  return data;
}

export async function getVotacionById(id: string): Promise<Votacion | null> {
  return cached("votaciones", `votacion:${id}`, async () => {
    const raw = (await rawFetch(`/votacion/${id}`)) as RealVotacion[];
    return raw.length ? mapVotacion(raw[0], true) : null;
  });
}

export async function getProyectosTotal(): Promise<number> {
  return cached("sistema", "proyecto:total", async () => {
    const raw = (await rawFetch("/proyecto/total")) as number[];
    return typeof raw[0] === "number" ? raw[0] : 0;
  });
}

export interface DashboardData {
  totalLegisladores: number;
  totalComisiones: number;
  sesionesEsteMes: number;
  proyectosHistoricos: number;
  leyesAprobadas: number;
  sesionEnVivo: Sesion | null;
  proximasSesiones: Sesion[];
  ultimosProyectos: Proyecto[];
  ultimasLeyes: Ley[];
}

export async function getDashboard(): Promise<DashboardData> {
  const [legisladores, comisiones, sesionesRes, proyectosRes, leyes, totalProyectos] =
    await Promise.all([
      getLegisladores(),
      getComisiones(),
      getSesiones(),
      getProyectos({ limit: 5 }),
      getLeyes(),
      getProyectosTotal().catch(() => 0),
    ]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const sesionesEsteMes = sesionesRes.data.filter((s) => s.fecha.startsWith(thisMonth)).length;
  const proximasSesiones = sesionesRes.data
    .filter((s) => s.estado === "programada")
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 3);

  return {
    totalLegisladores: legisladores.length,
    totalComisiones: comisiones.length,
    sesionesEsteMes,
    proyectosHistoricos: totalProyectos,
    leyesAprobadas: leyes.length,
    sesionEnVivo: sesionesRes.sesionEnVivo,
    proximasSesiones,
    ultimosProyectos: proyectosRes.data,
    ultimasLeyes: leyes.slice(0, 4),
  };
}

export interface SystemStatus {
  lastSync: string | null;
  source: string;
  recordsUpdated: number;
  lastSessionDetected: string | null;
  dataFreshness: string;
  status: string;
  recursos: RecursoFreshness[];
}

const SOURCE_NAME = "API Datos Abiertos Legislativos v2.0 — Congreso Nacional del Paraguay";

export async function getSystemStatus(): Promise<SystemStatus> {
  // Live connectivity probe (cheap, short TTL) to keep the freshness honest, and
  // surface the most recent session date the official source reports.
  let probeOk = true;
  let lastSessionDetected: string | null = null;
  try {
    const [, sesionesRes] = await Promise.all([getProyectosTotal(), getSesiones()]);
    const fechas = sesionesRes.data.map((s) => s.fecha).filter(Boolean);
    lastSessionDetected = fechas.length ? fechas.sort((a, b) => b.localeCompare(a))[0] : null;
  } catch {
    probeOk = false;
  }

  const snap = getFreshnessSnapshot();
  const status = !probeOk && snap.status === "offline" ? "offline" : snap.status;
  return {
    lastSync: snap.lastSync,
    source: SOURCE_NAME,
    recordsUpdated: snap.recordsUpdated,
    lastSessionDetected,
    dataFreshness: snap.dataFreshness,
    status,
    recursos: snap.recursos,
  };
}
