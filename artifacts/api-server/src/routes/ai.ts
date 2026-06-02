import { Router, type IRouter } from "express";
import type { Request } from "express";
import OpenAI from "openai";
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
} from "../lib/congress";

const router: IRouter = Router();

// Real LLM (user-provided OpenAI key). When absent, the assistant falls back to
// the deterministic keyword engine below.
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Exact phrase required when no data exists in the official synchronized sources.
const NO_DATA = "No existen datos disponibles en las fuentes oficiales sincronizadas.";

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

  if (has(q, "comision", "comisión")) {
    const id = extractId(q);
    if (id) return { intent: "comision_detail", params: { id } };
    return { intent: "comision_detail", params: { search: extractSearchTerm(q) } };
  }

  if (has(q, "proyecto", "expediente")) {
    const id = extractId(q);
    if (id) return { intent: "proyecto_detail", params: { id } };
    return { intent: "proyectos_list", params: { search: extractSearchTerm(q) } };
  }

  if (has(q, "diputado", "diputada", "legislador", "legisladora", "parlamentario", "parlamentaria")) {
    const id = extractId(q);
    if (id) return { intent: "legislador_detail", params: { id } };

    const depts = [
      "asunción", "central", "alto paraná", "itapúa", "caaguazú", "san pedro", "cordillera",
      "concepción", "amambay", "guairá", "misiones", "paraguarí", "canindeyú", "caazapá", "alto paraguay",
    ];
    for (const dept of depts) {
      if (norm(q).includes(dept)) return { intent: "legisladores_list", params: { departamento: dept } };
    }

    const term = extractSearchTerm(q);
    if (term.length > 2) return { intent: "legisladores_list", params: { search: term } };
    return { intent: "legisladores_list", params: {} };
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

// ── LLM-backed assistant (real AI, grounded on official data) ────────────────────

const SYSTEM_PROMPT = `Sos el "Asistente Legislativo" oficial de la Honorable Cámara de Diputados de la República del Paraguay.

ALCANCE — MUY IMPORTANTE:
- SOLO respondés preguntas relacionadas con la Cámara de Diputados del Paraguay: diputados/legisladores, comisiones, proyectos de ley, sesiones, leyes, votaciones, autoridades (Mesa Directiva) y estadísticas de la Cámara.
- Si la pregunta NO trata sobre la Cámara de Diputados (por ejemplo: clima, matemática, deportes, otros países, el Senado, temas personales, programación, etc.), llamá a la herramienta "fuera_de_alcance" y NO llames a ninguna otra herramienta. Nunca uses herramientas de datos para preguntas fuera de tema.

REGLAS DE DATOS:
- Usá SIEMPRE las herramientas para obtener datos reales. Nunca inventes nombres, números, fechas ni resultados.
- Si las herramientas no devuelven información que responda la pregunta, decílo con honestidad (no inventes).
- Las consultas pueden venir mal escritas, incompletas o en lenguaje coloquial: interpretá la intención y hacé coincidencias aproximadas con los nombres reales (ej. "industrial y comercio" → "Industria, Comercio, Turismo y Cooperativismo").

ESTILO:
- Respondé en español, de forma clara y concisa, usando markdown con viñetas cuando ayude.
- No menciones herramientas, funciones internas, ni detalles técnicos del sistema.`;

type ToolResult = { result: unknown; fuente: string };

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listar_diputados",
      description:
        "Lista diputados de la Cámara. Permite filtrar por nombre/apellido (search), partido o departamento. Útil para conteos por partido o búsquedas generales.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Texto para buscar por nombre o apellido" },
          partido: { type: "string", description: "Nombre del partido político" },
          departamento: { type: "string", description: "Departamento (ej. Central, Asunción)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detalle_diputado",
      description: "Devuelve el detalle completo de un diputado por su id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_comisiones",
      description:
        "Lista TODAS las comisiones permanentes con sus miembros. Usalo para preguntas sobre qué diputados integran una comisión o qué comisiones existen.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "detalle_comision",
      description: "Devuelve el detalle de una comisión (incluye miembros) por su id.",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_proyectos",
      description: "Lista proyectos de ley. Permite filtrar por texto (search) o estado.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string" },
          estado: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detalle_proyecto",
      description: "Devuelve el detalle de un proyecto de ley (incluye historial) por su id o número.",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_sesiones",
      description: "Lista sesiones legislativas (próximas, en vivo y completadas).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_leyes",
      description: "Lista leyes sancionadas/promulgadas del período. Permite filtrar por texto (search).",
      parameters: { type: "object", properties: { search: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_votaciones",
      description: "Lista votaciones recientes de la Cámara con sus resultados.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "autoridades_mesa_directiva",
      description: "Devuelve las autoridades de la Cámara (Mesa Directiva): presidente, vicepresidentes y secretarios.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "resumen_dashboard",
      description: "Devuelve un resumen general del sistema legislativo (totales y novedades).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "fuera_de_alcance",
      description:
        "Usar SOLO cuando la pregunta NO trata sobre la Cámara de Diputados del Paraguay (ej. clima, deportes, matemática, el Senado, otros países, temas personales). No devuelve datos: indica que la consulta está fuera de alcance.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Breve motivo por el que está fuera de alcance" },
        },
      },
    },
  },
];

