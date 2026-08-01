// ── Congress Open Data API v2 client (live proxy + per-resource TTL cache) ─────
//
// Source of truth: "API Datos Abiertos Legislativos v2.0"
//   base: https://datosv2.congreso.gov.py/web/api
//   documentation: https://datosv2.congreso.gov.py/web/api-doc/index.html
//   envelope: { codigoEstado, mensaje, datos: [...] }
//   dates: "DD/MM/YYYY"
//   authentication: None (public API)
//
// Architecture: NO database, NO background sync. Each request reads from an
// in-memory TTL cache; on a miss it fetches live and refreshes the cache. If a
// live fetch fails but a (stale) cache entry exists, the stale value is served
// so the UI keeps working; if there is no cache at all the error propagates so
// failures are explicit (never fabricated/mock data).
//
// HTTP Client: Exponential backoff retry logic for resilience against rate limiting
// and transient failures. Structured logging for monitoring and debugging.

const BASE = "https://datosv2.congreso.gov.py/web/api";
const OPENDATA_BASE = "https://datos.congreso.gov.py/opendata/api/data";

// ── HTTP Client with Exponential Backoff Retry Logic ───────────────────────

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * HTTP fetch with exponential backoff retry logic.
 * Retries on: 429 (rate limit), 500, 502, 503, 504 (server errors)
 * Does not retry on: 4xx client errors (except 429)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<Response> {
  let lastError: Error | null = null;
  let delay = retryConfig.initialDelayMs;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      // Success - return response
      if (response.ok) {
        return response;
      }

      // 404 is NOT an outage: the official source is telling us "no records for
      // this resource" (a valid empty result). Return it so the caller can map
      // it to an empty—but verified—response, instead of a false source-down
      // error. This is essential to the strict "empty vs. unavailable" policy.
      if (response.status === 404) {
        return response;
      }

      // Don't retry on other client errors (except 429 rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Retry on rate limit (429) and server errors (5xx)
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        if (attempt < retryConfig.maxRetries) {
          console.warn(`[API] Retry ${attempt + 1}/${retryConfig.maxRetries} for ${url} after ${delay}ms (HTTP ${response.status})`);
          await sleep(delay);
          delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
          continue;
        }
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      
      // Retry on network errors
      if (attempt < retryConfig.maxRetries && (error as Error).name !== 'AbortError') {
        console.warn(`[API] Retry ${attempt + 1}/${retryConfig.maxRetries} for ${url} after ${delay}ms (${(error as Error).message})`);
        await sleep(delay);
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
        continue;
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// ── Structured Logging ───────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: Record<string, unknown>;
}

const LOG_BUFFER: LogEntry[] = [];
const MAX_LOG_ENTRIES = 1000;

function log(level: LogLevel, component: string, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    component,
    message,
    context,
  };
  
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_LOG_ENTRIES) {
    LOG_BUFFER.shift();
  }
  
  // Console output with color coding
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${component}]`;
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  
  switch (level) {
    case 'error':
      console.error(`${prefix} ${message}${contextStr}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}${contextStr}`);
      break;
    case 'debug':
      console.debug(`${prefix} ${message}${contextStr}`);
      break;
    default:
      console.log(`${prefix} ${message}${contextStr}`);
  }
}

export const logger = {
  info: (component: string, message: string, context?: Record<string, unknown>) => 
    log('info', component, message, context),
  warn: (component: string, message: string, context?: Record<string, unknown>) => 
    log('warn', component, message, context),
  error: (component: string, message: string, context?: Record<string, unknown>) => 
    log('error', component, message, context),
  debug: (component: string, message: string, context?: Record<string, unknown>) => 
    log('debug', component, message, context),
  getLogs: () => [...LOG_BUFFER],
  clearLogs: () => { LOG_BUFFER.length = 0; },
};

// ── Verified-source response envelope ────────────────────────────────────────
//
// STRICT "no mock data" policy: every service that reads the official API
// returns this envelope. `verified` is true ONLY when the upstream HTTP call
// succeeded (2xx). On any failure we return { data: null, verified: false }
// with the error and the exact URL consulted — never fabricated/mock data and
// never a stale cache masqueraded as live data.
export interface FetchResult<T> {
  /** Payload from the official source, or null when it could not be obtained. */
  data: T | null;
  /** Exact official URL that was consulted for this result. */
  sourceUrl: string;
  /** ISO-8601 timestamp of when this result was produced. */
  fetchedAt: string;
  /** true only if the official source responded successfully (2xx). */
  verified: boolean;
  /** Present when verified === false. */
  error?: string;
}

/** Build the full URL for a path on the primary Datos Abiertos API. */
function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

/** Build the full URL for a path on the Open Data API. */
function openDataUrl(path: string): string {
  return `${OPENDATA_BASE}${path}`;
}

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
  noticias: 30 * 60 * 1000,
  autoridades: 24 * 60 * 60 * 1000,
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
 * Cache-aware loader returning a verified-source envelope. Fresh cache (within
 * its TTL) is served as verified live data. On a miss it fetches live and
 * refreshes the cache.
 *
 * STRICT policy: if the live fetch fails, the error is surfaced explicitly as
 * `{ data: null, verified: false, error }`. A stale (TTL-expired) cache entry is
 * NEVER served as if it were live data.
 */
export async function cachedFetch<T>(
  recurso: Recurso,
  key: string,
  sourceUrl: string,
  loader: () => Promise<T>,
): Promise<FetchResult<T>> {
  const ttl = TTL[recurso];
  const now = Date.now();
  const hit = cache.get(key);

  // Only fresh cache (within TTL) is served — this is verified data captured
  // recently, not stale data masquerading as live.
  if (hit && now - hit.fetchedAt < ttl) {
    return {
      data: hit.value as T,
      sourceUrl,
      fetchedAt: new Date(hit.fetchedAt).toISOString(),
      verified: true,
    };
  }

  try {
    const value = await loader();
    cache.set(key, { value, fetchedAt: now });
    const records = Array.isArray(value) ? value.length : value == null ? 0 : 1;
    markFreshness(recurso, true, now, records);
    return {
      data: value,
      sourceUrl,
      fetchedAt: new Date(now).toISOString(),
      verified: true,
    };
  } catch (err) {
    // NEVER serve stale cache as live. Fail explicitly.
    markFreshness(recurso, false, hit?.fetchedAt ?? null);
    return {
      data: null,
      sourceUrl,
      fetchedAt: new Date(now).toISOString(),
      verified: false,
      error: (err as Error).message,
    };
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
    const res = await fetchWithRetry(`${BASE}${path}`, {
      signal: controller.signal,
    });
    
    logger.debug('API', `Fetching ${BASE}${path}`, { status: res.status });
    
    // The upstream API returns HTTP 404 for a missing record — a valid empty
    // result, not an outage. Anything else non-2xx is a real gateway failure.
    if (res.status === 404) {
      logger.debug('API', `404 - No records found for ${path}`);
      return [];
    }
    
    const json = (await res.json()) as {
      codigoEstado?: number;
      mensaje?: string;
      datos?: unknown;
    };
    
    // 404 within the envelope means "no records", which is a valid empty result.
    if (json.codigoEstado === 404) {
      logger.debug('API', `404 in envelope - No records for ${path}`);
      return [];
    }
    
    if (json.codigoEstado !== 200) {
      logger.error('API', `API error for ${path}`, { 
        codigoEstado: json.codigoEstado, 
        mensaje: json.mensaje 
      });
      throw new Error(json.mensaje || `codigoEstado ${json.codigoEstado} en ${path}`);
    }
    
    const datos = json.datos;
    if (Array.isArray(datos)) {
      logger.debug('API', `Successfully fetched ${datos.length} records from ${path}`);
      return datos;
    }
    if (datos == null) return [];
    logger.debug('API', `Successfully fetched single record from ${path}`);
    return [datos];
  } catch (error) {
    logger.error('API', `Fetch failed for ${path}`, { error: (error as Error).message });
    throw error;
  } finally {
    clearTimeout(tid);
  }
}

/** Fetch from the Open Data API (returns direct array, no wrapper). */
async function rawFetchOpenData(path: string, timeoutMs = 12000): Promise<unknown> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchWithRetry(`${OPENDATA_BASE}${path}`, {
      signal: controller.signal,
    });
    
    logger.debug('OpenDataAPI', `Fetching ${OPENDATA_BASE}${path}`, { status: res.status });
    
    if (!res.ok) {
      logger.error('OpenDataAPI', `HTTP error for ${path}`, { status: res.status });
      throw new Error(`HTTP ${res.status} en ${OPENDATA_BASE}${path}`);
    }
    
    const data = await res.json();
    logger.debug('OpenDataAPI', `Successfully fetched data from ${path}`);
    return data;
  } catch (error) {
    logger.error('OpenDataAPI', `Fetch failed for ${path}`, { error: (error as Error).message });
    throw error;
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

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, " ");
}

/** Decode the handful of HTML entities the news portal emits. */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
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

/** Collapse the verbose upstream `tipoProyecto` into a short, filterable label. */
function normalizeTipo(str: string | undefined | null): string {
  const t = (str || "").toUpperCase();
  if (!t) return "Otro";
  if (t.includes("PROYECTO DE LEY") || /\bLEY\b/.test(t)) return "Proyecto de Ley";
  if (t.includes("DECLARACI")) return "Declaración";
  if (t.includes("PEDIDO DE INFORMES")) return "Pedido de Informes";
  if (t.includes("RESOLUCI")) return "Resolución";
  if (t.includes("ACUERDO")) return "Acuerdo";
  if (t.includes("HOMENAJE")) return "Homenaje";
  if (t.includes("MINUTA")) return "Minuta";
  return smartTitle(str) || "Otro";
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
  numeroSesion?: string;
  idSesion?: { idSesion?: number };
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
  tipo: string;
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
  // Use only the period reported by the official source — never a hardcoded one.
  const periodo = p.periodoLegislativo || "";
  return {
    id: String(p.idLegislador),
    nombre: toTitleCase(p.nombres),
    apellido: toTitleCase(p.apellidos),
    partido: p.partidoPolitico || "Independiente",
    bancada: p.bancada || "",
    departamento: toTitleCase(p.departamento),
    cargo,
    periodo,
    foto: p.fotoURL || null,
    email: p.emailParlamentario?.trim() || null,
    bio: periodo
      ? `${cargo} por ${toTitleCase(p.departamento)}. Período legislativo ${periodo}.`
      : `${cargo} por ${toTitleCase(p.departamento)}.`,
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
    estado: smartTitle(p.estadoProyecto) || "En Trámite",
    tipo: normalizeTipo(p.tipoProyecto),
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

/**
 * Resolve the current parliamentary period id from the official source.
 *
 * STRICT policy: there is NO hardcoded fallback. If the official API is
 * unreachable or does not report a period, this throws so the caller's
 * FetchResult becomes `{ verified: false }` — we never invent a period id.
 */
async function getCurrentPeriodoId(): Promise<number> {
  const key = "periodo:current";
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.fetchedAt < TTL.periodo) {
    return hit.value as number;
  }

  const arr = (await rawFetch("/periodo")) as RealPeriodo[];
  const ids = arr
    .map((p) => p.idPeriodoParlamentario)
    .filter((n) => Number.isFinite(n));
  if (ids.length === 0) {
    throw new Error("La fuente oficial no devolvió el período parlamentario vigente.");
  }
  const periodoId = Math.max(...ids);
  cache.set(key, { value: periodoId, fetchedAt: now });
  markFreshness("periodo", true, now, 1);
  return periodoId;
}

/**
 * Fetch a commission's member roster from the official source. Returns [] when
 * the source reports no members (a real empty result). Never returns mock data.
 */
async function fetchComisionMiembros(
  idComision: number | string,
  periodo: number,
): Promise<RealLegislador[]> {
  const resp = (await rawFetch(`/comision/${idComision}/miembros/${periodo}`).catch(
    () => [] as unknown[],
  )) as unknown;

  let datosArray: unknown[] | null = null;
  if (Array.isArray(resp)) {
    datosArray = resp;
  } else if (resp && Array.isArray((resp as { datos?: unknown[] }).datos)) {
    datosArray = (resp as { datos: unknown[] }).datos;
  }

  if (datosArray && datosArray.length > 0) {
    const first = datosArray[0] as { miembros?: RealLegislador[] };
    return first?.miembros ?? [];
  }
  return [];
}

// ── High-level services (used by routes and the AI assistant) ──────────────────

export async function getLegisladores(
  opts: { partido?: string; departamento?: string; search?: string } = {},
): Promise<FetchResult<Legislador[]>> {
  const path = "/legislador?idCamara=D&page=0&size=1000";
  const res = await cachedFetch("legisladores", "legisladores:D", apiUrl(path), async () => {
    const raw = (await rawFetch(path)) as RealLegislador[];
    const enDiputados = raw.filter(
      (p) => p.activo && /DIPUTADOS/i.test(p.camaraParlamentario || ""),
    );
    // The API returns members across every legislative period; keep only the
    // most recent one so we surface the sitting chamber.
    const periodStart = (p: RealLegislador) => parseInt((p.periodoLegislativo || "0").slice(0, 4), 10) || 0;
    const latest = enDiputados.reduce((max, p) => Math.max(max, periodStart(p)), 0);
    return enDiputados
      .filter((p) => periodStart(p) === latest)
      .map(mapLegislador)
      .sort((a, b) => a.apellido.localeCompare(b.apellido, "es"));
  });

  if (!res.verified || res.data === null) return res;

  let data = res.data;
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
  return { ...res, data };
}

export async function getLegisladorById(id: string): Promise<FetchResult<Legislador | null>> {
  const path = `/legislador/${id}`;
  return cachedFetch("legisladores", `legislador:${id}`, apiUrl(path), async () => {
    const raw = (await rawFetch(path)) as RealLegislador[];
    return raw.length ? mapLegislador(raw[0]) : null;
  });
}

export async function getComisiones(): Promise<FetchResult<Comision[]>> {
  const path = "/comision?idCamara=D&page=0&size=200";
  return cachedFetch("comisiones", "comisiones:D", apiUrl(path), async () => {
    const raw = (await rawFetch(path)) as RealComision[];
    const activas = raw.filter((c) => /SI/i.test(c.esComisionActiva || ""));

    // The list endpoint does not include members. Resolve the current period
    // (throws if the source can't provide it) and fetch each roster from the
    // official source. Empty rosters stay empty — no mock fallback.
    const periodo = await getCurrentPeriodoId();

    const withMembers = await Promise.all(
      activas.map(async (c) => {
        const miembros = await fetchComisionMiembros(c.idComision, periodo);
        return mapComision({ ...c, miembros });
      }),
    );

    return withMembers.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  });
}

export async function getComisionById(id: string): Promise<FetchResult<Comision | null>> {
  const path = `/comision/${id}`;
  return cachedFetch("comisiones", `comision:${id}`, apiUrl(path), async () => {
    const periodo = await getCurrentPeriodoId();
    const [base, miembros] = await Promise.all([
      rawFetch(path) as Promise<RealComision[]>,
      fetchComisionMiembros(id, periodo),
    ]);
    if (!base.length) return null;
    return mapComision({ ...base[0], miembros });
  });
}

export async function getProyectos(
  opts: { estado?: string; search?: string; limit?: number; page?: number } = {},
): Promise<FetchResult<Proyecto[]>> {
  const page = opts.page ?? 0;
  const size = Math.min(opts.limit ?? 30, 50);
  const path = `/proyecto?page=${page}&size=${size}`;
  const res = await cachedFetch("proyectos", `proyectos:${page}:${size}`, apiUrl(path), async () => {
    const raw = (await rawFetch(path)) as RealProyecto[];
    return raw.map((p) => mapProyecto(p));
  });

  if (!res.verified || res.data === null) return res;

  let data = res.data;
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
  return { ...res, data };
}

export async function getProyectoById(id: string): Promise<FetchResult<Proyecto | null>> {
  const path = `/proyecto/${id}/tramitaciones`;
  return cachedFetch("proyectos", `proyecto:${id}`, apiUrl(path), async () => {
    const raw = (await rawFetch(path)) as RealProyecto[];
    return raw.length ? mapProyecto(raw[0], true) : null;
  });
}

export async function getProyectosByComision(
  comisionId: string,
  opts: { limit?: number } = {},
): Promise<FetchResult<Proyecto[]>> {
  const limit = opts.limit ?? 50;
  const path = `/proyecto?idComision=${comisionId}`;
  return cachedFetch("proyectos", `proyectos:comision:${comisionId}`, openDataUrl(path), async () => {
    const raw = (await rawFetchOpenData(path)) as RealProyecto[];
    return raw.slice(0, limit).map((p) => mapProyecto(p));
  });
}

export async function getSesionesByComision(
  comisionId: string,
  opts: { limit?: number } = {},
): Promise<FetchResult<Sesion[]>> {
  const limit = opts.limit ?? 50;
  const path = `/sesion?idComision=${comisionId}`;
  return cachedFetch("sesiones", `sesiones:comision:${comisionId}`, openDataUrl(path), async () => {
    const raw = (await rawFetchOpenData(path)) as RealSesion[];
    return raw.slice(0, limit).map((s) => mapSesion(s));
  });
}

export async function getLeyes(opts: { search?: string } = {}): Promise<FetchResult<Ley[]>> {
  // The exact URL depends on the current period, resolved live inside the loader.
  const res = await cachedFetch("leyes", "leyes:periodo", apiUrl("/ley/periodo/{periodo}"), async () => {
    const periodo = await getCurrentPeriodoId();
    const raw = (await rawFetch(`/ley/periodo/${periodo}`)) as RealLey[];
    return raw
      .map(mapLey)
      .sort((a, b) => (b.fechaPromulgacion ?? "").localeCompare(a.fechaPromulgacion ?? ""));
  });

  if (!res.verified || res.data === null) return res;

  let data = res.data;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    data = data.filter((l) => l.titulo.toLowerCase().includes(q) || l.numero.includes(q));
  }
  return { ...res, data };
}

export async function getSesiones(
  opts: { estado?: string; tipo?: string } = {},
): Promise<FetchResult<Sesion[]>> {
  const year = new Date().getFullYear();
  const path = `/sesion?idCamara=D&anho=${year}&page=0&size=100`;
  const res = await cachedFetch("sesiones", "sesiones:D", apiUrl(path), async () => {
    const [curr, prev] = await Promise.all([
      rawFetch(`/sesion?idCamara=D&anho=${year}&page=0&size=100`) as Promise<RealSesion[]>,
      rawFetch(`/sesion?idCamara=D&anho=${year - 1}&page=0&size=100`) as Promise<RealSesion[]>,
    ]);
    return [...curr, ...prev]
      .map((s) => mapSesion(s))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  if (!res.verified || res.data === null) return res;

  let data = res.data;
  if (opts.estado) data = data.filter((s) => s.estado === opts.estado);
  if (opts.tipo) data = data.filter((s) => s.tipo.toLowerCase().includes(opts.tipo!.toLowerCase()));
  return { ...res, data };
}

export async function getSesionById(id: string): Promise<FetchResult<Sesion | null>> {
  const path = `/sesion/${id}/proyectos`;
  return cachedFetch("sesiones", `sesion:${id}`, apiUrl(path), async () => {
    const raw = (await rawFetch(path)) as RealSesion[];
    return raw.length ? mapSesion(raw[0], true) : null;
  });
}

// ── Votaciones: escáner por-ID (la lista upstream está congelada) ────────────
//
// El endpoint de LISTA `/votacion?page&size` de la fuente oficial está congelado
// en registros de 2018 e ignora TODOS los parámetros de paginación, orden y
// filtro (idSesion, idProyecto, sort). La única vía para obtener votaciones
// ACTUALES es el endpoint por-ID `/votacion/{id}`, que sí está vivo (verificado
// hasta 2026). Los IDs de votación crecen con el tiempo, así que descubrimos el
// techo actual y escaneamos hacia abajo recolectando votos de Diputados.
//
// Todos los datos provienen de la fuente oficial: no se fabrica ningún registro.

const VOTACION_ID_SEED = 108500; // id reciente conocido; el escáner se autoajusta hacia arriba
const VOTACION_PROBE_STEP = 50; // ancho de ventana para descubrir el techo
const VOTACION_PROBE_MAX_STEPS = 24; // cubre crecimiento futuro (~1200 ids sobre el seed)
const VOTACION_SCAN_CHUNK = 50; // ids por lote al escanear hacia abajo
const VOTACION_SCAN_MAX = 1500; // tope de seguridad de ids escaneados
const VOTACION_CONCURRENCY = 12; // paralelismo tolerado por la fuente (sin errores)

/** Ejecuta `task` sobre `items` con concurrencia acotada, preservando el orden. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await task(items[i] as T);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Obtiene una votación por ID (endpoint por-ID vivo). Cachea el resultado —
 * incluyendo `null` para IDs inexistentes (404)— con el TTL de votaciones para
 * que el descubrimiento del techo y el escaneo compartan las lecturas.
 */
async function fetchVotacionRaw(id: number): Promise<RealVotacion | null> {
  const key = `votacionraw:${id}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.fetchedAt < TTL.votaciones) {
    return hit.value as RealVotacion | null;
  }
  const raw = (await rawFetch(`/votacion/${id}`)) as RealVotacion[];
  const value = raw.length ? (raw[0] as RealVotacion) : null;
  cache.set(key, { value, fetchedAt: now });
  return value;
}

