import { Router, type IRouter } from "express";
import { getSystemStatus } from "../lib/congress";

const router: IRouter = Router();

router.get("/system/status", async (req, res): Promise<void> => {
  try {
    res.json(await getSystemStatus());
  } catch (err) {
    req.log.error({ err }, "system status failed");
    res.status(502).json({
      online: false,
      ultimaActualizacion: null,
      fuente: "API Datos Abiertos Legislativos v2.0 — Congreso Nacional del Paraguay",
      recursos: [],
    });
  }
});

export default router;
