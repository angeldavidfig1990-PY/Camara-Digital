import { Router, type IRouter } from "express";
import {
  GetLegisladoresQueryParams,
  GetSesionesQueryParams,
  GetProyectosQueryParams,
  GetLeyesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CONGRESS_API_BASE = "https://datos.congreso.gov.py/opendata/api/data";

// ── Mock data (fallback when real API is unavailable) ──────────────────────────

const MOCK_LEGISLADORES = [
  { id: "101405", nombre: "María Rocío", apellido: "Abed de Zacarías", partido: "Asociación Nacional Republicana", bancada: "ANR Colorado", departamento: "Alto Paraná", cargo: "Diputada Titular", periodo: "2023-2028", foto: "http://silpy.congreso.gov.py/images/101405.jpg", email: "rocio_abed@diputados.gov.py", bio: "Diputada por Alto Paraná. Periodo legislativo 2023-2028.", comisiones: [] },
  { id: "101406", nombre: "Carlos", apellido: "Amarilla", partido: "Asociación Nacional Republicana", bancada: "ANR Colorado", departamento: "Caaguazú", cargo: "Diputado Titular", periodo: "2023-2028", foto: null, email: "camarilla@diputados.gov.py", bio: "Diputado por Caaguazú.", comisiones: [] },
  { id: "101407", nombre: "Miguel", apellido: "Aquino", partido: "Partido Liberal Radical Auténtico", bancada: "Liberal", departamento: "Central", cargo: "Diputado Titular", periodo: "2023-2028", foto: null, email: "maquino@diputados.gov.py", bio: "Diputado por Central.", comisiones: [] },
  { id: "101408", nombre: "Sandra", apellido: "Aranda", partido: "Asociación Nacional Republicana", bancada: "ANR Colorado", departamento: "Asunción", cargo: "Diputada Titular", periodo: "2023-2028", foto: null, email: "saranda@diputados.gov.py", bio: "Diputada por Asunción.", comisiones: [] },
  { id: "101409", nombre: "Jorge", apellido: "Aveiro", partido: "Frente Guasú", bancada: "Frente Guasú", departamento: "Itapúa", cargo: "Diputado Titular", periodo: "2023-2028", foto: null, email: "javeiro@diputados.gov.py", bio: "Diputado por Itapúa.", comisiones: [] },
  { id: "101410", nombre: "Lourdes", apellido: "Barboza", partido: "Partido Liberal Radical Auténtico", bancada: "Liberal", departamento: "Alto Paraná", cargo: "Diputada Titular", periodo: "2023-2028", foto: null, email: "lbarboza@diputados.gov.py", bio: "Diputada por Alto Paraná.", comisiones: [] },
  { id: "101411", nombre: "Antonio", apellido: "Benítez", partido: "Asociación Nacional Republicana", bancada: "ANR Colorado", departamento: "San Pedro", cargo: "Diputado Titular", periodo: "2023-2028", foto: null, email: "abenitez@diputados.gov.py", bio: "Diputado por San Pedro.", comisiones: [] },
  { id: "101412", nombre: "Diana", apellido: "Bogado", partido: "Asociación Nacional Republicana", bancada: "ANR Colorado", departamento: "Central", cargo: "Diputada Titular", periodo: "2023-2028", foto: null, email: "dbogado@diputados.gov.py", bio: "Diputada por Central.", comisiones: [] },
  { id: "101413", nombre: "Federico", apellido: "Cáceres", partido: "Honor Colorado", bancada: "Honor Colorado", departamento: "Alto Paraguay", cargo: "Diputado Titular", periodo: "2023-2028", foto: null, email: "fcaceres@diputados.gov.py", bio: "Diputado por Alto Paraguay.", comisiones: [] },
  { id: "101414", nombre: "Patricia", apellido: "Cazal", partido: "Asociación Nacional Republicana", bancada: "ANR Colorado", departamento: "Caazapá", cargo: "Diputada Titular", periodo: "2023-2028", foto: null, email: "pcazal@diputados.gov.py", bio: "Diputada por Caazapá.", comisiones: [] },
];

const MOCK_COMISIONES = [
  { id: "32", nombre: "Asuntos Constitucionales", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "cconstitucionales@diputados.gov.py", miembros: [] },
  { id: "33", nombre: "Asuntos Económicos y Financieros", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "a.economicoshcd@gmail.com", miembros: [] },
  { id: "34", nombre: "Legislación y Codificación", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "legislacion_codificacion@diputados.gov.py", miembros: [] },
  { id: "35", nombre: "Relaciones Exteriores", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "cexteriores@diputados.gov.py", miembros: [] },
  { id: "36", nombre: "Justicia, Trabajo y Previsión Social", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "cjusticia@diputados.gov.py", miembros: [] },
  { id: "37", nombre: "Derechos Humanos", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "derechoshumanos.hcd@gmail.com", miembros: [] },
  { id: "38", nombre: "Educación, Cultura y Culto", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "ceducacion@diputados.gov.py", miembros: [] },
  { id: "44", nombre: "Salud Pública", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "csalud@diputados.gov.py", miembros: [] },
  { id: "47", nombre: "Presupuesto", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "presupuesto@diputados.gov.py", miembros: [] },
  { id: "41", nombre: "Agricultura y Ganadería", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "hcdagricultura@yahoo.com", miembros: [] },
  { id: "53", nombre: "De Ambiente, Desarrollo Sostenible y Cambio Climático", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "cecologia@diputados.gov.py", miembros: [] },
  { id: "51", nombre: "Ciencia y Tecnología", tipo: "Permanente", camara: "Diputados", presidente: null, vicepresidente: null, email: "cyt@diputados.gov.py", miembros: [] },
];

const now = new Date();
const todayStr = now.toISOString().split("T")[0];
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(now);
nextWeek.setDate(nextWeek.getDate() + 7);

const MOCK_SESIONES = [
  { id: "1", fecha: todayStr, horaInicio: "09:00", horaFin: null, tipo: "Plenaria Ordinaria", estado: "programada", periodo: "2023-2028", descripcion: "Sesión ordinaria de la Cámara de Diputados", orden_del_dia: ["Tratamiento de proyectos de ley en trámite", "Informes de Comisiones", "Varios"] },
  { id: "2", fecha: tomorrow.toISOString().split("T")[0], horaInicio: "10:00", horaFin: null, tipo: "Comisión de Salud", estado: "programada", periodo: "2023-2028", descripcion: "Reunión de la Comisión de Salud Pública", orden_del_dia: ["Análisis de proyectos de ley sanitarios"] },
  { id: "3", fecha: nextWeek.toISOString().split("T")[0], horaInicio: "09:00", horaFin: null, tipo: "Plenaria Extraordinaria", estado: "programada", periodo: "2023-2028", descripcion: "Sesión extraordinaria convocada por el Poder Ejecutivo", orden_del_dia: ["Proyectos de ley de inversiones", "Debate sobre reforma tributaria"] },
  { id: "4", fecha: "2025-05-28", horaInicio: "09:00", horaFin: "17:30", tipo: "Plenaria Ordinaria", estado: "completada", periodo: "2023-2028", descripcion: "Sesión ordinaria - Se aprobaron 3 proyectos de ley", orden_del_dia: ["Ley aprobada", "Informe de comisiones"] },
  { id: "5", fecha: "2025-05-21", horaInicio: "09:00", horaFin: "15:00", tipo: "Plenaria Ordinaria", estado: "completada", periodo: "2023-2028", descripcion: "Sesión ordinaria - Debate sobre presupuesto", orden_del_dia: ["Presupuesto 2025", "Informe de la Comisión de Hacienda"] },
  { id: "6", fecha: "2025-05-14", horaInicio: "10:00", horaFin: "13:00", tipo: "Plenaria Ordinaria", estado: "completada", periodo: "2023-2028", descripcion: "Sesión ordinaria - Derechos sociales", orden_del_dia: ["Proyecto Ley Social", "Informe Comisión Social"] },
];

const MOCK_PROYECTOS = [
  { id: "1001", numero: "D-2163904", titulo: "Presupuesto General de la Nación Ejercicio Fiscal 2026", estado: "EN TRAMITE", etapa: "Comisión de Presupuesto", fechaIngreso: "2025-03-15", iniciativa: "PODER EJECUTIVO", comision: "Presupuesto", descripcion: "Proyecto de ley que establece el presupuesto general de la nación para el ejercicio fiscal 2026, con énfasis en inversión pública y desarrollo social.", appURL: null, historial: [{ fecha: "2025-03-15", evento: "Ingreso", descripcion: "Ingreso del proyecto al Congreso" }, { fecha: "2025-03-20", evento: "Comisión", descripcion: "Derivado a la Comisión de Presupuesto" }] },
  { id: "1002", numero: "D-2163905", titulo: "Reforma al Sistema Educativo Nacional", estado: "EN TRAMITE", etapa: "PRIMER TRÁMITE CONSTITUCIONAL", fechaIngreso: "2025-04-10", iniciativa: "PARLAMENTARIA", comision: "Educación, Cultura y Culto", descripcion: "Establece reformas estructurales al sistema educativo nacional, promoviendo la inclusión digital.", appURL: null, historial: [{ fecha: "2025-04-10", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-04-18", evento: "Primera lectura", descripcion: "Leído en sesión plenaria" }] },
  { id: "1003", numero: "D-2163906", titulo: "Sistema Nacional de Salud Universal", estado: "EN TRAMITE", etapa: "DICTAMEN DE COMISIÓN", fechaIngreso: "2025-03-28", iniciativa: "PARLAMENTARIA", comision: "Salud Pública", descripcion: "Crea el Sistema Nacional de Salud Universal garantizando cobertura médica a toda la población paraguaya.", appURL: null, historial: [{ fecha: "2025-03-28", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-04-05", evento: "Comisión", descripcion: "Derivado a Comisión de Salud" }] },
  { id: "1004", numero: "D-2163907", titulo: "Ley de Inversiones Extranjeras Directas", estado: "EN TRAMITE", etapa: "PRESENTACIÓN", fechaIngreso: "2025-05-02", iniciativa: "PODER EJECUTIVO", comision: "Hacienda", descripcion: "Establece el marco legal para la promoción y protección de inversiones extranjeras directas.", appURL: null, historial: [{ fecha: "2025-05-02", evento: "Ingreso", descripcion: "Ingreso al Congreso" }] },
  { id: "1005", numero: "D-2163908", titulo: "Ley de Protección Social Integral", estado: "APROBADO", etapa: "PROMULGACIÓN", fechaIngreso: "2025-02-14", iniciativa: "PARLAMENTARIA", comision: "Asuntos Sociales", descripcion: "Crea un sistema integral de protección social para las familias más vulnerables del Paraguay.", appURL: null, historial: [{ fecha: "2025-02-14", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-03-10", evento: "Aprobado", descripcion: "Aprobado en Cámara de Diputados" }, { fecha: "2025-03-20", evento: "Senado", descripcion: "Enviado al Senado" }] },
  { id: "1006", numero: "D-2163909", titulo: "Ley de Transparencia y Acceso a la Información Pública", estado: "PROMULGADO", etapa: "FINALIZADO", fechaIngreso: "2025-01-20", iniciativa: "PARLAMENTARIA", comision: "Asuntos Constitucionales", descripcion: "Fortalece los mecanismos de transparencia y acceso a información pública del Estado paraguayo.", appURL: null, historial: [{ fecha: "2025-01-20", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-02-28", evento: "Promulgado", descripcion: "Promulgado por el Poder Ejecutivo" }] },
  { id: "1007", numero: "D-2163910", titulo: "Reforma al Código Laboral", estado: "EN TRAMITE", etapa: "DICTAMEN DE COMISIÓN", fechaIngreso: "2025-01-15", iniciativa: "PARLAMENTARIA", comision: "Legislación y Codificación", descripcion: "Actualiza las normas laborales para adaptarlas a la economía digital y el trabajo remoto.", appURL: null, historial: [{ fecha: "2025-01-15", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-02-01", evento: "Comisión", descripcion: "En análisis en Comisión" }] },
  { id: "1008", numero: "D-2163911", titulo: "Ley de Energías Renovables", estado: "EN TRAMITE", etapa: "SEGUNDO TRÁMITE CONSTITUCIONAL", fechaIngreso: "2025-05-20", iniciativa: "PODER EJECUTIVO", comision: "Energía y Minería", descripcion: "Promueve el desarrollo de fuentes de energía renovable y eficiencia energética en Paraguay.", appURL: null, historial: [{ fecha: "2025-05-20", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-05-28", evento: "Segunda lectura", descripcion: "Leído en segunda instancia" }] },
];

const MOCK_LEYES = [
  { numero: "7850", titulo: "Ley de Transparencia y Acceso a la Información Pública", fechaSancion: "2025-02-25", fechaPromulgacion: "2025-02-28", proyecto: "D-2163909" },
  { numero: "7847", titulo: "Ley de Protección de Datos Personales", fechaSancion: "2025-05-28", fechaPromulgacion: "2025-05-30", proyecto: null },
  { numero: "7846", titulo: "Ley de Fomento a la Economía Social y Solidaria", fechaSancion: "2025-05-28", fechaPromulgacion: "2025-05-29", proyecto: null },
  { numero: "7845", titulo: "Ley de Aguas Nacionales", fechaSancion: "2025-05-28", fechaPromulgacion: null, proyecto: null },
  { numero: "7840", titulo: "Ley de Defensa del Consumidor (Reforma)", fechaSancion: "2025-04-15", fechaPromulgacion: "2025-04-18", proyecto: null },
  { numero: "7838", titulo: "Ley de Telecomunicaciones y Conectividad Digital", fechaSancion: "2025-03-22", fechaPromulgacion: "2025-03-25", proyecto: null },
  { numero: "7835", titulo: "Ley de Fomento Agroindustrial", fechaSancion: "2025-03-10", fechaPromulgacion: "2025-03-12", proyecto: null },
];

// ── Real API fetch helpers ─────────────────────────────────────────────────────

async function fetchFromCongress(path: string, timeoutMs = 8000): Promise<unknown> {
  const url = `${CONGRESS_API_BASE}${path}`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    clearTimeout(tid);
    return null;
  }
}

// ── Field mappers: real API shape → our internal schema ───────────────────────

interface RealParlamentario {
  idParlamentario: number;
  nombres: string;
  apellidos: string;
  partidoPolitico: string;
  bancada: string;
  departamento: string;
  emailParlamentario: string;
  fotoURL: string;
  telefonoParlamentario: string;
  periodoLegislativo: string;
  tipoParlamentario: string;
  appURL: string;
}

function mapParlamentario(p: RealParlamentario) {
  return {
    id: String(p.idParlamentario),
    nombre: toTitleCase(p.nombres),
    apellido: toTitleCase(p.apellidos),
    partido: p.partidoPolitico || "Independiente",
    bancada: p.bancada || "",
    departamento: toTitleCase(p.departamento),
    cargo: toTitleCase(p.tipoParlamentario ?? "Diputado/a"),
    periodo: p.periodoLegislativo || "2023-2028",
    foto: p.fotoURL || null,
    email: p.emailParlamentario || null,
    bio: `${toTitleCase(p.tipoParlamentario ?? "Diputado/a")} por ${toTitleCase(p.departamento)}. Período ${p.periodoLegislativo}.`,
    comisiones: [] as string[],
  };
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
}

function mapComision(c: RealComision) {
  return {
    id: String(c.idComision),
    nombre: toTitleCase(c.nombreComision),
    tipo: toTitleCase(c.tipoComision),
    camara: "Diputados",
    presidente: null as string | null,
    vicepresidente: null as string | null,
    email: c.email?.trim() || null,
    miembros: [] as string[],
    descripcion: c.competenciaComision || null,
    numero: c.numeroComision || null,
  };
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
}

function mapProyecto(p: RealProyecto) {
  return {
    id: String(p.idProyecto),
    numero: p.expedienteCamara || String(p.idProyecto),
    titulo: toTitleCase(p.acapite || "Sin título"),
    estado: p.estadoProyecto || "EN TRAMITE",
    etapa: toTitleCase(p.descripcionEtapa || ""),
    fechaIngreso: parseFechaIngreso(p.fechaIngresoExpediente),
    iniciativa: toTitleCase(p.iniciativa || "PARLAMENTARIA"),
    comision: null as string | null,
    descripcion: null as string | null,
    appURL: p.appURL || null,
    historial: [] as { fecha: string; evento: string; descripcion: string }[],
  };
}

interface RealLey {
  idLey: number;
  numero: string;
  descripcion: string;
  fechaPromulgacion: string;
  appURL: string;
}

function mapLey(l: RealLey) {
  return {
    numero: l.numero || String(l.idLey),
    titulo: toTitleCase(l.descripcion || "Sin título"),
    fechaSancion: l.fechaPromulgacion || "",
    fechaPromulgacion: l.fechaPromulgacion || null,
    proyecto: null as string | null,
  };
}

// ── Utility helpers ────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-–/])\S/g, (ch) => ch.toUpperCase());
}

function parseFechaIngreso(raw: string): string {
  if (!raw) return "";
  // Real API returns "DD/MM/YYYY" → convert to ISO "YYYY-MM-DD"
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw;
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

// ── Route handlers ─────────────────────────────────────────────────────────────

router.get("/legislative/dashboard", async (_req, res): Promise<void> => {
  // Try to get real counts from the API
  const [realLegisladores, realComisiones, realProyectos] = await Promise.all([
    fetchFromCongress("/parlamentario/camara/D?offset=1&limit=1", 5000),
    fetchFromCongress("/comision/camara/D", 5000),
    fetchFromCongress("/proyecto?offset=1&limit=5", 5000),
  ]);

  const totalLegisladores = isArray(realLegisladores) && realLegisladores.length > 0 ? 80 : MOCK_LEGISLADORES.length;
  const totalComisiones = isArray(realComisiones) ? realComisiones.length : MOCK_COMISIONES.length;

  const proyectos = isArray(realProyectos) && realProyectos.length > 0
    ? realProyectos.map((p) => mapProyecto(p as RealProyecto)).slice(0, 5)
    : MOCK_PROYECTOS.slice(0, 5);

  res.json({
    totalLegisladores,
    totalComisiones,
    sesionesEsteMes: 4,
    proyectosPendientes: proyectos.filter((p) => p.estado !== "PROMULGADO" && p.estado !== "Promulgado").length,
    leyesAprobadas: MOCK_LEYES.length,
    sesionEnVivo: null,
    proximasSesiones: MOCK_SESIONES.filter((s) => s.estado === "programada").slice(0, 3),
    ultimosProyectos: proyectos,
    ultimasLeyes: MOCK_LEYES.slice(0, 4),
  });
});

router.get("/legislative/legisladores", async (req, res): Promise<void> => {
  const params = GetLegisladoresQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 50) : 50;

  // Try real API
  const raw = await fetchFromCongress(`/parlamentario/camara/D?offset=${page}&limit=${limit}`);

  let data: ReturnType<typeof mapParlamentario>[];

  if (isArray(raw) && raw.length > 0) {
    data = (raw as RealParlamentario[]).map(mapParlamentario);
  } else {
    data = [...MOCK_LEGISLADORES];
  }

  // Apply filters
  if (params.success) {
    if (params.data.partido) {
      const q = params.data.partido.toLowerCase();
      data = data.filter((l) => l.partido.toLowerCase().includes(q) || l.bancada.toLowerCase().includes(q));
    }
    if (params.data.departamento) {
      const q = params.data.departamento.toLowerCase();
      data = data.filter((l) => l.departamento.toLowerCase().includes(q));
    }
    if (params.data.search) {
      const q = params.data.search.toLowerCase();
      data = data.filter(
        (l) =>
          l.nombre.toLowerCase().includes(q) ||
          l.apellido.toLowerCase().includes(q) ||
          l.partido.toLowerCase().includes(q) ||
          l.departamento.toLowerCase().includes(q)
      );
    }
  }

  res.json({ data, total: data.length, page, totalPages: Math.ceil(data.length / limit) });
});

router.get("/legislative/legisladores/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  // Try real API
  const raw = await fetchFromCongress(`/parlamentario/${id}`);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const mapped = mapParlamentario(raw as RealParlamentario);
    res.json(mapped);
    return;
  }

  const legislador = MOCK_LEGISLADORES.find((l) => l.id === id);
  if (!legislador) {
    res.status(404).json({ error: "Legislador no encontrado" });
    return;
  }
  res.json(legislador);
});

router.get("/legislative/comisiones", async (_req, res): Promise<void> => {
  const raw = await fetchFromCongress("/comision/camara/D");

  if (isArray(raw) && raw.length > 0) {
    const data = (raw as RealComision[]).map(mapComision);
    res.json({ data, total: data.length });
    return;
  }

  res.json({ data: MOCK_COMISIONES, total: MOCK_COMISIONES.length });
});

router.get("/legislative/comisiones/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  // Try real API
  const raw = await fetchFromCongress(`/comision/${id}`);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    res.json(mapComision(raw as RealComision));
    return;
  }

  const comision = MOCK_COMISIONES.find((c) => c.id === id);
  if (!comision) {
    res.status(404).json({ error: "Comisión no encontrada" });
    return;
  }
  res.json(comision);
});

router.get("/legislative/sesiones", async (req, res): Promise<void> => {
  const params = GetSesionesQueryParams.safeParse(req.query);
  let data = [...MOCK_SESIONES];

  if (params.success) {
    if (params.data.estado) data = data.filter((s) => s.estado === params.data.estado);
    if (params.data.tipo) data = data.filter((s) => s.tipo.toLowerCase().includes(params.data.tipo!.toLowerCase()));
  }

  res.json({ data, total: data.length, sesionEnVivo: null });
});

router.get("/legislative/sesiones/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sesion = MOCK_SESIONES.find((s) => s.id === id);
  if (!sesion) {
    res.status(404).json({ error: "Sesión no encontrada" });
    return;
  }
  res.json(sesion);
});

router.get("/legislative/proyectos", async (req, res): Promise<void> => {
  const params = GetProyectosQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;

  // Try real API
  const raw = await fetchFromCongress(`/proyecto?offset=${page}&limit=${Math.min(limit, 50)}`);

  let data: ReturnType<typeof mapProyecto>[];

  if (isArray(raw) && raw.length > 0) {
    data = (raw as RealProyecto[]).map(mapProyecto);
  } else {
    data = [...MOCK_PROYECTOS];
  }

  // Apply filters
  if (params.success) {
    if (params.data.estado) {
      const q = params.data.estado.toLowerCase();
      data = data.filter((p) => p.estado.toLowerCase().includes(q));
    }
    if (params.data.comision) {
      const q = params.data.comision.toLowerCase();
      data = data.filter((p) => p.comision?.toLowerCase().includes(q));
    }
    if (params.data.search) {
      const q = params.data.search.toLowerCase();
      data = data.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          p.numero.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q)
      );
    }
  }

  res.json({ data: data.slice(0, limit), total: data.length, page, totalPages: Math.ceil(data.length / limit) });
});

// GET /legislative/proyectos/:id — uses numeric id (fixes the 404 slash bug)
router.get("/legislative/proyectos/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  // Try real API
  const raw = await fetchFromCongress(`/proyecto/${id}`);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    res.json(mapProyecto(raw as RealProyecto));
    return;
  }

  // Fallback to mock by id
  const proyecto = MOCK_PROYECTOS.find((p) => p.id === id);
  if (!proyecto) {
    res.status(404).json({ error: "Proyecto no encontrado" });
    return;
  }
  res.json(proyecto);
});

router.get("/legislative/leyes", async (req, res): Promise<void> => {
  const params = GetLeyesQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const anio = params.success ? params.data.anio : undefined;

  // Try real API for the requested year, then current year, then fallback
  const yearToTry = anio ?? new Date().getFullYear();
  const raw = await fetchFromCongress(`/ley/anho/${yearToTry}?offset=${page}&limit=20`);

  let data: ReturnType<typeof mapLey>[];

  if (isArray(raw) && raw.length > 0) {
    data = (raw as RealLey[]).map(mapLey);
  } else {
    data = [...MOCK_LEYES];
  }

  // Search filter
  if (params.success && params.data.search) {
    const q = params.data.search.toLowerCase();
    data = data.filter((l) => l.titulo.toLowerCase().includes(q) || l.numero.includes(q));
  }

  res.json({ data: data.slice(0, 20), total: data.length, page, totalPages: Math.ceil(data.length / 20) });
});

// ── Service functions (for use by AI route) ────────────────────────────────────

export async function serviceLegisladores(opts: { partido?: string; departamento?: string; search?: string; limit?: number } = {}) {
  const limit = opts.limit ?? 80;
  const raw = await fetchFromCongress(`/parlamentario/camara/D?offset=1&limit=${limit}`);
  let data = isArray(raw) && raw.length > 0
    ? (raw as RealParlamentario[]).map(mapParlamentario)
    : [...MOCK_LEGISLADORES];
  if (opts.partido) { const q = opts.partido.toLowerCase(); data = data.filter(l => l.partido.toLowerCase().includes(q) || l.bancada.toLowerCase().includes(q)); }
  if (opts.departamento) { const q = opts.departamento.toLowerCase(); data = data.filter(l => l.departamento.toLowerCase().includes(q)); }
  if (opts.search) { const q = opts.search.toLowerCase(); data = data.filter(l => l.nombre.toLowerCase().includes(q) || l.apellido.toLowerCase().includes(q) || l.partido.toLowerCase().includes(q)); }
  return data;
}

export async function serviceLegisladorById(id: string) {
  const raw = await fetchFromCongress(`/parlamentario/${id}`);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return mapParlamentario(raw as RealParlamentario);
  return MOCK_LEGISLADORES.find(l => l.id === id) ?? null;
}

export async function serviceComisiones() {
  const raw = await fetchFromCongress("/comision/camara/D");
  if (isArray(raw) && raw.length > 0) return (raw as RealComision[]).map(mapComision);
  return [...MOCK_COMISIONES];
}

export async function serviceComisionById(id: string) {
  const raw = await fetchFromCongress(`/comision/${id}`);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return mapComision(raw as RealComision);
  return MOCK_COMISIONES.find(c => c.id === id) ?? null;
}

export async function serviceProyectos(opts: { estado?: string; search?: string; limit?: number } = {}) {
  const limit = opts.limit ?? 50;
  const raw = await fetchFromCongress(`/proyecto?offset=1&limit=${Math.min(limit, 50)}`);
  let data = isArray(raw) && raw.length > 0
    ? (raw as RealProyecto[]).map(mapProyecto)
    : [...MOCK_PROYECTOS];
  if (opts.estado) { const q = opts.estado.toLowerCase(); data = data.filter(p => p.estado.toLowerCase().includes(q)); }
  if (opts.search) { const q = opts.search.toLowerCase(); data = data.filter(p => p.titulo.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q)); }
  return data;
}

export async function serviceProyectoById(id: string) {
  const raw = await fetchFromCongress(`/proyecto/${id}`);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return mapProyecto(raw as RealProyecto);
  return MOCK_PROYECTOS.find(p => p.id === id) ?? null;
}

export async function serviceSesiones(opts: { estado?: string } = {}) {
  let data = [...MOCK_SESIONES];
  if (opts.estado) data = data.filter(s => s.estado === opts.estado);
  return data;
}

export async function serviceLeyes(opts: { search?: string; anio?: number } = {}) {
  const year = opts.anio ?? new Date().getFullYear();
  const raw = await fetchFromCongress(`/ley/anho/${year}?offset=1&limit=20`);
  let data = isArray(raw) && raw.length > 0
    ? (raw as RealLey[]).map(mapLey)
    : [...MOCK_LEYES];
  if (opts.search) { const q = opts.search.toLowerCase(); data = data.filter(l => l.titulo.toLowerCase().includes(q) || l.numero.includes(q)); }
  return data;
}

export async function serviceDashboard() {
  const [rawLeg, rawCom, rawProy] = await Promise.all([
    fetchFromCongress("/parlamentario/camara/D?offset=1&limit=1", 5000),
    fetchFromCongress("/comision/camara/D", 5000),
    fetchFromCongress("/proyecto?offset=1&limit=5", 5000),
  ]);
  const totalLegisladores = isArray(rawLeg) && rawLeg.length > 0 ? 80 : MOCK_LEGISLADORES.length;
  const totalComisiones = isArray(rawCom) ? rawCom.length : MOCK_COMISIONES.length;
  const proyectos = isArray(rawProy) && rawProy.length > 0
    ? (rawProy as RealProyecto[]).map(mapProyecto).slice(0, 5)
    : MOCK_PROYECTOS.slice(0, 5);
  return {
    totalLegisladores, totalComisiones,
    sesionesEsteMes: 4,
    proyectosPendientes: proyectos.filter(p => p.estado !== "PROMULGADO").length,
    leyesAprobadas: MOCK_LEYES.length,
    sesionEnVivo: null,
    proximasSesiones: MOCK_SESIONES.filter(s => s.estado === "programada").slice(0, 3),
    ultimosProyectos: proyectos,
    ultimasLeyes: MOCK_LEYES.slice(0, 4),
  };
}

export { MOCK_LEGISLADORES, MOCK_COMISIONES, MOCK_SESIONES, MOCK_PROYECTOS, MOCK_LEYES };
export default router;