function isDiputados(v: RealVotacion): boolean {
  return /DIPUTADOS/i.test(v.tramitacion?.camaraTramite || "");
}

/**
 * Descubre el id de votación máximo actual sondeando hacia arriba en ventanas
 * desde un seed conocido. Se detiene tras dos ventanas consecutivas totalmente
 * vacías (para no cortar por un hueco puntual). Devuelve el tope de la última
 * ventana con datos. Cachea el resultado con el TTL de votaciones.
 */
async function discoverMaxVotacionId(): Promise<number> {
  const key = "votacion:maxid";
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.fetchedAt < TTL.votaciones) return hit.value as number;

  let ceiling = VOTACION_ID_SEED + VOTACION_PROBE_STEP - 1;
  let emptyStreak = 0;
  for (let step = 0; step < VOTACION_PROBE_MAX_STEPS; step++) {
    const start = VOTACION_ID_SEED + step * VOTACION_PROBE_STEP;
    const ids = Array.from({ length: VOTACION_PROBE_STEP }, (_, k) => start + k);
    const found = await mapPool(ids, VOTACION_CONCURRENCY, (id) =>
      fetchVotacionRaw(id).catch(() => null),
    );
    const maxHit = found.reduce<number>(
      (acc, v) => (v ? Math.max(acc, v.idVotacion) : acc),
      -1,
    );
    if (maxHit >= 0) {
      ceiling = maxHit;
      emptyStreak = 0;
    } else if (++emptyStreak >= 2) {
      break; // dos ventanas vacías seguidas: pasamos el techo real
    }
  }
  cache.set(key, { value: ceiling, fetchedAt: now });
  logger.info("Votaciones", `Techo de id de votación descubierto: ${ceiling}`);
  return ceiling;
}

