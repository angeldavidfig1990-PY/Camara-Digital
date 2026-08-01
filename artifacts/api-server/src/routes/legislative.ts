import { Router, type IRouter, type Response } from "express";
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
  type FetchResult,
} from "../lib/congress";

const router: IRouter = Router();

function pickId(raw: string | string[]): string {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Strict "no mock data" policy helpers.
 *
 * Every legislative endpoint consumes a FetchResult<T> from the congress
 * service. There are exactly three outcomes:
 *
 *   1. verified === false          → 503 with the official sourceUrl + retryAfter.
 *                                     We NEVER serve stale/fabricated data as live.
 *   2. verified && data === null   → for collections, an *officially empty* 200
 *                                     with _meta. For detail-by-id, a 404.
 *   3. verified && data !== null   → 200 with the payload + _meta.
 */

/** Uniform 503 body when the official source could not be verified. */
function dataSourceError(res: Response, result: { sourceUrl: string }): void {
  res.status(503).json({
    error: "Fuente oficial no disponible",
    sourceUrl: result.sourceUrl,
    retryAfter: 30,
  });
}

/** Source metadata attached to every successful collection response. */
function meta(result: FetchResult<unknown>) {
  return {
    sourceUrl: result.sourceUrl,
    fetchedAt: result.fetchedAt,
    verified: true as const,
  };
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

router.get("/legislative/dashboard", async (req, res): Promise<void> => {
  try {
    const result = await getDashboard();
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    res.json({ ...result.data, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "dashboard failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

// ── Noticias ─────────────────────────────────────────────────────────────────

router.get("/legislative/noticias", async (req, res): Promise<void> => {
  try {
    const result = await getNoticias();
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({ data, total: data.length, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "noticias failed");
    dataSourceError(res, { sourceUrl: "https://www.diputados.gov.py/" });
  }
});

// ── Legisladores ─────────────────────────────────────────────────────────────

router.get("/legislative/legisladores", async (req, res): Promise<void> => {
  const params = GetLegisladoresQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 50) : 50;

  try {
    const result = await getLegisladores({
      partido: params.success ? params.data.partido : undefined,
      departamento: params.success ? params.data.departamento : undefined,
      search: params.success ? params.data.search : undefined,
    });
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({
      data,
      total: data.length,
      page,
      totalPages: Math.ceil(data.length / limit),
      _meta: meta(result),
    });
  } catch (err) {
    req.log.error({ err }, "legisladores failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

router.get("/legislative/legisladores/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const result = await getLegisladorById(id);
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    if (!result.data) {
      res.status(404).json({ error: "Legislador no encontrado" });
      return;
    }
    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "legislador detail failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

// ── Comisiones ───────────────────────────────────────────────────────────────

router.get("/legislative/comisiones", async (req, res): Promise<void> => {
  try {
    const result = await getComisiones();
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({ data, total: data.length, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "comisiones failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

router.get("/legislative/comisiones/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const result = await getComisionById(id);
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    if (!result.data) {
      res.status(404).json({ error: "Comisión no encontrada" });
      return;
    }
    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "comision detail failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

router.get("/legislative/comisiones/:id/proyectos", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : undefined;
  try {
    const result = await getProyectosByComision(id, { limit });
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({ data, total: data.length, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "comision proyectos failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

router.get("/legislative/comisiones/:id/sesiones", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : undefined;
  try {
    const result = await getSesionesByComision(id, { limit });
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({ data, total: data.length, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "comision sesiones failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

// ── Sesiones ─────────────────────────────────────────────────────────────────

router.get("/legislative/sesiones", async (req, res): Promise<void> => {
  const params = GetSesionesQueryParams.safeParse(req.query);
  try {
    const result = await getSesiones({
      estado: params.success ? params.data.estado : undefined,
      tipo: params.success ? params.data.tipo : undefined,
    });
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    const sesionEnVivo = data.find((s) => s.estado === "en vivo") ?? null;
    res.json({ data, total: data.length, sesionEnVivo, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "sesiones failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

router.get("/legislative/sesiones/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const result = await getSesionById(id);
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    if (!result.data) {
      res.status(404).json({ error: "Sesión no encontrada" });
      return;
    }
    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "sesion detail failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

router.get("/legislative/sesiones/:id/votaciones", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const result = await getVotacionesBySesion(id);
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({ data, total: data.length, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "sesion votaciones failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

// ── Proyectos ────────────────────────────────────────────────────────────────

router.get("/legislative/proyectos", async (req, res): Promise<void> => {
  const params = GetProyectosQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;

  try {
    const result = await getProyectos({
      estado: params.success ? params.data.estado : undefined,
      search: params.success ? params.data.search : undefined,
      page: Math.max(0, page - 1),
      limit,
    });
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({
      data,
      total: data.length,
      page,
      totalPages: Math.ceil(data.length / limit),
      _meta: meta(result),
    });
  } catch (err) {
    req.log.error({ err }, "proyectos failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

router.get("/legislative/proyectos/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const result = await getProyectoById(id);
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    if (!result.data) {
      res.status(404).json({ error: "Proyecto no encontrado" });
      return;
    }
    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "proyecto detail failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

// ── Leyes ────────────────────────────────────────────────────────────────────

router.get("/legislative/leyes", async (req, res): Promise<void> => {
  const params = GetLeyesQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;

  try {
    const result = await getLeyes({ search: params.success ? params.data.search : undefined });
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({ data, total: data.length, page, totalPages: 1, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "leyes failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

// ── Votaciones ───────────────────────────────────────────────────────────────

router.get("/legislative/votaciones", async (req, res): Promise<void> => {
  const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
  try {
    const result = await getVotaciones({ search });
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    const data = result.data ?? [];
    res.json({ data, total: data.length, _meta: meta(result) });
  } catch (err) {
    req.log.error({ err }, "votaciones failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

router.get("/legislative/votaciones/:id", async (req, res): Promise<void> => {
  const id = pickId(req.params.id);
  try {
    const result = await getVotacionById(id);
    if (!result.verified) {
      dataSourceError(res, result);
      return;
    }
    if (!result.data) {
      res.status(404).json({ error: "Votación no encontrada" });
      return;
    }
    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "votacion detail failed");
    dataSourceError(res, { sourceUrl: "https://datos.congreso.gov.py/opendata/api" });
  }
});

export default router;
