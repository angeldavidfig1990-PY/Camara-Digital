import { Router, type IRouter } from "express";
import {
  GetLegisladoresQueryParams,
  GetSesionesQueryParams,
  GetProyectosQueryParams,
  GetLeyesQueryParams,
} from "@workspace/api-zod";
import {
  getLegisladores,
  getLegisladorById,
  getComisiones,
  getComisionById,
  getProyectos,
  getProyectoById,
  getProyectosByComision,
  getLeyes,
  getSesiones,
  getSesionById,
  getSesionesByComision,
  getVotaciones,
  getVotacionById,
  getVotacionesBySesion,
  getDashboard,
  getNoticias,
} from "../lib/congress";

const router: IRouter = Router();

function pickId(raw: string | string[]): string {
  return Array.isArray(raw) ? raw[0] : raw;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

router.get("/legislative/dashboard", async (req, res): Promise<void> => {
  try {
    res.json(await getDashboard());
  } catch (err) {
    req.log.error({ err }, "dashboard failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

// ── Noticias ─────────────────────────────────────────────────────────────────

router.get("/legislative/noticias", async (req, res): Promise<void> => {
  try {
    const data = await getNoticias();
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "noticias failed");
    res.status(502).json({ error: "No se pudieron obtener las noticias oficiales." });
  }
});

// ── Legisladores ─────────────────────────────────────────────────────────────

router.get("/legislative/legisladores", async (req, res): Promise<void> => {
  const params = GetLegisladoresQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 50) : 50;

  try {
    const data = await getLegisladores({
      partido: params.success ? params.data.partido : undefined,
      departamento: params.success ? params.data.departamento : undefined,
      search: params.success ? params.data.search : undefined,
    });
    res.json({ data, total: data.length, page, totalPages: Math.ceil(data.length / limit) });
  } catch (err) {
    req.log.error({ err }, "legisladores failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

router.get("/legislative/legisladores/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const legislador = await getLegisladorById(id);
    if (!legislador) {
      res.status(404).json({ error: "Legislador no encontrado" });
      return;
    }
    res.json(legislador);
  } catch (err) {
    req.log.error({ err }, "legislador detail failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

// ── Comisiones ───────────────────────────────────────────────────────────────

router.get("/legislative/comisiones", async (req, res): Promise<void> => {
  try {
    const data = await getComisiones();
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "comisiones failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

router.get("/legislative/comisiones/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const comision = await getComisionById(id);
    if (!comision) {
      res.status(404).json({ error: "Comisión no encontrada" });
      return;
    }
    res.json(comision);
  } catch (err) {
    req.log.error({ err }, "comision detail failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

router.get("/legislative/comisiones/:id/proyectos", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : undefined;
  try {
    const data = await getProyectosByComision(id, { limit });
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "comision proyectos failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

router.get("/legislative/comisiones/:id/sesiones", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : undefined;
  try {
    const data = await getSesionesByComision(id, { limit });
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "comision sesiones failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

// ── Sesiones ─────────────────────────────────────────────────────────────────

router.get("/legislative/sesiones", async (req, res): Promise<void> => {
  const params = GetSesionesQueryParams.safeParse(req.query);
  try {
    const { data, sesionEnVivo } = await getSesiones({
      estado: params.success ? params.data.estado : undefined,
      tipo: params.success ? params.data.tipo : undefined,
    });
    res.json({ data, total: data.length, sesionEnVivo });
  } catch (err) {
    req.log.error({ err }, "sesiones failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

router.get("/legislative/sesiones/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const sesion = await getSesionById(id);
    if (!sesion) {
      res.status(404).json({ error: "Sesión no encontrada" });
      return;
    }
    res.json(sesion);
  } catch (err) {
    req.log.error({ err }, "sesion detail failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

router.get("/legislative/sesiones/:id/votaciones", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const data = await getVotacionesBySesion(id);
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "sesion votaciones failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

// ── Proyectos ────────────────────────────────────────────────────────────────

router.get("/legislative/proyectos", async (req, res): Promise<void> => {
  const params = GetProyectosQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;

  try {
    const { data } = await getProyectos({
      estado: params.success ? params.data.estado : undefined,
      search: params.success ? params.data.search : undefined,
      page: Math.max(0, page - 1),
      limit,
    });
    res.json({ data, total: data.length, page, totalPages: Math.ceil(data.length / limit) });
  } catch (err) {
    req.log.error({ err }, "proyectos failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

router.get("/legislative/proyectos/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const proyecto = await getProyectoById(id);
    if (!proyecto) {
      res.status(404).json({ error: "Proyecto no encontrado" });
      return;
    }
    res.json(proyecto);
  } catch (err) {
    req.log.error({ err }, "proyecto detail failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

// ── Leyes ────────────────────────────────────────────────────────────────────

router.get("/legislative/leyes", async (req, res): Promise<void> => {
  const params = GetLeyesQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;

  try {
    const data = await getLeyes({ search: params.success ? params.data.search : undefined });
    res.json({ data, total: data.length, page, totalPages: 1 });
  } catch (err) {
    req.log.error({ err }, "leyes failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

// ── Votaciones ───────────────────────────────────────────────────────────────

router.get("/legislative/votaciones", async (req, res): Promise<void> => {
  const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
  try {
    const data = await getVotaciones({ search });
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "votaciones failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

router.get("/legislative/votaciones/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const votacion = await getVotacionById(id);
    if (!votacion) {
      res.status(404).json({ error: "Votación no encontrada" });
      return;
    }
    res.json(votacion);
  } catch (err) {
    req.log.error({ err }, "votacion detail failed");
    res.status(502).json({ error: "No se pudo obtener datos de las fuentes oficiales." });
  }
});

export default router;