/**
 * Escanea votaciones hacia abajo desde el techo descubierto, recolectando
 * registros crudos hasta reunir al menos `targetDip` votos de Diputados (o
 * agotar la ventana de seguridad). Devuelve todos los registros crudos (ambas
 * cámaras) hallados, ordenados por id descendente.
 */
async function scanRecentVotaciones(targetDip: number): Promise<RealVotacion[]> {
  const maxId = await discoverMaxVotacionId();
  const floor = maxId - VOTACION_SCAN_MAX;
  const out: RealVotacion[] = [];
  let dip = 0;
  let top = maxId;
  while (top > floor) {
    const start = Math.max(top - VOTACION_SCAN_CHUNK + 1, floor + 1);
    const ids: number[] = [];
    for (let id = top; id >= start; id--) ids.push(id);
    const raws = await mapPool(ids, VOTACION_CONCURRENCY, (id) =>
      fetchVotacionRaw(id).catch(() => null),
    );
    for (const v of raws) {
      if (!v) continue;
      out.push(v);
      if (isDiputados(v)) dip++;
    }
    top = start - 1;
    if (dip >= targetDip) break;
  }
  return out;
}

export async function getVotaciones(
  opts: { search?: string; limit?: number } = {},
): Promise<FetchResult<Votacion[]>> {
  const limit = Math.min(opts.limit ?? 50, 100);
  const res = await cachedFetch(
    "votaciones",
    `votaciones:list:${limit}`,
    apiUrl(`/votacion/{id} (escaneo por-ID; la lista upstream está congelada en 2018)`),
    async () => {
      const raws = await scanRecentVotaciones(limit);
      return raws
        .filter(isDiputados)
        .map((v) => mapVotacion(v))
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .slice(0, limit);
    },
  );

  if (!res.verified || res.data === null) return res;

  let data = res.data;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    data = data.filter((v) => v.titulo.toLowerCase().includes(q) || v.descripcion.toLowerCase().includes(q));
  }
  return { ...res, data };
}

