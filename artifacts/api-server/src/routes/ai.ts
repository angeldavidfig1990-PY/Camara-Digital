import { Router, type IRouter } from "express";
import {
  getLegisladores,
  getLegisladorById,
  getComisiones,
  getComisionById,
  getProyectos,
  getProyectoById,
  getSesiones,
  getLeyes,
  getVotaciones,
  getDashboard,
  getAutoridades,
  type Legislador,
  type Comision,
  type Proyecto,
  type Sesion,
  type Ley,
  type Votacion,
  type DashboardData,
  type MesaDirectiva,
  type FetchResult,
} from "../lib/congress";

const router: IRouter = Router();

// Exact phrase required when no data exists in the official synchronized sources.
const NO_DATA = "No existen datos disponibles en las fuentes oficiales sincronizadas.";

/**
 * Unwrap a FetchResult from the congress service under the strict "no mock data"
 * policy. If the official source could not be verified, we throw: the assistant's
 * outer try/catch converts that into the NO_DATA response. We never fabricate or
 * serve stale data. Returns the payload (which may legitimately be null/empty).
 */
function unwrap<T>(r: FetchResult<T>): T | null {
  if (!r.verified) throw new Error(r.error ?? "Fuente oficial no disponible");
  return r.data;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function has(text: string, ...terms: string[]): boolean {
  const n = norm(text);
  return terms.some((t) => n.includes(norm(t)));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function extractId(q: string): string | null {
  const m = q.match(/\b(\d{4,})\b/) ?? q.match(/([A-Z]-\d+\/\d+)/i);
  return m ? m[1] : null;
}

function extractSearchTerm(q: string): string {
  return q
    .replace(
      /(?:diputad[ao]|legislador[a]?|comision|proyecto|ley|sesion|votacion|partido|de|del|la|el|los|las|que|hay|en|por|con|sobre|cuales|cual|quien|quienes|integra|tiene|tienen|impulso|impuls[oó])\s*/gi,
      "",
    )
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ")
    .trim();
}

// ── Fuzzy matching (typo / partial / reordered tolerant, accent-insensitive) ────

// Grammar words + domain noise stripped before fuzzy comparison so only the
// meaningful entity terms drive the match (e.g. "comisión de industrial y
// comercio" → ["industrial","comercio"]).
const STOP = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "e", "o", "u", "a", "al",
  "en", "por", "con", "sin", "sobre", "su", "sus", "me", "mi", "se", "lo", "le", "tras", "ante",
  "que", "quien", "quienes", "cual", "cuales", "como", "donde", "cuando", "cuanto", "cuanta",
  "cuantos", "cuantas", "es", "son", "esta", "estan", "hay", "tiene", "tienen", "integra",
  "integran", "compone", "componen", "conforma", "conforman", "forma", "forman", "pertenece",
  "pertenecen", "dame", "decime", "mostrame", "muestrame", "quiero", "saber", "ver", "buscar",
  "busco", "necesito", "informacion", "info", "dato", "datos", "acerca",
  "comision", "comisiones", "diputado", "diputada", "diputados", "diputadas", "legislador",
  "legisladora", "legisladores", "legisladoras", "parlamentario", "parlamentaria",
  "parlamentarios", "parlamentarias", "proyecto", "proyectos", "ley", "leyes", "sesion",
  "sesiones", "votacion", "votaciones", "partido", "partidos", "bancada", "bancadas", "miembro",
  "miembros", "autoridad", "autoridades", "mesa", "directiva", "camara", "honorable",
  "permanente", "permanentes",
]);

function tokenize(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// Similarity between two single tokens: 0..1. In `strict` mode the loose
// substring/prefix shortcut is disabled so off-topic partials (e.g. "clima" vs
// "climático") don't score high — used when no domain trigger word is present.
function tokenSim(a: string, b: string, strict = false): number {
  if (a === b) return 1;
  if (
    !strict &&
    a.length >= 4 &&
    b.length >= 4 &&
    (a.startsWith(b) || b.startsWith(a) || a.includes(b) || b.includes(a))
  )
    return 0.9;
  const sim = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return sim >= 0.7 ? sim : 0;
}

// Average best-match similarity of each query token against the target text.
function fuzzyScore(queryTokens: string[], target: string, strict = false): number {
  const tt = tokenize(target);
  if (queryTokens.length === 0 || tt.length === 0) return 0;
  let total = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const t of tt) best = Math.max(best, tokenSim(q, t, strict));
    total += best;
  }
  return total / queryTokens.length;
}