const OUT_OF_SCOPE_MSG =
  "Solo puedo responder consultas sobre la Honorable Cámara de Diputados del Paraguay: diputados, comisiones, proyectos de ley, sesiones, leyes, votaciones, autoridades (Mesa Directiva) y estadísticas de la Cámara.\n\n¿Sobre cuál de estos temas te puedo ayudar?";

async function executeTool(name: string, args: Record<string, string>): Promise<ToolResult> {
  switch (name) {
    case "listar_diputados": {
      const data = await getLegisladores(args);
      return {
        result: data.map((l) => ({
          id: l.id,
          nombre: `${l.nombre} ${l.apellido}`,
          partido: l.partido,
          departamento: l.departamento,
          cargo: l.cargo,
          comisiones: l.comisiones,
        })),
        fuente: "/legislative/legisladores",
      };
    }
    case "detalle_diputado": {
      const d = await getLegisladorById(args.id);
      return { result: d, fuente: `/legislative/legisladores/${args.id}` };
    }
    case "listar_comisiones": {
      const data = await getComisiones();
      return {
        result: data.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          tipo: c.tipo,
          email: c.email,
          miembros: c.miembros,
        })),
        fuente: "/legislative/comisiones",
      };
    }
    case "detalle_comision": {
      const d = await getComisionById(args.id);
      return { result: d, fuente: `/legislative/comisiones/${args.id}` };
    }
    case "listar_proyectos": {
      const { data } = await getProyectos(args);
      return {
        result: data.map((p) => ({
          id: p.id,
          numero: p.numero,
          titulo: p.titulo,
          estado: p.estado,
          etapa: p.etapa,
          fechaIngreso: p.fechaIngreso,
        })),
        fuente: "/legislative/proyectos",
      };
    }
    case "detalle_proyecto": {
      const d = await getProyectoById(args.id);
      return { result: d, fuente: `/legislative/proyectos/${args.id}` };
    }
    case "listar_sesiones": {
      const { data } = await getSesiones();
      return {
        result: data.map((s) => ({
          tipo: s.tipo,
          fecha: s.fecha,
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          estado: s.estado,
        })),
        fuente: "/legislative/sesiones",
      };
    }
    case "listar_leyes": {
      const data = await getLeyes(args);
      return {
        result: data.map((l) => ({
          numero: l.numero,
          titulo: l.titulo,
          fechaSancion: l.fechaSancion,
          fechaPromulgacion: l.fechaPromulgacion,
        })),
        fuente: "/legislative/leyes",
      };
    }
    case "listar_votaciones": {
      const data = await getVotaciones();
      return {
        result: data.map((v) => ({
          titulo: v.titulo,
          fecha: v.fecha,
          resultado: v.resultado,
          favor: v.favor,
          contra: v.contra,
          abstenciones: v.abstenciones,
          ausentes: v.ausentes,
        })),
        fuente: "/legislative/votaciones",
      };
    }
    case "autoridades_mesa_directiva": {
      const m = await getAutoridades();
      return { result: m, fuente: "diputados.gov.py/institucional/mesa-directiva" };
    }
    case "resumen_dashboard": {
      const d = await getDashboard();
      return { result: d, fuente: "/legislative/dashboard" };
    }
    default:
      return { result: { error: "herramienta desconocida" }, fuente: "" };
  }
}