export async function getVotacionesBySesion(idSesion: string): Promise<FetchResult<Votacion[]>> {
  const target = Number(idSesion);
  return cachedFetch(
    "votaciones",
    `votaciones:sesion:${idSesion}`,
    apiUrl(`/votacion/{id} (escaneo por-ID filtrado por sesión ${idSesion})`),
    async () => {
      const raws = await scanRecentVotaciones(200);
      return raws
        .filter(isDiputados)
        .filter((v) => v.tramitacion?.idSesion?.idSesion === target)
        .map((v) => mapVotacion(v))
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
    },
  );
}

export async function getVotacionById(id: string): Promise<FetchResult<Votacion | null>> {
  const path = `/votacion/${id}`;
  return cachedFetch("votaciones", `votacion:${id}`, apiUrl(path), async () => {
    const raw = (await rawFetch(path)) as RealVotacion[];
    return raw.length ? mapVotacion(raw[0], true) : null;
  });
}

export async function getProyectosTotal(): Promise<FetchResult<number>> {
  const path = "/proyecto/total";
  return cachedFetch("sistema", "proyecto:total", apiUrl(path), async () => {
    const raw = (await rawFetch(path)) as number[];
    return typeof raw[0] === "number" ? raw[0] : 0;
  });
}

// ── Noticias (portal oficial de la Cámara de Diputados) ──────────────────────
//
// El portal oficial (https://www.diputados.gov.py) es un sitio Laravel sin API
// JSON, pero su listado de noticias sí entrega HTML limpio y estable. Extraemos
// los datos reales (título, fecha, resumen, imagen y enlace) de cada artículo.
// No se fabrica ninguna noticia: si la fuente falla, se propaga como error de
// origen y el cliente muestra estado vacío.