function bestMatch<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  threshold: number,
  strict = false,
): T | null {
  const qt = tokenize(query);
  if (qt.length === 0) return null;
  let best: T | null = null;
  let bestScore = threshold;
  for (const item of items) {
    const s = fuzzyScore(qt, getText(item), strict);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
}

function bestMatchText(query: string, options: string[], threshold: number, strict = false): string | null {
  return bestMatch(query, options, (o) => o, threshold, strict);
}

// Resolve a free-text deputy query: filter by department or party when the
// query names one (derived from live data, never hardcoded), otherwise fuzzy
// match by full name. `single` is set when exactly one deputy clearly matches.
async function resolveLegisladores(
  q: string,
  strict = false,
): Promise<{ data: Legislador[]; single: Legislador | null; filtered: boolean }> {
  const all = unwrap(await getLegisladores()) ?? [];

  const departamentos = [...new Set(all.map((l) => l.departamento).filter(Boolean))];
  const partidosYBancadas = [
    ...new Set(all.flatMap((l) => [l.partido, l.bancada]).filter(Boolean)),
  ];

  const dep = bestMatchText(q, departamentos, 0.7, strict);
  if (dep) return { data: all.filter((l) => l.departamento === dep), single: null, filtered: true };

  const par = bestMatchText(q, partidosYBancadas, 0.7, strict);
  if (par)
    return {
      data: all.filter((l) => l.partido === par || l.bancada === par),
      single: null,
      filtered: true,
    };

  const qt = tokenize(q);
  if (qt.length === 0) return { data: all, single: null, filtered: false };

  const scored = all
    .map((l) => ({ l, s: fuzzyScore(qt, `${l.nombre} ${l.apellido}`, strict) }))
    .filter((x) => x.s >= 0.55)
    .sort((a, b) => b.s - a.s);

  if (scored.length === 0) return { data: all, single: null, filtered: false };

  const single =
    scored.length === 1 || (scored[0].s >= 0.9 && scored[0].s - scored[1].s > 0.2)
      ? scored[0].l
      : null;
  return { data: scored.map((x) => x.l), single, filtered: true };
}

// ── Intent classifier ──────────────────────────────────────────────────────────

type Intent =
  | "dashboard"
  | "legisladores_list"
  | "legislador_detail"
  | "comisiones_list"
  | "comision_detail"
  | "proyectos_list"
  | "proyecto_detail"
  | "sesiones"
  | "leyes"
  | "votaciones"
  | "analytics_partido"
  | "autoridades"
  | "unknown";

function classifyIntent(q: string): { intent: Intent; params: Record<string, string> } {
  // Mesa Directiva: must be checked before the "diputado" branch, because
  // "presidente de la cámara de diputados" contains "diputados". A commission
  // mention takes precedence ("presidente de la comisión de salud" → comision),
  // so authorities only applies to chamber-level questions.
  if (
    !has(q, "comision", "comisión") &&
    (has(q, "autoridad", "autoridades", "mesa directiva") ||
      // role word + chamber context (e.g. "presidente de la cámara de diputados")
      (has(q, "presidente", "presidenta", "vicepresidente", "vicepresidenta", "secretario", "secretaria", "preside") &&
        has(q, "camara", "diputados", "honorable", "directiva", "preside")))
  )
    return { intent: "autoridades", params: {} };

  if (has(q, "dashboard", "resumen", "estadística", "total", "sistema legislativo", "panorama general"))
    return { intent: "dashboard", params: {} };

  if (has(q, "votación", "votacion", "votaciones", "votaron", "votó", "voto"))
    return { intent: "votaciones", params: {} };

  if (has(q, "ley", "leyes", "promulgad", "sancionad") && !has(q, "proyecto", "proyectos"))
    return { intent: "leyes", params: {} };

  if (has(q, "sesion", "sesiones", "plenaria", "próxima sesión", "reunión"))
    return { intent: "sesiones", params: {} };

  if (
    has(q, "cuántos", "cuantos", "distribución", "composición", "partido", "bancada") &&
    has(q, "diputado", "legislador", "parlamentar")
  )
    return { intent: "analytics_partido", params: {} };

  if (has(q, "comision", "comisión", "comicion", "comiscion", "comisiones")) {
    const id = extractId(q);
    if (id) return { intent: "comision_detail", params: { id } };
    return { intent: "comision_detail", params: { q } };
  }

  if (has(q, "proyecto", "expediente")) {
    const id = extractId(q);
    if (id) return { intent: "proyecto_detail", params: { id } };
    return { intent: "proyectos_list", params: { search: extractSearchTerm(q) } };
  }

  if (has(q, "diputado", "diputada", "legislador", "legisladora", "parlamentario", "parlamentaria")) {
    const id = extractId(q);
    if (id) return { intent: "legislador_detail", params: { id } };
    return { intent: "legisladores_list", params: { q } };
  }

  return { intent: "unknown", params: {} };
}

// ── Response formatters (return NO_DATA when nothing real is available) ─────────

function fmtDashboard(d: DashboardData): string {
  let r = `**Resumen del Sistema Legislativo — Cámara de Diputados**\n\n`;
  r += `• Total de diputados: **${d.totalLegisladores}**\n`;
  r += `• Comisiones permanentes: **${d.totalComisiones}**\n`;
  r += `• Sesiones este mes: **${d.sesionesEsteMes}**\n`;
  r += `• Proyectos presentados (histórico acumulado): **${d.proyectosHistoricos}**\n`;
  r += `• Leyes del período: **${d.leyesAprobadas}**\n`;
  if (d.sesionEnVivo) r += `\n🔴 **SESIÓN EN VIVO**: ${d.sesionEnVivo.tipo}\n`;
  if (d.proximasSesiones.length > 0) {
    r += `\n**Próximas sesiones:**\n`;
    d.proximasSesiones.forEach((s) => {
      r += `• ${s.tipo} — ${formatDate(s.fecha)} a las ${s.horaInicio}\n`;
    });
  }
  if (d.ultimosProyectos.length > 0) {
    r += `\n**Últimos proyectos:**\n`;
    d.ultimosProyectos.slice(0, 4).forEach((p) => {
      r += `• [${p.numero}] ${p.titulo} — ${p.estado}\n`;
    });
  }
  return r;
}

function fmtLegisladores(data: Legislador[], params: Record<string, string>): string {
  if (data.length === 0) return NO_DATA;
  const filter = params.search || params.partido || params.departamento;
  let r = filter
    ? `**Legisladores encontrados** (${data.length} resultado${data.length !== 1 ? "s" : ""})\n\n`
    : `**Cámara de Diputados** — ${data.length} legisladores\n\n`;
  data.slice(0, 15).forEach((l) => {
    r += `• **${l.nombre} ${l.apellido}** — ${l.partido} | ${l.departamento}\n`;
  });
  if (data.length > 15) r += `\n_...y ${data.length - 15} más. Refiná la búsqueda para ver más detalles._\n`;
  return r;
}

function fmtLegislador(l: Legislador | null): string {
  if (!l) return NO_DATA;
  let r = `**${l.cargo} ${l.nombre} ${l.apellido}**\n\n`;
  r += `• Partido: ${l.partido}\n`;
  if (l.bancada) r += `• Bancada: ${l.bancada}\n`;
  r += `• Departamento: ${l.departamento}\n`;
  r += `• Período: ${l.periodo}\n`;
  if (l.email) r += `• Email: ${l.email}\n`;
  if (l.bio) r += `\n${l.bio}\n`;
  if (l.comisiones.length > 0) r += `\nComisiones: ${l.comisiones.join(", ")}`;
  return r;
}

function fmtComisiones(data: Comision[]): string {
  if (data.length === 0) return NO_DATA;
  let r = `**Comisiones Permanentes — Cámara de Diputados** (${data.length})\n\n`;
  data.forEach((c) => {
    r += `• **${c.nombre}** — ${c.tipo}`;
    if (c.email) r += ` | ${c.email}`;
    r += "\n";
  });
  return r;
}

function fmtComision(c: Comision | null): string {
  if (!c) return NO_DATA;
  let r = `**Comisión de ${c.nombre}**\n\n`;
  r += `• Tipo: ${c.tipo} — Cámara de ${c.camara}\n`;
  r += `• Miembros (${c.miembros.length}): ${c.miembros.length > 0 ? c.miembros.join(", ") : "Sin datos en la fuente oficial"}\n`;
  if (c.email) r += `• Contacto: ${c.email}\n`;
  return r;
}

function fmtProyectos(data: Proyecto[], params: Record<string, string>): string {
  if (data.length === 0) return NO_DATA;
  const filter = params.search || params.estado;
  let r = filter
    ? `**Proyectos encontrados** (${data.length} resultado${data.length !== 1 ? "s" : ""})\n\n`
    : `**Proyectos de Ley** — ${data.length} proyectos recientes\n\n`;
  data.slice(0, 10).forEach((p) => {
    r += `• **[${p.numero}]** ${p.titulo}\n  Estado: ${p.estado} | Etapa: ${p.etapa} | Ingreso: ${formatDate(p.fechaIngreso)}\n`;
  });
  if (data.length > 10) r += `\n_...y ${data.length - 10} más._\n`;
  return r;
}

function fmtProyecto(p: Proyecto | null): string {
  if (!p) return NO_DATA;
  let r = `**Proyecto ${p.numero}**\n${p.titulo}\n\n`;
  r += `• Estado: ${p.estado}\n`;
  r += `• Etapa: ${p.etapa}\n`;
  r += `• Fecha de ingreso: ${formatDate(p.fechaIngreso)}\n`;
  r += `• Iniciativa: ${p.iniciativa}\n`;
  if (p.descripcion) r += `\n**Descripción:**\n${p.descripcion}\n`;
  if (p.historial.length > 0) {
    r += `\n**Historial legislativo:**\n`;
    p.historial.forEach((h) => {
      r += `• ${formatDate(h.fecha)} — ${h.evento}${h.descripcion ? `: ${h.descripcion}` : ""}\n`;
    });
  }
  if (p.appURL) r += `\nFicha oficial: ${p.appURL}`;
  return r;
}

function fmtSesiones(data: Sesion[]): string {
  if (data.length === 0) return NO_DATA;
  const programadas = data.filter((s) => s.estado === "programada" || s.estado === "en vivo");
  const completadas = data.filter((s) => s.estado === "completada");
  let r = `**Sesiones Legislativas**\n\n`;
  if (programadas.length > 0) {
    r += `**Próximas / en curso (${programadas.length}):**\n`;
    programadas.slice(0, 5).forEach((s) => {
      r += `• **${s.tipo}** — ${formatDate(s.fecha)} a las ${s.horaInicio}${s.estado === "en vivo" ? " 🔴 EN VIVO" : ""}\n`;
    });
  }
  if (completadas.length > 0) {
    r += `\n**Historial reciente (${completadas.length}):**\n`;
    completadas.slice(0, 5).forEach((s) => {
      r += `• ${s.tipo} — ${formatDate(s.fecha)} (${s.horaInicio}${s.horaFin ? `–${s.horaFin}` : ""})\n`;
    });
  }
  return r;
}

function fmtLeyes(data: Ley[]): string {
  if (data.length === 0) return NO_DATA;
  let r = `**Leyes del período legislativo actual** (${data.length})\n\n`;
  data.slice(0, 12).forEach((l) => {
    r += `• **Ley N° ${l.numero}** — ${l.titulo}\n  Sanción: ${formatDate(l.fechaSancion)}`;
    if (l.fechaPromulgacion) r += ` | Promulgación: ${formatDate(l.fechaPromulgacion)}`;
    r += "\n";
  });
  if (data.length > 12) r += `\n_...y ${data.length - 12} más._\n`;
  return r;
}

function fmtVotaciones(data: Votacion[]): string {
  if (data.length === 0) return NO_DATA;
  let r = `**Votaciones recientes — Cámara de Diputados** (${data.length})\n\n`;
  data.slice(0, 10).forEach((v) => {
    r += `• **${v.titulo}**\n  ${formatDate(v.fecha)} — ${v.resultado} | A favor: ${v.favor} · En contra: ${v.contra} · Abstención: ${v.abstenciones} · Ausentes: ${v.ausentes}\n`;
  });
  if (data.length > 10) r += `\n_...y ${data.length - 10} más._\n`;
  return r;
}

function fmtAutoridades(m: MesaDirectiva): string {
  if (!m || m.autoridades.length === 0) return NO_DATA;
  let r = `**Mesa Directiva — Cámara de Diputados**`;
  if (m.periodo) r += `\nPeríodo legislativo ${m.periodo}`;
  r += `\n\n`;
  m.autoridades.forEach((a) => {
    r += `• **${a.cargo}:** ${a.nombre}${a.partido ? ` (${a.partido})` : ""}\n`;
  });
  return r;
}

function fmtAnalyticsPartido(data: Legislador[]): string {
  if (data.length === 0) return NO_DATA;
  const partidos: Record<string, number> = {};
  data.forEach((l) => {
    partidos[l.partido] = (partidos[l.partido] ?? 0) + 1;
  });
  const ranking = Object.entries(partidos).sort((a, b) => b[1] - a[1]);
  let r = `**Composición por Partido — Cámara de Diputados**\nTotal: ${data.length} legisladores\n\n`;
  ranking.forEach(([partido, count], i) => {
    const pct = Math.round((count / data.length) * 100);
    r += `${i + 1}. **${partido}**: ${count} diputados (${pct}%)\n`;
  });
  return r;
}

// ── Main route ─────────────────────────────────────────────────────────────────

router.post("/ai/consult", async (req, res): Promise<void> => {
  const { pregunta } = req.body as { pregunta: string };

  if (!pregunta || typeof pregunta !== "string" || pregunta.trim().length === 0) {
    res.status(400).json({ error: "La pregunta es requerida" });
    return;
  }

  const { intent, params } = classifyIntent(pregunta);
  let respuesta = "";
  let tipo: string = intent;
  let datos: unknown = null;
  let fuentes: string[] = [];

  try {
    switch (intent) {
      case "dashboard": {
        const d = unwrap(await getDashboard());
        if (!d) throw new Error(NO_DATA);
        respuesta = fmtDashboard(d);
        datos = d;
        fuentes = ["/legislative/dashboard"];
        break;
      }

      case "legisladores_list": {
        const { data, single, filtered } = await resolveLegisladores(params.q ?? "");
        if (single) {
          const d = unwrap(await getLegisladorById(single.id));
          respuesta = fmtLegislador(d);
          datos = d;
          fuentes = ["/legislative/legisladores", `/legislative/legisladores/${single.id}`];
        } else {
          respuesta = fmtLegisladores(data, filtered ? { search: params.q ?? "" } : {});
          datos = data;
          fuentes = ["/legislative/legisladores"];
        }
        break;
      }

      case "legislador_detail": {
        if (params.id) {
          const d = unwrap(await getLegisladorById(params.id));
          respuesta = fmtLegislador(d);
          datos = d;
          fuentes = [`/legislative/legisladores/${params.id}`];
        } else {
          const { data, single, filtered } = await resolveLegisladores(params.q ?? params.search ?? "");
          if (single) {
            const d = unwrap(await getLegisladorById(single.id));
            respuesta = fmtLegislador(d);
            datos = d;
            fuentes = ["/legislative/legisladores", `/legislative/legisladores/${single.id}`];
          } else {
            respuesta = fmtLegisladores(data, filtered ? { search: params.q ?? params.search ?? "" } : {});
            datos = data;
            fuentes = ["/legislative/legisladores"];
          }
        }
        break;
      }

      case "comisiones_list": {
        const data = unwrap(await getComisiones()) ?? [];
        respuesta = fmtComisiones(data);
        datos = data;
        fuentes = ["/legislative/comisiones"];
        break;
      }

      case "comision_detail": {
        if (params.id) {
          const d = unwrap(await getComisionById(params.id));
          respuesta = fmtComision(d);
          datos = d;
          fuentes = [`/legislative/comisiones/${params.id}`];
        } else {
          const allComisiones = unwrap(await getComisiones()) ?? [];
          const found = bestMatch(params.q ?? pregunta, allComisiones, (c) => c.nombre, 0.5);
          if (found) {
            const d = unwrap(await getComisionById(found.id));
            respuesta = fmtComision(d);
            datos = d;
            fuentes = ["/legislative/comisiones", `/legislative/comisiones/${found.id}`];
          } else {
            respuesta = fmtComisiones(allComisiones);
            datos = allComisiones;
            fuentes = ["/legislative/comisiones"];
          }
        }
        break;
      }

      case "proyectos_list": {
        const data = unwrap(await getProyectos(params)) ?? [];
        respuesta = fmtProyectos(data, params);
        datos = data;
        fuentes = ["/legislative/proyectos"];
        break;
      }

      case "proyecto_detail": {
        if (params.id) {
          const d = unwrap(await getProyectoById(params.id));
          respuesta = fmtProyecto(d);
          datos = d;
          fuentes = [`/legislative/proyectos/${params.id}`];
        } else if (params.search) {
          const data = unwrap(await getProyectos({ search: params.search })) ?? [];
          if (data.length === 1) {
            const d = unwrap(await getProyectoById(data[0].id));
            respuesta = fmtProyecto(d);
            datos = d;
            fuentes = ["/legislative/proyectos", `/legislative/proyectos/${data[0].id}`];
          } else {
            respuesta = fmtProyectos(data, params);
            datos = data;
            fuentes = ["/legislative/proyectos"];
          }
        } else {
          const data = unwrap(await getProyectos()) ?? [];
          respuesta = fmtProyectos(data, params);
          datos = data;
          fuentes = ["/legislative/proyectos"];
        }
        break;
      }

      case "sesiones": {
        const data = unwrap(await getSesiones()) ?? [];
        respuesta = fmtSesiones(data);
        datos = data;
        fuentes = ["/legislative/sesiones"];
        break;
      }

      case "leyes": {
        const data = unwrap(await getLeyes()) ?? [];
        respuesta = fmtLeyes(data);
        datos = data;
        fuentes = ["/legislative/leyes"];
        break;
      }

      case "votaciones": {
        const data = unwrap(await getVotaciones()) ?? [];
        respuesta = fmtVotaciones(data);
        datos = data;
        fuentes = ["/legislative/votaciones"];
        break;
      }

      case "analytics_partido": {
        const data = unwrap(await getLegisladores()) ?? [];
        respuesta = fmtAnalyticsPartido(data);
        datos = data;
        fuentes = ["/legislative/legisladores"];
        break;
      }

      case "autoridades": {
        const m = unwrap(await getAutoridades());
        if (!m) throw new Error(NO_DATA);
        respuesta = fmtAutoridades(m);
        datos = m;
        fuentes = ["diputados.gov.py/institucional/mesa-directiva"];
        break;
      }

      default: {
        // Last-resort fuzzy resolution: the user may have named a commission or
        // a deputy without a trigger word, or misspelled it badly.
        const comisiones = unwrap(await getComisiones()) ?? [];
        const comMatch = bestMatch(pregunta, comisiones, (c) => c.nombre, 0.6, true);
        if (comMatch) {
          const d = unwrap(await getComisionById(comMatch.id));
          respuesta = fmtComision(d);
          datos = d;
          tipo = "comision_detail";
          fuentes = ["/legislative/comisiones", `/legislative/comisiones/${comMatch.id}`];
          break;
        }
        const { single } = await resolveLegisladores(pregunta, true);
        if (single) {
          const d = unwrap(await getLegisladorById(single.id));
          respuesta = fmtLegislador(d);
          datos = d;
          tipo = "legislador_detail";
          fuentes = ["/legislative/legisladores", `/legislative/legisladores/${single.id}`];
          break;
        }

        respuesta =
          `Soy el Asistente Legislativo de la Cámara de Diputados del Paraguay.\n\n` +
          `Puedo consultarte información directamente desde las fuentes oficiales sincronizadas:\n\n` +
          `• **Autoridades** — Mesa Directiva (presidente, vicepresidentes, secretarios)\n` +
          `• **Diputados** — lista, búsqueda por nombre, partido o departamento\n` +
          `• **Comisiones** — composición y miembros\n` +
          `• **Proyectos de ley** — estado, etapa, historial\n` +
          `• **Sesiones** — próximas y completadas\n` +
          `• **Leyes** — leyes aprobadas y promulgadas\n` +
          `• **Votaciones** — resultados de votaciones recientes\n` +
          `• **Estadísticas** — composición por partido\n\n` +
          `Ejemplos:\n` +
          `"¿Quién integra la Comisión de Salud?"\n` +
          `"¿Qué proyectos están en tratamiento?"\n` +
          `"¿Cuántos diputados hay por partido?"`;
        tipo = "ayuda";
        fuentes = [];
        break;
      }
    }
  } catch (err) {
    req.log.error({ err }, "ai consult failed");
    respuesta = NO_DATA;
    tipo = "error";
    fuentes = [];
  }

  // When there is no real data, the response must be EXACTLY the NO_DATA phrase.
  if (respuesta === NO_DATA) {
    datos = null;
    fuentes = [];
  } else if (fuentes.length > 0) {
    respuesta += `\n\n_Fuente: ${fuentes.join(" · ")}_`;
  }

  res.json({ respuesta, tipo, datos, fuentes });
});

export default router;
