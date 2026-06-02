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
} from "../lib/congress";

const router: IRouter = Router();

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
