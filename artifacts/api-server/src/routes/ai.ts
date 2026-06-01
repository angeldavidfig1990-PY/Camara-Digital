import { Router, type IRouter } from "express";
import {
  serviceLegisladores,
  serviceLegisladorById,
  serviceComisiones,
  serviceComisionById,
  serviceProyectos,
  serviceProyectoById,
  serviceSesiones,
  serviceLeyes,
  serviceDashboard,
} from "./legislative";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function has(text: string, ...terms: string[]): boolean {
  const n = norm(text);
  return terms.some(t => n.includes(norm(t)));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

// Extract a possible numeric ID or expedition number from the query
function extractId(q: string): string | null {
  const m = q.match(/\b(\d{4,})\b/) ?? q.match(/([A-Z]-\d+\/\d+)/i);
  return m ? m[1] : null;
}

// Extract possible name tokens for searching
function extractSearchTerm(q: string): string {
  return q
    .replace(/(?:diputad[ao]|legislador[a]?|comision|proyecto|ley|sesion|partido|de|del|la|el|los|las|que|hay|en|por|con|sobre|cuales|cual|quien|quienes|integra|tiene|tienen|impulso|impuls[oó])\s*/gi, "")
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
  | "analytics_partido"
  | "analytics_proyectos_partido"
  | "unknown";

function classifyIntent(q: string): { intent: Intent; params: Record<string, string> } {
  // Dashboard / resumen general
  if (has(q, "dashboard", "resumen", "estadística", "total", "sistema legislativo", "panorama general"))
    return { intent: "dashboard", params: {} };

  // Leyes
  if (has(q, "ley", "leyes", "promulgad", "sancionad") && !has(q, "proyecto", "proyectos"))
    return { intent: "leyes", params: {} };

  // Sesiones
  if (has(q, "sesion", "sesiones", "plenaria", "próxima sesión", "reunión"))
    return { intent: "sesiones", params: {} };

  // Analytics: distribución por partido
  if (has(q, "cuántos", "cuantos", "distribución", "composición", "partido", "bancada") &&
      has(q, "diputado", "legislador", "parlamentar"))
    return { intent: "analytics_partido", params: {} };

  // Analytics: qué partido impulsa más proyectos
  if (has(q, "partido", "bancada") && has(q, "proyecto", "impulsa", "presenta"))
    return { intent: "analytics_proyectos_partido", params: {} };

  // Comision detail — named commission or "integra"
  if (has(q, "comision", "comisión")) {
    const id = extractId(q);
    if (id) return { intent: "comision_detail", params: { id } };
    const term = extractSearchTerm(q);
    return { intent: "comision_detail", params: { search: term } };
  }

  // Proyecto detail
  if (has(q, "proyecto", "expediente")) {
    const id = extractId(q);
    if (id) return { intent: "proyecto_detail", params: { id } };
    const term = extractSearchTerm(q);
    return { intent: "proyectos_list", params: { search: term } };
  }

  // Legislador detail or filtered list
  if (has(q, "diputado", "diputada", "legislador", "legisladora", "parlamentario", "parlamentaria")) {
    const id = extractId(q);
    if (id) return { intent: "legislador_detail", params: { id } };

    // By department?
    const depts = ["asunción", "central", "alto paraná", "itapúa", "caaguazú", "san pedro", "cordillera",
      "concepción", "amambay", "guairá", "misiones", "paraguarí", "canindeyú", "caazapá", "alto paraguay"];
    for (const dept of depts) {
      if (norm(q).includes(dept)) return { intent: "legisladores_list", params: { departamento: dept } };
    }

    const term = extractSearchTerm(q);
    if (term.length > 2) return { intent: "legisladores_list", params: { search: term } };
    return { intent: "legisladores_list", params: {} };
  }

  return { intent: "unknown", params: {} };
}

// ── Response formatters ────────────────────────────────────────────────────────

function fmtDashboard(d: Awaited<ReturnType<typeof serviceDashboard>>): string {
  let r = `**Resumen del Sistema Legislativo — Cámara de Diputados**\n\n`;
  r += `• Total de diputados: **${d.totalLegisladores}**\n`;
  r += `• Comisiones permanentes: **${d.totalComisiones}**\n`;
  r += `• Sesiones este mes: **${d.sesionesEsteMes}**\n`;
  r += `• Proyectos en trámite: **${d.proyectosPendientes}**\n`;
  r += `• Leyes aprobadas (${new Date().getFullYear()}): **${d.leyesAprobadas}**\n`;
  if (d.sesionEnVivo) r += `\n🔴 **SESIÓN EN VIVO**: ${(d.sesionEnVivo as { tipo: string }).tipo}\n`;
  if (d.proximasSesiones.length > 0) {
    r += `\n**Próximas sesiones:**\n`;
    d.proximasSesiones.forEach((s: { tipo: string; fecha: string; horaInicio: string }) => {
      r += `• ${s.tipo} — ${formatDate(s.fecha)} a las ${s.horaInicio}\n`;
    });
  }
  if (d.ultimosProyectos.length > 0) {
    r += `\n**Últimos proyectos:**\n`;
    d.ultimosProyectos.slice(0, 4).forEach((p: { numero: string; titulo: string; estado: string }) => {
      r += `• [${p.numero}] ${p.titulo} — ${p.estado}\n`;
    });
  }
  return r;
}

function fmtLegisladores(
  data: Awaited<ReturnType<typeof serviceLegisladores>>,
  params: Record<string, string>
): string {
  if (data.length === 0) return "No hay datos disponibles en el sistema actual.";
  const filter = params.search || params.partido || params.departamento;
  let r = filter
    ? `**Legisladores encontrados** (${data.length} resultado${data.length !== 1 ? "s" : ""})\n\n`
    : `**Cámara de Diputados** — ${data.length} legisladores\n\n`;
  data.slice(0, 15).forEach(l => {
    r += `• **${l.nombre} ${l.apellido}** — ${l.partido} | ${l.departamento}\n`;
  });
  if (data.length > 15) r += `\n_...y ${data.length - 15} más. Refiná la búsqueda para ver más detalles._\n`;
  return r;
}

function fmtLegislador(l: Awaited<ReturnType<typeof serviceLegisladorById>>): string {
  if (!l) return "No hay datos disponibles en el sistema actual.";
  let r = `**${l.cargo} ${l.nombre} ${l.apellido}**\n\n`;
  r += `• Partido: ${l.partido}\n`;
  r += `• Bancada: ${l.bancada}\n`;
  r += `• Departamento: ${l.departamento}\n`;
  r += `• Período: ${l.periodo}\n`;
  if (l.email) r += `• Email: ${l.email}\n`;
  if (l.bio) r += `\n${l.bio}\n`;
  if (l.comisiones && l.comisiones.length > 0) r += `\nComisiones: ${l.comisiones.join(", ")}`;
  return r;
}

function fmtComisiones(data: Awaited<ReturnType<typeof serviceComisiones>>): string {
  if (data.length === 0) return "No hay datos disponibles en el sistema actual.";
  let r = `**Comisiones Permanentes — Cámara de Diputados** (${data.length})\n\n`;
  data.forEach(c => {
    r += `• **${c.nombre}** — ${c.tipo}`;
    if (c.presidente) r += ` | Pdte: ${c.presidente}`;
    if (c.email) r += ` | ${c.email}`;
    r += "\n";
  });
  return r;
}

function fmtComision(c: Awaited<ReturnType<typeof serviceComisionById>>): string {
  if (!c) return "No hay datos disponibles en el sistema actual.";
  let r = `**Comisión de ${c.nombre}**\n\n`;
  r += `• Tipo: ${c.tipo} — Cámara de ${c.camara}\n`;
  if (c.presidente) r += `• Presidente: ${c.presidente}\n`;
  if (c.vicepresidente) r += `• Vicepresidente: ${c.vicepresidente}\n`;
  r += `• Miembros (${c.miembros.length}): ${c.miembros.length > 0 ? c.miembros.join(", ") : "Sin datos en sistema"}\n`;
  if (c.email) r += `• Contacto: ${c.email}\n`;
  return r;
}

function fmtProyectos(
  data: Awaited<ReturnType<typeof serviceProyectos>>,
  params: Record<string, string>
): string {
  if (data.length === 0) return "No hay datos disponibles en el sistema actual.";
  const filter = params.search || params.estado;
  let r = filter
    ? `**Proyectos encontrados** (${data.length} resultado${data.length !== 1 ? "s" : ""})\n\n`
    : `**Proyectos de Ley** — ${data.length} proyectos\n\n`;
  data.slice(0, 10).forEach(p => {
    r += `• **[${p.numero}]** ${p.titulo}\n  Estado: ${p.estado} | Etapa: ${p.etapa} | Ingreso: ${formatDate(p.fechaIngreso)}\n`;
  });
  if (data.length > 10) r += `\n_...y ${data.length - 10} más._\n`;
  return r;
}

function fmtProyecto(p: Awaited<ReturnType<typeof serviceProyectoById>>): string {
  if (!p) return "No hay datos disponibles en el sistema actual.";
  let r = `**Proyecto ${p.numero}**\n${p.titulo}\n\n`;
  r += `• Estado: ${p.estado}\n`;
  r += `• Etapa: ${p.etapa}\n`;
  r += `• Fecha de ingreso: ${formatDate(p.fechaIngreso)}\n`;
  r += `• Iniciativa: ${p.iniciativa}\n`;
  if (p.comision) r += `• Comisión asignada: ${p.comision}\n`;
  if (p.descripcion) r += `\n**Descripción:**\n${p.descripcion}\n`;
  if (p.historial && p.historial.length > 0) {
    r += `\n**Historial legislativo:**\n`;
    p.historial.forEach(h => { r += `• ${formatDate(h.fecha)} — ${h.evento}: ${h.descripcion}\n`; });
  }
  if (p.appURL) r += `\nFicha oficial: ${p.appURL}`;
  return r;
}

function fmtSesiones(data: Awaited<ReturnType<typeof serviceSesiones>>): string {
  if (data.length === 0) return "No hay datos disponibles en el sistema actual.";
  const programadas = data.filter(s => s.estado === "programada");
  const completadas = data.filter(s => s.estado === "completada");
  let r = `**Sesiones Legislativas**\n\n`;
  if (programadas.length > 0) {
    r += `**Programadas (${programadas.length}):**\n`;
    programadas.forEach(s => {
      r += `• **${s.tipo}** — ${formatDate(s.fecha)} a las ${s.horaInicio}\n`;
      if (s.orden_del_dia?.length) r += `  Orden del día: ${s.orden_del_dia.join(" · ")}\n`;
    });
  }
  if (completadas.length > 0) {
    r += `\n**Historial reciente (${completadas.length}):**\n`;
    completadas.slice(0, 4).forEach(s => {
      r += `• ${s.tipo} — ${formatDate(s.fecha)} (${s.horaInicio}${s.horaFin ? `–${s.horaFin}` : ""})\n`;
      if (s.descripcion) r += `  ${s.descripcion}\n`;
    });
  }
  return r;
}

function fmtLeyes(data: Awaited<ReturnType<typeof serviceLeyes>>): string {
  if (data.length === 0) return "No hay datos disponibles en el sistema actual.";
  const anio = new Date().getFullYear();
  let r = `**Leyes Aprobadas ${anio}** (${data.length})\n\n`;
  data.forEach(l => {
    r += `• **Ley N° ${l.numero}** — ${l.titulo}\n  Sanción: ${formatDate(l.fechaSancion)}`;
    if (l.fechaPromulgacion) r += ` | Promulgación: ${formatDate(l.fechaPromulgacion)}`;
    r += "\n";
  });
  return r;
}

function fmtAnalyticsPartido(data: Awaited<ReturnType<typeof serviceLegisladores>>): string {
  if (data.length === 0) return "No hay datos disponibles en el sistema actual.";
  const partidos: Record<string, number> = {};
  data.forEach(l => { partidos[l.partido] = (partidos[l.partido] ?? 0) + 1; });
  const ranking = Object.entries(partidos).sort((a, b) => b[1] - a[1]);
  let r = `**Composición por Partido — Cámara de Diputados**\nTotal: ${data.length} legisladores\n\n`;
  ranking.forEach(([partido, count], i) => {
    const pct = Math.round((count / data.length) * 100);
    r += `${i + 1}. **${partido}**: ${count} diputados (${pct}%)\n`;
  });
  return r;
}

async function fmtAnalyticsProyectosPartido(): Promise<string> {
  const [legData, proyData] = await Promise.all([
    serviceLegisladores(),
    serviceProyectos({ limit: 50 }),
  ]);
  const partidos: Record<string, number> = {};
  legData.forEach(l => { partidos[l.partido] = (partidos[l.partido] ?? 0); });
  proyData.forEach(p => {
    if (has(p.iniciativa, "parlamentaria", "legislativa")) {
      Object.keys(partidos).forEach(partido => {
        if (legData.some(l => l.partido === partido && has(p.titulo, l.apellido))) {
          partidos[partido]++;
        }
      });
    }
  });
  const total = proyData.filter(p => has(p.iniciativa, "parlamentaria")).length;
  let r = `**Proyectos de Iniciativa Parlamentaria** (${total} total)\n\n`;
  r += `Nota: La API no incluye autoría individual por diputado. Los proyectos disponibles son:\n\n`;
  proyData.slice(0, 8).forEach(p => {
    if (has(p.iniciativa, "parlamentaria", "legislativa")) {
      r += `• [${p.numero}] ${p.titulo} — ${p.estado}\n`;
    }
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
  let tipo = intent;
  let datos: unknown = null;
  let fuentes: string[] = [];

  try {
    switch (intent) {
      case "dashboard": {
        const d = await serviceDashboard();
        respuesta = fmtDashboard(d);
        datos = d;
        fuentes = ["/legislative/dashboard"];
        break;
      }

      case "legisladores_list": {
        const data = await serviceLegisladores(params);
        respuesta = fmtLegisladores(data, params);
        datos = data;
        fuentes = ["/legislative/legisladores"];
        break;
      }

      case "legislador_detail": {
        if (params.id) {
          const d = await serviceLegisladorById(params.id);
          respuesta = fmtLegislador(d);
          datos = d;
          fuentes = [`/legislative/legisladores/${params.id}`];
        } else if (params.search) {
          const data = await serviceLegisladores({ search: params.search });
          if (data.length === 1) {
            const d = await serviceLegisladorById(data[0].id);
            respuesta = fmtLegislador(d);
            datos = d;
            fuentes = [`/legislative/legisladores`, `/legislative/legisladores/${data[0].id}`];
          } else {
            respuesta = fmtLegisladores(data, params);
            datos = data;
            fuentes = ["/legislative/legisladores"];
          }
        } else {
          const data = await serviceLegisladores();
          respuesta = fmtLegisladores(data, params);
          datos = data;
          fuentes = ["/legislative/legisladores"];
        }
        break;
      }

      case "comisiones_list": {
        const data = await serviceComisiones();
        respuesta = fmtComisiones(data);
        datos = data;
        fuentes = ["/legislative/comisiones"];
        break;
      }

      case "comision_detail": {
        if (params.id) {
          const d = await serviceComisionById(params.id);
          respuesta = fmtComision(d);
          datos = d;
          fuentes = [`/legislative/comisiones/${params.id}`];
        } else {
          const allComisiones = await serviceComisiones();
          const search = norm(params.search ?? pregunta);
          const found = allComisiones.find(c => norm(c.nombre).includes(search) || search.includes(norm(c.nombre).split(" ")[0]));
          if (found) {
            const d = await serviceComisionById(found.id);
            respuesta = fmtComision(d);
            datos = d;
            fuentes = [`/legislative/comisiones`, `/legislative/comisiones/${found.id}`];
          } else {
            respuesta = fmtComisiones(allComisiones);
            datos = allComisiones;
            fuentes = ["/legislative/comisiones"];
          }
        }
        break;
      }

      case "proyectos_list": {
        const data = await serviceProyectos(params);
        respuesta = fmtProyectos(data, params);
        datos = data;
        fuentes = ["/legislative/proyectos"];
        break;
      }

      case "proyecto_detail": {
        if (params.id) {
          const d = await serviceProyectoById(params.id);
          respuesta = fmtProyecto(d);
          datos = d;
          fuentes = [`/legislative/proyectos/${params.id}`];
        } else if (params.search) {
          const data = await serviceProyectos({ search: params.search });
          if (data.length === 1) {
            const d = await serviceProyectoById(data[0].id);
            respuesta = fmtProyecto(d);
            datos = d;
            fuentes = [`/legislative/proyectos`, `/legislative/proyectos/${data[0].id}`];
          } else {
            respuesta = fmtProyectos(data, params);
            datos = data;
            fuentes = ["/legislative/proyectos"];
          }
        }
        break;
      }

      case "sesiones": {
        const data = await serviceSesiones();
        respuesta = fmtSesiones(data);
        datos = data;
        fuentes = ["/legislative/sesiones"];
        break;
      }

      case "leyes": {
        const data = await serviceLeyes();
        respuesta = fmtLeyes(data);
        datos = data;
        fuentes = ["/legislative/leyes"];
        break;
      }

      case "analytics_partido": {
        const data = await serviceLegisladores();
        respuesta = fmtAnalyticsPartido(data);
        datos = data;
        fuentes = ["/legislative/legisladores"];
        break;
      }

      case "analytics_proyectos_partido": {
        respuesta = await fmtAnalyticsProyectosPartido();
        fuentes = ["/legislative/proyectos", "/legislative/legisladores"];
        break;
      }

      default: {
        respuesta =
          `Soy el Asistente Legislativo de la Cámara de Diputados del Paraguay.\n\n` +
          `Puedo consultarte información directamente desde el sistema legislativo:\n\n` +
          `• **Diputados** — lista, búsqueda por nombre, partido o departamento\n` +
          `• **Comisiones** — composición, presidente y miembros\n` +
          `• **Proyectos de ley** — estado, etapa, historial\n` +
          `• **Sesiones** — próximas y completadas\n` +
          `• **Leyes** — leyes aprobadas y promulgadas\n` +
          `• **Estadísticas** — composición por partido, proyectos en trámite\n\n` +
          `Ejemplos:\n` +
          `"¿Quién integra la Comisión de Salud?"\n` +
          `"¿Qué proyectos están en tratamiento?"\n` +
          `"¿Cuántos diputados hay por partido?"`;
        tipo = "ayuda";
        fuentes = [];
        break;
      }
    }
  } catch {
    respuesta = "No se pudo obtener la información del sistema en este momento. Por favor, intentá nuevamente.";
    tipo = "error";
    fuentes = [];
  }

  // Append source attribution
  if (fuentes.length > 0) {
    respuesta += `\n\n_Fuente: ${fuentes.join(" · ")}_`;
  }

  res.json({ respuesta, tipo, datos, fuentes });
});

export default router;