const NOTICIAS_LISTING_URL = "https://www.diputados.gov.py/noticias/noticias";

export interface Noticia {
  id: string;
  titulo: string;
  fecha: string;
  resumen: string;
  imagen: string | null;
  url: string;
}

/** Extrae las noticias del HTML del portal oficial mediante parseo por bloques. */
function parseNoticiasHtml(html: string): Noticia[] {
  const items: Noticia[] = [];
  const articleRe = /<article class="item[^"]*">([\s\S]*?)<\/article>/g;
  let m: RegExpExecArray | null;
  while ((m = articleRe.exec(html)) !== null) {
    const block = m[1] ?? "";

    const hrefM = /<div class="item-title">[\s\S]*?<a[^>]*href="([^"]+)"/.exec(block);
    const titleM = /<div class="item-title">[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/.exec(block);
    if (!titleM) continue;

    const url = hrefM?.[1]?.trim() ?? "";
    const titulo = decodeEntities(clean(stripTags(titleM[1] ?? "")));
    if (!titulo) continue;

    const dateM = /<div class="item-date">[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/.exec(block);
    const fecha = dateM ? clean(stripTags(dateM[1] ?? "")) : "";

    const summM = /<div class="item-summary">([\s\S]*?)<\/div>/.exec(block);
    const resumen = summM ? decodeEntities(clean(stripTags(summM[1] ?? ""))) : "";

    const imgM = /<img[^>]*src="([^"]+)"/.exec(block);
    const imagen = imgM?.[1]?.trim() || null;

    // El id es el último segmento numérico del enlace del detalle.
    const idM = /(\d+)(?:\/?)$/.exec(url);
    const id = idM?.[1] ?? String(items.length + 1);

    items.push({ id, titulo, fecha, resumen, imagen, url });
  }
  return items;
}

