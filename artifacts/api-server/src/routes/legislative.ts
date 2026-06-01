import { Router, type IRouter } from "express";
import {
  GetLegisladoresQueryParams,
  GetSesionesQueryParams,
  GetProyectosQueryParams,
  GetLeyesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CONGRESS_API_BASE = "https://datos.congreso.gov.py/opendata";

const MOCK_LEGISLADORES = [
  { id: "1", nombre: "Juan Carlos", apellido: "Ortigoza", partido: "ANR", bancada: "Colorado", departamento: "Asunción", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "jortigoza@diputados.gov.py", bio: "Diputado por Asunción. Miembro de la Comisión de Finanzas.", comisiones: ["Finanzas", "Presupuesto"] },
  { id: "2", nombre: "María Elena", apellido: "Torales", partido: "PLRA", bancada: "Liberal", departamento: "Central", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "mtorales@diputados.gov.py", bio: "Diputada por Central. Presidenta de la Comisión de Salud.", comisiones: ["Salud", "Mujer"] },
  { id: "3", nombre: "Pedro Antonio", apellido: "Villalba", partido: "ANR", bancada: "Colorado", departamento: "Alto Paraná", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "pvillalba@diputados.gov.py", bio: "Diputado por Alto Paraná. Especialista en temas agrarios.", comisiones: ["Agricultura", "Medio Ambiente"] },
  { id: "4", nombre: "Rosa Mercedes", apellido: "Amarilla", partido: "Frente Guasú", bancada: "Frente Guasú", departamento: "Itapúa", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "ramarilla@diputados.gov.py", bio: "Diputada por Itapúa. Defensora de los derechos sociales.", comisiones: ["Asuntos Sociales", "Educación"] },
  { id: "5", nombre: "Carlos Alberto", apellido: "Rodríguez", partido: "ANR", bancada: "Colorado", departamento: "Caaguazú", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "crodriguez@diputados.gov.py", bio: "Diputado por Caaguazú. Abogado constitucionalista.", comisiones: ["Asuntos Constitucionales", "Justicia"] },
  { id: "6", nombre: "Ana Gloria", apellido: "Benítez", partido: "PLRA", bancada: "Liberal", departamento: "San Pedro", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "abenitez@diputados.gov.py", bio: "Diputada por San Pedro. Especialista en infraestructura.", comisiones: ["Obras Públicas", "Transporte"] },
  { id: "7", nombre: "Fernando", apellido: "Llamosas", partido: "Honor Colorado", bancada: "Honor Colorado", departamento: "Cordillera", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "fllamosas@diputados.gov.py", bio: "Diputado por Cordillera. Médico de profesión.", comisiones: ["Salud", "Ciencia y Tecnología"] },
  { id: "8", nombre: "Mirta", apellido: "Gusinky", partido: "ANR", bancada: "Colorado", departamento: "Concepción", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "mgusinky@diputados.gov.py", bio: "Diputada por Concepción. Presidenta del Bloque Femenino.", comisiones: ["Mujer", "Niñez"] },
  { id: "9", nombre: "Diego Armando", apellido: "Flores", partido: "PLRA", bancada: "Liberal", departamento: "Amambay", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "dflores@diputados.gov.py", bio: "Diputado por Amambay. Empresario y emprendedor.", comisiones: ["Industria y Comercio", "Finanzas"] },
  { id: "10", nombre: "Patricia", apellido: "Samudio", partido: "ANR", bancada: "Colorado", departamento: "Guairá", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "psamudio@diputados.gov.py", bio: "Diputada por Guairá. Docente universitaria.", comisiones: ["Educación", "Cultura"] },
  { id: "11", nombre: "Luis Alberto", apellido: "Castiglioni", partido: "ANR", bancada: "Colorado", departamento: "Asunción", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "lcastiglioni@diputados.gov.py", bio: "Diputado por Asunción. Ex vicepresidente de la República.", comisiones: ["Relaciones Exteriores", "Asuntos Constitucionales"] },
  { id: "12", nombre: "Sara", apellido: "Ayala", partido: "Frente Guasú", bancada: "Frente Guasú", departamento: "Central", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "sayala@diputados.gov.py", bio: "Diputada por Central. Activista social y comunitaria.", comisiones: ["Asuntos Sociales", "Mujer"] },
  { id: "13", nombre: "Roberto", apellido: "González", partido: "ANR", bancada: "Colorado", departamento: "Itapúa", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "rgonzalez@diputados.gov.py", bio: "Diputado por Itapúa. Ingeniero agrónomo.", comisiones: ["Agricultura", "Medio Ambiente"] },
  { id: "14", nombre: "Elena", apellido: "Riveros", partido: "PLRA", bancada: "Liberal", departamento: "Alto Paraná", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "eriveros@diputados.gov.py", bio: "Diputada por Alto Paraná. Abogada especialista en DDHH.", comisiones: ["Derechos Humanos", "Justicia"] },
  { id: "15", nombre: "César Augusto", apellido: "Penayo", partido: "ANR", bancada: "Colorado", departamento: "Caazapá", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "cpenayo@diputados.gov.py", bio: "Diputado por Caazapá. Ganadero y agricultor.", comisiones: ["Agricultura", "Hacienda"] },
  { id: "16", nombre: "Victoria", apellido: "Espínola", partido: "Patria Querida", bancada: "Patria Querida", departamento: "Asunción", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "vespinola@diputados.gov.py", bio: "Diputada por Asunción. Economista y analista política.", comisiones: ["Finanzas", "Presupuesto"] },
  { id: "17", nombre: "Óscar Daniel", apellido: "Chamorro", partido: "ANR", bancada: "Colorado", departamento: "Misiones", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "ochamorro@diputados.gov.py", bio: "Diputado por Misiones. Constructor e ingeniero civil.", comisiones: ["Obras Públicas", "Transporte"] },
  { id: "18", nombre: "Zunilda", apellido: "Martínez", partido: "PLRA", bancada: "Liberal", departamento: "Paraguarí", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "zmartinez@diputados.gov.py", bio: "Diputada por Paraguarí. Pediatra de profesión.", comisiones: ["Salud", "Niñez"] },
  { id: "19", nombre: "Arnaldo", apellido: "Samaniego", partido: "ANR", bancada: "Colorado", departamento: "Canindeyú", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "asamaniego@diputados.gov.py", bio: "Diputado por Canindeyú. Empresario agroindustrial.", comisiones: ["Industria y Comercio", "Agricultura"] },
  { id: "20", nombre: "Cynthia", apellido: "López", partido: "Frente Guasú", bancada: "Frente Guasú", departamento: "Alto Paraná", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "clopez@diputados.gov.py", bio: "Diputada por Alto Paraná. Educadora y activista ambiental.", comisiones: ["Educación", "Medio Ambiente"] },
  { id: "21", nombre: "Hugo Adalberto", apellido: "Velázquez", partido: "ANR", bancada: "Colorado", departamento: "Central", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "hvelazquez@diputados.gov.py", bio: "Diputado por Central. Ex candidato presidencial.", comisiones: ["Relaciones Exteriores", "Asuntos Constitucionales"] },
  { id: "22", nombre: "Rocío", apellido: "Cáceres", partido: "PLRA", bancada: "Liberal", departamento: "Concepción", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "rcaceres@diputados.gov.py", bio: "Diputada por Concepción. Periodista y comunicadora social.", comisiones: ["Comunicación", "Cultura"] },
  { id: "23", nombre: "Blas Antonio", apellido: "Llaneras", partido: "ANR", bancada: "Colorado", departamento: "Ñeembucú", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "bllaneras@diputados.gov.py", bio: "Diputado por Ñeembucú. Médico rural.", comisiones: ["Salud", "Presupuesto"] },
  { id: "24", nombre: "Fabiola", apellido: "Oviedo", partido: "Honor Colorado", bancada: "Honor Colorado", departamento: "Caaguazú", cargo: "Diputada", periodo: "2023-2028", foto: null, email: "foviedo@diputados.gov.py", bio: "Diputada por Caaguazú. Contadora pública nacional.", comisiones: ["Finanzas", "Hacienda"] },
  { id: "25", nombre: "Marcelo Aníbal", apellido: "Duarte", partido: "PLRA", bancada: "Liberal", departamento: "Alto Paraguay", cargo: "Diputado", periodo: "2023-2028", foto: null, email: "mduarte@diputados.gov.py", bio: "Diputado por Alto Paraguay. Ambientalista y geógrafo.", comisiones: ["Medio Ambiente", "Derechos Humanos"] },
];

const MOCK_COMISIONES = [
  { id: "1", nombre: "Asuntos Constitucionales", tipo: "Permanente", camara: "Diputados", presidente: "Carlos Alberto Rodríguez", vicepresidente: "Luis Alberto Castiglioni", email: "comision.constitucional@diputados.gov.py", miembros: ["Carlos Alberto Rodríguez", "Luis Alberto Castiglioni", "Elena Riveros", "Hugo Adalberto Velázquez"] },
  { id: "2", nombre: "Legislación y Codificación", tipo: "Permanente", camara: "Diputados", presidente: "Juan Carlos Ortigoza", vicepresidente: "Victoria Espínola", email: "comision.legislacion@diputados.gov.py", miembros: ["Juan Carlos Ortigoza", "Victoria Espínola", "Ana Gloria Benítez"] },
  { id: "3", nombre: "Hacienda", tipo: "Permanente", camara: "Diputados", presidente: "Victoria Espínola", vicepresidente: "César Augusto Penayo", email: "comision.hacienda@diputados.gov.py", miembros: ["Victoria Espínola", "César Augusto Penayo", "Fabiola Oviedo", "Juan Carlos Ortigoza"] },
  { id: "4", nombre: "Presupuesto", tipo: "Permanente", camara: "Diputados", presidente: "Fabiola Oviedo", vicepresidente: "Juan Carlos Ortigoza", email: "comision.presupuesto@diputados.gov.py", miembros: ["Fabiola Oviedo", "Juan Carlos Ortigoza", "Blas Antonio Llaneras", "Victoria Espínola"] },
  { id: "5", nombre: "Relaciones Exteriores", tipo: "Permanente", camara: "Diputados", presidente: "Luis Alberto Castiglioni", vicepresidente: "Hugo Adalberto Velázquez", email: "comision.exterior@diputados.gov.py", miembros: ["Luis Alberto Castiglioni", "Hugo Adalberto Velázquez", "Marcelo Aníbal Duarte"] },
  { id: "6", nombre: "Educación, Cultura y Culto", tipo: "Permanente", camara: "Diputados", presidente: "Patricia Samudio", vicepresidente: "Rosa Mercedes Amarilla", email: "comision.educacion@diputados.gov.py", miembros: ["Patricia Samudio", "Rosa Mercedes Amarilla", "Cynthia López", "Rocío Cáceres"] },
  { id: "7", nombre: "Salud Pública", tipo: "Permanente", camara: "Diputados", presidente: "María Elena Torales", vicepresidente: "Fernando Llamosas", email: "comision.salud@diputados.gov.py", miembros: ["María Elena Torales", "Fernando Llamosas", "Zunilda Martínez", "Blas Antonio Llaneras"] },
  { id: "8", nombre: "Agricultura y Ganadería", tipo: "Permanente", camara: "Diputados", presidente: "Pedro Antonio Villalba", vicepresidente: "Roberto González", email: "comision.agricultura@diputados.gov.py", miembros: ["Pedro Antonio Villalba", "Roberto González", "César Augusto Penayo", "Arnaldo Samaniego"] },
  { id: "9", nombre: "Obras Públicas y Comunicaciones", tipo: "Permanente", camara: "Diputados", presidente: "Óscar Daniel Chamorro", vicepresidente: "Ana Gloria Benítez", email: "comision.obras@diputados.gov.py", miembros: ["Óscar Daniel Chamorro", "Ana Gloria Benítez", "Arnaldo Samaniego"] },
  { id: "10", nombre: "Asuntos Sociales", tipo: "Permanente", camara: "Diputados", presidente: "Rosa Mercedes Amarilla", vicepresidente: "Sara Ayala", email: "comision.social@diputados.gov.py", miembros: ["Rosa Mercedes Amarilla", "Sara Ayala", "Mirta Gusinky"] },
  { id: "11", nombre: "Mujer, Juventud y la Familia", tipo: "Permanente", camara: "Diputados", presidente: "Mirta Gusinky", vicepresidente: "Sara Ayala", email: "comision.mujer@diputados.gov.py", miembros: ["Mirta Gusinky", "Sara Ayala", "María Elena Torales", "Zunilda Martínez"] },
  { id: "12", nombre: "Medio Ambiente y Desarrollo Sostenible", tipo: "Permanente", camara: "Diputados", presidente: "Marcelo Aníbal Duarte", vicepresidente: "Cynthia López", email: "comision.medioambiente@diputados.gov.py", miembros: ["Marcelo Aníbal Duarte", "Cynthia López", "Pedro Antonio Villalba", "Roberto González"] },
];

const now = new Date();
const todayStr = now.toISOString().split("T")[0];
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(now);
nextWeek.setDate(nextWeek.getDate() + 7);

const MOCK_SESIONES = [
  { id: "1", fecha: todayStr, horaInicio: "09:00", horaFin: null, tipo: "Plenaria Ordinaria", estado: "programada", periodo: "2023-2028", descripcion: "Sesión ordinaria de la Cámara de Diputados", orden_del_dia: ["Tratamiento del Proyecto de Ley 128/2025 - Presupuesto General de la Nación", "Votación del Proyecto de Ley 156/2025 - Reforma Educativa", "Informes de Comisiones"] },
  { id: "2", fecha: tomorrow.toISOString().split("T")[0], horaInicio: "10:00", horaFin: null, tipo: "Comisión de Salud", estado: "programada", periodo: "2023-2028", descripcion: "Reunión de la Comisión de Salud Pública", orden_del_dia: ["Análisis del Proyecto de Ley 143/2025 - Sistema de Salud Universal"] },
  { id: "3", fecha: nextWeek.toISOString().split("T")[0], horaInicio: "09:00", horaFin: null, tipo: "Plenaria Extraordinaria", estado: "programada", periodo: "2023-2028", descripcion: "Sesión extraordinaria convocada por el Poder Ejecutivo", orden_del_dia: ["Proyecto de Ley 170/2025 - Inversiones Extranjeras", "Debate sobre Reforma Tributaria"] },
  { id: "4", fecha: "2025-05-28", horaInicio: "09:00", horaFin: "17:30", tipo: "Plenaria Ordinaria", estado: "completada", periodo: "2023-2028", descripcion: "Sesión ordinaria - Se aprobaron 3 proyectos de ley", orden_del_dia: ["Ley 7845/2025 aprobada", "Ley 7846/2025 aprobada", "Ley 7847/2025 aprobada"] },
  { id: "5", fecha: "2025-05-21", horaInicio: "09:00", horaFin: "15:00", tipo: "Plenaria Ordinaria", estado: "completada", periodo: "2023-2028", descripcion: "Sesión ordinaria - Debate sobre presupuesto", orden_del_dia: ["Presupuesto 2025", "Informe de la Comisión de Hacienda"] },
  { id: "6", fecha: "2025-05-14", horaInicio: "10:00", horaFin: "13:00", tipo: "Plenaria Ordinaria", estado: "completada", periodo: "2023-2028", descripcion: "Sesión ordinaria - Derechos sociales", orden_del_dia: ["Proyecto Ley Social 112/2025", "Informe Comisión Social"] },
];

const MOCK_PROYECTOS = [
  { numero: "128/2025", titulo: "Presupuesto General de la Nación Ejercicio Fiscal 2026", estado: "En tratamiento", etapa: "Comisión de Presupuesto", fechaIngreso: "2025-03-15", iniciativa: "Poder Ejecutivo", comision: "Presupuesto", descripcion: "Proyecto de ley que establece el presupuesto general de la nación para el ejercicio fiscal 2026.", historial: [{ fecha: "2025-03-15", evento: "Ingreso", descripcion: "Ingreso del proyecto al Congreso" }, { fecha: "2025-03-20", evento: "Comisión", descripcion: "Derivado a la Comisión de Presupuesto" }] },
  { numero: "156/2025", titulo: "Reforma al Sistema Educativo Nacional", estado: "En tratamiento", etapa: "Primera lectura", fechaIngreso: "2025-04-10", iniciativa: "Legislativa", comision: "Educación, Cultura y Culto", descripcion: "Establece reformas estructurales al sistema educativo nacional.", historial: [{ fecha: "2025-04-10", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-04-18", evento: "Primera lectura", descripcion: "Leído en sesión plenaria" }] },
  { numero: "143/2025", titulo: "Sistema Nacional de Salud Universal", estado: "En tratamiento", etapa: "Comisión de Salud", fechaIngreso: "2025-03-28", iniciativa: "Legislativa", comision: "Salud Pública", descripcion: "Crea el Sistema Nacional de Salud Universal garantizando cobertura a toda la población.", historial: [{ fecha: "2025-03-28", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-04-05", evento: "Comisión", descripcion: "Derivado a Comisión de Salud" }] },
  { numero: "170/2025", titulo: "Ley de Inversiones Extranjeras Directas", estado: "Pendiente", etapa: "Presentación", fechaIngreso: "2025-05-02", iniciativa: "Poder Ejecutivo", comision: "Hacienda", descripcion: "Establece el marco legal para la promoción y protección de inversiones extranjeras.", historial: [{ fecha: "2025-05-02", evento: "Ingreso", descripcion: "Ingreso al Congreso" }] },
  { numero: "112/2025", titulo: "Ley de Protección Social Integral", estado: "Aprobado en Cámara", etapa: "Senado", fechaIngreso: "2025-02-14", iniciativa: "Legislativa", comision: "Asuntos Sociales", descripcion: "Crea un sistema integral de protección social para las familias más vulnerables.", historial: [{ fecha: "2025-02-14", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-03-10", evento: "Aprobado", descripcion: "Aprobado en Cámara de Diputados" }, { fecha: "2025-03-20", evento: "Senado", descripcion: "Enviado al Senado" }] },
  { numero: "098/2025", titulo: "Ley de Transparencia y Acceso a la Información Pública", estado: "Promulgado", etapa: "Finalizado", fechaIngreso: "2025-01-20", iniciativa: "Legislativa", comision: "Asuntos Constitucionales", descripcion: "Fortalece los mecanismos de transparencia y acceso a información pública.", historial: [{ fecha: "2025-01-20", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-02-28", evento: "Promulgado", descripcion: "Promulgado por el Poder Ejecutivo" }] },
  { numero: "087/2025", titulo: "Reforma al Código Laboral", estado: "Comisión", etapa: "Comisión de Legislación", fechaIngreso: "2025-01-15", iniciativa: "Legislativa", comision: "Legislación y Codificación", descripcion: "Actualiza las normas laborales para adaptarlas a la economía digital.", historial: [{ fecha: "2025-01-15", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-02-01", evento: "Comisión", descripcion: "En análisis en Comisión" }] },
  { numero: "200/2025", titulo: "Ley de Energías Renovables", estado: "En tratamiento", etapa: "Segunda lectura", fechaIngreso: "2025-05-20", iniciativa: "Poder Ejecutivo", comision: "Medio Ambiente y Desarrollo Sostenible", descripcion: "Promueve el desarrollo de fuentes de energía renovable en el país.", historial: [{ fecha: "2025-05-20", evento: "Ingreso", descripcion: "Ingreso al Congreso" }, { fecha: "2025-05-28", evento: "Segunda lectura", descripcion: "Leído en segunda instancia" }] },
];

const MOCK_LEYES = [
  { numero: "7850", titulo: "Ley de Transparencia y Acceso a la Información Pública", fechaSancion: "2025-02-25", fechaPromulgacion: "2025-02-28", proyecto: "098/2025" },
  { numero: "7847", titulo: "Ley de Protección de Datos Personales", fechaSancion: "2025-05-28", fechaPromulgacion: "2025-05-30", proyecto: null },
  { numero: "7846", titulo: "Ley de Fomento a la Economía Social y Solidaria", fechaSancion: "2025-05-28", fechaPromulgacion: "2025-05-29", proyecto: null },
  { numero: "7845", titulo: "Ley de Aguas Nacionales", fechaSancion: "2025-05-28", fechaPromulgacion: null, proyecto: null },
  { numero: "7840", titulo: "Ley de Defensa del Consumidor (Reforma)", fechaSancion: "2025-04-15", fechaPromulgacion: "2025-04-18", proyecto: null },
  { numero: "7838", titulo: "Ley de Telecomunicaciones y Conectividad Digital", fechaSancion: "2025-03-22", fechaPromulgacion: "2025-03-25", proyecto: null },
  { numero: "7835", titulo: "Ley de Fomento Agroindustrial", fechaSancion: "2025-03-10", fechaPromulgacion: "2025-03-12", proyecto: null },
];

async function fetchFromCongress(path: string): Promise<unknown> {
  const url = `${CONGRESS_API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "Accept": "application/json" } });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

router.get("/legislative/dashboard", async (_req, res): Promise<void> => {
  res.json({
    totalLegisladores: MOCK_LEGISLADORES.length,
    totalComisiones: MOCK_COMISIONES.length,
    sesionesEsteMes: 4,
    proyectosPendientes: MOCK_PROYECTOS.filter(p => p.estado !== "Promulgado").length,
    leyesAprobadas: MOCK_LEYES.length,
    sesionEnVivo: null,
    proximasSesiones: MOCK_SESIONES.filter(s => s.estado === "programada").slice(0, 3),
    ultimosProyectos: MOCK_PROYECTOS.slice(0, 5),
    ultimasLeyes: MOCK_LEYES.slice(0, 4),
  });
});

router.get("/legislative/legisladores", async (req, res): Promise<void> => {
  const params = GetLegisladoresQueryParams.safeParse(req.query);
  let data = [...MOCK_LEGISLADORES];

  if (params.success) {
    if (params.data.partido) {
      data = data.filter(l => l.partido.toLowerCase().includes(params.data.partido!.toLowerCase()));
    }
    if (params.data.departamento) {
      data = data.filter(l => l.departamento.toLowerCase().includes(params.data.departamento!.toLowerCase()));
    }
    if (params.data.search) {
      const q = params.data.search.toLowerCase();
      data = data.filter(l =>
        l.nombre.toLowerCase().includes(q) ||
        l.apellido.toLowerCase().includes(q) ||
        l.partido.toLowerCase().includes(q) ||
        l.departamento.toLowerCase().includes(q)
      );
    }
  }

  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 50) : 50;
  const start = (page - 1) * limit;
  const paged = data.slice(start, start + limit);

  res.json({ data: paged, total: data.length, page, totalPages: Math.ceil(data.length / limit) });
});

router.get("/legislative/legisladores/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const legislador = MOCK_LEGISLADORES.find(l => l.id === raw);
  if (!legislador) {
    res.status(404).json({ error: "Legislador no encontrado" });
    return;
  }
  res.json(legislador);
});

router.get("/legislative/comisiones", async (_req, res): Promise<void> => {
  res.json({ data: MOCK_COMISIONES, total: MOCK_COMISIONES.length });
});

router.get("/legislative/comisiones/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const comision = MOCK_COMISIONES.find(c => c.id === raw);
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
    if (params.data.estado) data = data.filter(s => s.estado === params.data.estado);
    if (params.data.tipo) data = data.filter(s => s.tipo.toLowerCase().includes(params.data.tipo!.toLowerCase()));
  }

  res.json({ data, total: data.length, sesionEnVivo: null });
});

router.get("/legislative/sesiones/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sesion = MOCK_SESIONES.find(s => s.id === raw);
  if (!sesion) {
    res.status(404).json({ error: "Sesión no encontrada" });
    return;
  }
  res.json(sesion);
});

router.get("/legislative/proyectos", async (req, res): Promise<void> => {
  const params = GetProyectosQueryParams.safeParse(req.query);
  let data = [...MOCK_PROYECTOS];

  if (params.success) {
    if (params.data.estado) data = data.filter(p => p.estado.toLowerCase().includes(params.data.estado!.toLowerCase()));
    if (params.data.comision) data = data.filter(p => p.comision?.toLowerCase().includes(params.data.comision!.toLowerCase()));
    if (params.data.search) {
      const q = params.data.search.toLowerCase();
      data = data.filter(p => p.titulo.toLowerCase().includes(q) || p.numero.includes(q) || p.descripcion?.toLowerCase().includes(q));
    }
  }

  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const start = (page - 1) * limit;

  res.json({ data: data.slice(start, start + limit), total: data.length, page, totalPages: Math.ceil(data.length / limit) });
});

router.get("/legislative/proyectos/:numero", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.numero) ? req.params.numero[0] : req.params.numero;
  const proyecto = MOCK_PROYECTOS.find(p => p.numero === raw);
  if (!proyecto) {
    res.status(404).json({ error: "Proyecto no encontrado" });
    return;
  }
  res.json(proyecto);
});

router.get("/legislative/leyes", async (req, res): Promise<void> => {
  const params = GetLeyesQueryParams.safeParse(req.query);
  let data = [...MOCK_LEYES];

  if (params.success) {
    if (params.data.search) {
      const q = params.data.search.toLowerCase();
      data = data.filter(l => l.titulo.toLowerCase().includes(q) || l.numero.includes(q));
    }
    if (params.data.anio) {
      data = data.filter(l => l.fechaSancion.startsWith(String(params.data.anio)));
    }
  }

  const page = params.success ? (params.data.page ?? 1) : 1;
  const paged = data.slice((page - 1) * 20, page * 20);

  res.json({ data: paged, total: data.length, page, totalPages: Math.ceil(data.length / 20) });
});

export { MOCK_LEGISLADORES, MOCK_COMISIONES, MOCK_SESIONES, MOCK_PROYECTOS, MOCK_LEYES };
export default router;
