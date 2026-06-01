import { Router, type IRouter } from "express";
import { MOCK_LEGISLADORES, MOCK_COMISIONES, MOCK_SESIONES, MOCK_PROYECTOS, MOCK_LEYES } from "./legislative";

const router: IRouter = Router();

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchesQuery(text: string, query: string): boolean {
  return normalizeStr(text).includes(normalizeStr(query));
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

router.post("/ai/consult", async (req, res): Promise<void> => {
  const { pregunta } = req.body as { pregunta: string };

  if (!pregunta || typeof pregunta !== "string") {
    res.status(400).json({ error: "La pregunta es requerida" });
    return;
  }

  const q = normalizeStr(pregunta);

  // --- Intent: Legislador / Diputado ---
  const isAboutLegislador = q.includes("diputado") || q.includes("legislador") || q.includes("parlamentar");
  const isAboutComision = q.includes("comision") || q.includes("comité");
  const isAboutProyecto = q.includes("proyecto") || q.includes("expediente") || q.includes("ley");
  const isAboutSesion = q.includes("sesion") || q.includes("sesiones") || q.includes("reunion");
  const isAboutEstadistica = q.includes("cuantos") || q.includes("total") || q.includes("estadisticas");

  // Search for named entities
  const namedLegislador = MOCK_LEGISLADORES.find(l =>
    matchesQuery(`${l.nombre} ${l.apellido}`, q) ||
    matchesQuery(l.apellido, q)
  );

  const namedComision = MOCK_COMISIONES.find(c => matchesQuery(c.nombre, q));
  const namedProyecto = MOCK_PROYECTOS.find(p => matchesQuery(p.titulo, q) || p.numero === pregunta.trim());

  // --- Response logic ---

  if (namedLegislador) {
    const leg = namedLegislador;
    const proyectosLeg = MOCK_PROYECTOS.filter(p =>
      p.iniciativa === "Legislativa"
    ).slice(0, 3);
    let respuesta = `**Dip. ${leg.nombre} ${leg.apellido}**\n`;
    respuesta += `• Partido: ${leg.partido}\n`;
    respuesta += `• Departamento: ${leg.departamento}\n`;
    respuesta += `• Período: ${leg.periodo}\n`;
    respuesta += `• Comisiones: ${leg.comisiones.join(", ")}\n`;
    if (leg.bio) respuesta += `\n${leg.bio}`;
    if (proyectosLeg.length > 0) {
      respuesta += `\n\nProyectos relacionados:\n`;
      proyectosLeg.forEach(p => { respuesta += `• [${p.numero}] ${p.titulo} — ${p.estado}\n`; });
    }
    res.json({ respuesta, tipo: "legislador", datos: leg, fuentes: ["datos.congreso.gov.py"] });
    return;
  }

  if (namedComision || (isAboutComision && !namedLegislador)) {
    const com = namedComision ?? MOCK_COMISIONES[0];
    let respuesta = `**Comisión de ${com.nombre}**\n`;
    respuesta += `• Tipo: ${com.tipo} — Cámara de ${com.camara}\n`;
    if (com.presidente) respuesta += `• Presidente: ${com.presidente}\n`;
    if (com.vicepresidente) respuesta += `• Vicepresidente: ${com.vicepresidente}\n`;
    respuesta += `• Miembros (${com.miembros.length}): ${com.miembros.join(", ")}\n`;
    if (com.email) respuesta += `• Contacto: ${com.email}`;
    res.json({ respuesta, tipo: "comision", datos: com, fuentes: ["datos.congreso.gov.py"] });
    return;
  }

  if (namedProyecto || (isAboutProyecto && !isAboutComision)) {
    if (namedProyecto) {
      const p = namedProyecto;
      let respuesta = `**Proyecto ${p.numero}: ${p.titulo}**\n`;
      respuesta += `• Estado: ${p.estado}\n`;
      respuesta += `• Etapa: ${p.etapa}\n`;
      respuesta += `• Fecha de ingreso: ${formatDate(p.fechaIngreso)}\n`;
      respuesta += `• Iniciativa: ${p.iniciativa}\n`;
      if (p.comision) respuesta += `• Comisión: ${p.comision}\n`;
      if (p.descripcion) respuesta += `\n${p.descripcion}`;
      res.json({ respuesta, tipo: "proyecto", datos: p, fuentes: ["datos.congreso.gov.py"] });
      return;
    }

    // Leyes approved this year
    if (q.includes("aprobad") || q.includes("sancionad") || q.includes("promulgad")) {
      const anio = new Date().getFullYear();
      const leyes = MOCK_LEYES.filter(l => l.fechaSancion.startsWith(String(anio)));
      let respuesta = `**Leyes aprobadas en ${anio}** (${leyes.length} leyes)\n\n`;
      leyes.forEach(l => {
        respuesta += `• **Ley N° ${l.numero}**: ${l.titulo}\n  Sanción: ${formatDate(l.fechaSancion)}\n`;
      });
      respuesta += `\nFuente: Portal de Datos Abiertos del Congreso Nacional.`;
      res.json({ respuesta, tipo: "leyes", datos: leyes, fuentes: ["datos.congreso.gov.py"] });
      return;
    }

    const recentProjects = MOCK_PROYECTOS.slice(0, 5);
    let respuesta = `**Proyectos de ley recientes** (${MOCK_PROYECTOS.length} total)\n\n`;
    recentProjects.forEach(p => {
      respuesta += `• **[${p.numero}]** ${p.titulo}\n  Estado: ${p.estado}\n`;
    });
    res.json({ respuesta, tipo: "proyectos", datos: recentProjects, fuentes: ["datos.congreso.gov.py"] });
    return;
  }

  if (isAboutSesion) {
    const proximas = MOCK_SESIONES.filter(s => s.estado === "programada");
    let respuesta = `**Próximas sesiones** (${proximas.length} programadas)\n\n`;
    proximas.forEach(s => {
      respuesta += `• **${s.tipo}** — ${formatDate(s.fecha)} a las ${s.horaInicio}\n  ${s.descripcion ?? ""}\n`;
    });
    if (proximas.length === 0) respuesta = "No hay sesiones programadas en este momento.";
    res.json({ respuesta, tipo: "sesiones", datos: proximas, fuentes: ["datos.congreso.gov.py"] });
    return;
  }

  if (isAboutEstadistica || isAboutLegislador) {
    const partidos = MOCK_LEGISLADORES.reduce<Record<string, number>>((acc, l) => {
      acc[l.partido] = (acc[l.partido] ?? 0) + 1;
      return acc;
    }, {});
    let respuesta = `**Composición de la Cámara de Diputados**\n\n`;
    respuesta += `Total: ${MOCK_LEGISLADORES.length} diputados\n\n`;
    Object.entries(partidos).sort((a, b) => b[1] - a[1]).forEach(([partido, count]) => {
      respuesta += `• ${partido}: ${count} diputados\n`;
    });
    respuesta += `\nComisiones: ${MOCK_COMISIONES.length} comisiones permanentes`;
    res.json({ respuesta, tipo: "estadisticas", datos: { partidos, total: MOCK_LEGISLADORES.length }, fuentes: ["datos.congreso.gov.py"] });
    return;
  }

  // General response
  let respuesta = `Hola, soy el Asistente Legislativo de la Cámara de Diputados del Paraguay. Puedo ayudarte con:\n\n`;
  respuesta += `• **Diputados**: información sobre legisladores, sus comisiones y actividad\n`;
  respuesta += `• **Comisiones**: composición, presidente y miembros\n`;
  respuesta += `• **Proyectos de ley**: estado, etapa y historial\n`;
  respuesta += `• **Sesiones**: próximas sesiones y agenda\n`;
  respuesta += `• **Leyes**: leyes aprobadas y promulgadas\n\n`;
  respuesta += `Ejemplos:\n`;
  respuesta += `• "¿Quién integra la Comisión de Salud?"\n`;
  respuesta += `• "¿Qué proyectos están en tratamiento?"\n`;
  respuesta += `• "¿Qué leyes fueron aprobadas este año?"`;

  res.json({ respuesta, tipo: "ayuda", datos: null, fuentes: [] });
});

export default router;