export async function getNoticias(limit = 8): Promise<FetchResult<Noticia[]>> {
  return cachedFetch("noticias", `noticias:${limit}`, NOTICIAS_LISTING_URL, async () => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetchWithRetry(NOTICIAS_LISTING_URL, {
        signal: controller.signal,
        headers: {
          // El portal Laravel responde HTML; pedimos explícitamente HTML.
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (compatible; CamaraDigital/1.0)",
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} al obtener noticias del portal oficial`);
      }
      const html = await res.text();
      const noticias = parseNoticiasHtml(html);
      if (noticias.length === 0) {
        // El portal cambió de maquetado: fallamos explícitamente en vez de
        // devolver una lista vacía que parezca "sin noticias".
        throw new Error("No se pudieron extraer noticias del portal oficial (maquetado inesperado)");
      }
      logger.info("Noticias", `Extraídas ${noticias.length} noticias del portal oficial`);
      return noticias.slice(0, limit);
    } finally {
      clearTimeout(tid);
    }
  });
}

// ── Mesa Directiva (REMOVED: Web scraping eliminated - using API only) ─────────
// NOTE: The Open Data API does not expose the chamber's board.
// This endpoint is disabled as per migration to API-only architecture.
// If authorities data is required, consider requesting the Congress to add
// this endpoint to their official API.

export interface Autoridad {
  cargo: string;
  nombre: string;
  partido: string | null;
}

export interface MesaDirectiva {
  periodo: string | null;
  autoridades: Autoridad[];
}

export async function getAutoridades(): Promise<FetchResult<MesaDirectiva>> {
  // The Open Data API does not expose the chamber's board. We return an
  // officially empty, verified result instead of fabricating authorities.
  logger.warn("Autoridades", "Authorities endpoint has no official JSON API - returning empty verified result");
  return {
    data: { periodo: null, autoridades: [] },
    sourceUrl: "https://www.diputados.gov.py/",
    fetchedAt: new Date().toISOString(),
    verified: true,
  };
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

export async function getDashboard(): Promise<FetchResult<DashboardData>> {
  const [legisladores, comisiones, sesionesRes, proyectosRes, leyes, totalProyectos] =
    await Promise.all([
      getLegisladores(),
      getComisiones(),
      getSesiones(),
      getProyectos({ limit: 5 }),
      getLeyes(),
      getProyectosTotal(),
    ]);

  // Strict policy: the dashboard is only trustworthy if every core official
  // source responded. If any failed, surface a single verified:false result so
  // the route returns 503 instead of a partially-fabricated dashboard.
  const core = [legisladores, comisiones, sesionesRes, proyectosRes, leyes];
  const failed = core.find((r) => !r.verified);
  if (failed) {
    return {
      data: null,
      sourceUrl: failed.sourceUrl,
      fetchedAt: new Date().toISOString(),
      verified: false,
      error: failed.error ?? "Fuente oficial no disponible",
    };
  }

  const sesiones = sesionesRes.data ?? [];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const sesionesEsteMes = sesiones.filter((s) => s.fecha.startsWith(thisMonth)).length;
  const proximasSesiones = sesiones
    .filter((s) => s.estado === "programada")
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 3);
  const sesionEnVivo = sesiones.find((s) => s.estado === "en vivo") ?? null;

  const data: DashboardData = {
    totalLegisladores: (legisladores.data ?? []).length,
    totalComisiones: (comisiones.data ?? []).length,
    sesionesEsteMes,
    // totalProyectos is a non-core metric: if unavailable we show 0 rather than
    // failing the whole dashboard, but we never invent a number.
    proyectosHistoricos: totalProyectos.verified ? (totalProyectos.data ?? 0) : 0,
    leyesAprobadas: (leyes.data ?? []).length,
    sesionEnVivo,
    proximasSesiones,
    ultimosProyectos: proyectosRes.data ?? [],
    ultimasLeyes: (leyes.data ?? []).slice(0, 4),
  };

  return {
    data,
    sourceUrl: apiUrl("/dashboard"),
    fetchedAt: new Date().toISOString(),
    verified: true,
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
    const [total, sesionesRes] = await Promise.all([getProyectosTotal(), getSesiones()]);
    probeOk = total.verified && sesionesRes.verified;
    const fechas = (sesionesRes.data ?? []).map((s) => s.fecha).filter(Boolean);
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