type LlmResult = { respuesta: string; datos: Record<string, unknown>; fuentes: string[] };

async function llmConsult(
  client: OpenAI,
  pregunta: string,
  req: Request,
): Promise<LlmResult | null> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: pregunta },
  ];
  const fuentes = new Set<string>();
  const datos: Record<string, unknown> = {};
  let dataToolUsed = false;

  for (let turn = 0; turn < 5; turn++) {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages,
      tools: TOOLS,
      // Force a tool decision on the first turn so the model must either fetch
      // official data or explicitly mark the question out of scope — it can
      // never answer ungrounded.
      tool_choice: turn === 0 ? "required" : "auto",
    });

    const msg = completion.choices[0]?.message;
    if (!msg) return null;
    messages.push(msg);

    const toolCalls = msg.tool_calls ?? [];
    if (toolCalls.length === 0) {
      // A final text answer is only trustworthy if it was grounded on at least
      // one successful data tool call; otherwise fall back to the keyword engine.
      if (!dataToolUsed || !msg.content?.trim()) return null;
      return { respuesta: msg.content, datos, fuentes: [...fuentes] };
    }

    for (const tc of toolCalls) {
      if (tc.type !== "function") continue;

      // Scope gate: a controlled refusal, independent of the model's free text.
      if (tc.function.name === "fuera_de_alcance") {
        return { respuesta: OUT_OF_SCOPE_MSG, datos: {}, fuentes: [] };
      }

      let parsed: Record<string, string> = {};
      try {
        parsed = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        parsed = {};
      }
      let toolOutput: ToolResult;
      try {
        toolOutput = await executeTool(tc.function.name, parsed);
        dataToolUsed = true;
      } catch (err) {
        req.log.error({ err, tool: tc.function.name }, "ai tool execution failed");
        toolOutput = { result: { error: "no se pudo obtener el dato" }, fuente: "" };
      }
      if (toolOutput.fuente) fuentes.add(toolOutput.fuente);
      datos[tc.function.name] = toolOutput.result;
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(toolOutput.result).slice(0, 60000),
      });
    }
  }

  // Tool-call budget exhausted without a final text answer.
  return null;
}

// ── Main route ─────────────────────────────────────────────────────────────────

router.post("/ai/consult", async (req, res): Promise<void> => {
  const { pregunta } = req.body as { pregunta: string };

  if (!pregunta || typeof pregunta !== "string" || pregunta.trim().length === 0) {
    res.status(400).json({ error: "La pregunta es requerida" });
    return;
  }

  // Preferred path: real LLM grounded on official data via tool-calling.
  if (openai) {
    try {
      const llm = await llmConsult(openai, pregunta, req);
      if (llm && llm.respuesta.trim().length > 0) {
        let respuesta = llm.respuesta.trim();
        if (llm.fuentes.length > 0) respuesta += `\n\n_Fuente: ${llm.fuentes.join(" · ")}_`;
        res.json({ respuesta, tipo: "ia", datos: llm.datos, fuentes: llm.fuentes });
        return;
      }
    } catch (err) {
      req.log.error({ err }, "llm consult failed, falling back to keyword engine");
    }
  }

  const { intent, params } = classifyIntent(pregunta);
  let respuesta = "";
  let tipo: string = intent;
  let datos: unknown = null;
  let fuentes: string[] = [];

  try {
    switch (intent) {
      case "dashboard": {
        const d = await getDashboard();
        respuesta = fmtDashboard(d);
        datos = d;
        fuentes = ["/legislative/dashboard"];
        break;
      }

      case "legisladores_list": {
        const data = await getLegisladores(params);
        respuesta = fmtLegisladores(data, params);
        datos = data;
        fuentes = ["/legislative/legisladores"];
        break;
      }

      case "legislador_detail": {
        if (params.id) {
          const d = await getLegisladorById(params.id);
          respuesta = fmtLegislador(d);
          datos = d;
          fuentes = [`/legislative/legisladores/${params.id}`];
        } else if (params.search) {
          const data = await getLegisladores({ search: params.search });
          if (data.length === 1) {
            const d = await getLegisladorById(data[0].id);
            respuesta = fmtLegislador(d);
            datos = d;
            fuentes = ["/legislative/legisladores", `/legislative/legisladores/${data[0].id}`];
          } else {
            respuesta = fmtLegisladores(data, params);
            datos = data;
            fuentes = ["/legislative/legisladores"];
          }
        } else {
          const data = await getLegisladores();
          respuesta = fmtLegisladores(data, params);
          datos = data;
          fuentes = ["/legislative/legisladores"];
        }
        break;
      }

      case "comisiones_list": {
        const data = await getComisiones();
        respuesta = fmtComisiones(data);
        datos = data;
        fuentes = ["/legislative/comisiones"];
        break;
      }

      case "comision_detail": {
        if (params.id) {
          const d = await getComisionById(params.id);
          respuesta = fmtComision(d);
          datos = d;
          fuentes = [`/legislative/comisiones/${params.id}`];
        } else {
          const allComisiones = await getComisiones();
          const search = norm(params.search ?? pregunta);
          const found = allComisiones.find(
            (c) => norm(c.nombre).includes(search) || search.includes(norm(c.nombre).split(" ")[0]),
          );
          if (found) {
            const d = await getComisionById(found.id);
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
        const { data } = await getProyectos(params);
        respuesta = fmtProyectos(data, params);
        datos = data;
        fuentes = ["/legislative/proyectos"];
        break;
      }

      case "proyecto_detail": {
        if (params.id) {
          const d = await getProyectoById(params.id);
          respuesta = fmtProyecto(d);
          datos = d;
          fuentes = [`/legislative/proyectos/${params.id}`];
        } else if (params.search) {
          const { data } = await getProyectos({ search: params.search });
          if (data.length === 1) {
            const d = await getProyectoById(data[0].id);
            respuesta = fmtProyecto(d);
            datos = d;
            fuentes = ["/legislative/proyectos", `/legislative/proyectos/${data[0].id}`];
          } else {
            respuesta = fmtProyectos(data, params);
            datos = data;
            fuentes = ["/legislative/proyectos"];
          }
        } else {
          const { data } = await getProyectos();
          respuesta = fmtProyectos(data, params);
          datos = data;
          fuentes = ["/legislative/proyectos"];
        }
        break;
      }

      case "sesiones": {
        const { data } = await getSesiones();
        respuesta = fmtSesiones(data);
        datos = data;
        fuentes = ["/legislative/sesiones"];
        break;
      }

      case "leyes": {
        const data = await getLeyes();
        respuesta = fmtLeyes(data);
        datos = data;
        fuentes = ["/legislative/leyes"];
        break;
      }

      case "votaciones": {
        const data = await getVotaciones();
        respuesta = fmtVotaciones(data);
        datos = data;
        fuentes = ["/legislative/votaciones"];
        break;
      }

      case "analytics_partido": {
        const data = await getLegisladores();
        respuesta = fmtAnalyticsPartido(data);
        datos = data;
        fuentes = ["/legislative/legisladores"];
        break;
      }

      case "autoridades": {
        const m = await getAutoridades();
        respuesta = fmtAutoridades(m);
        datos = m;
        fuentes = ["diputados.gov.py/institucional/mesa-directiva"];
        break;
      }

      default: {
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
