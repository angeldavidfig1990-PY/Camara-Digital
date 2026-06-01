import { Router, type IRouter } from "express";
import { getSystemStatus } from "../lib/congress";

const router: IRouter = Router();

router.get("/system/status", async (req, res): Promise<void> => {
  try {
    res.json(await getSystemStatus());
  } catch (err) {
    req.log.error({ err }, "system status failed");
    res.status(502).json({
      lastSync: null,
      source: "API Datos Abiertos Legislativos v2.0 — Congreso Nacional del Paraguay",
      recordsUpdated: 0,
      lastSessionDetected: null,
      dataFreshness: "empty",
      status: "offline",
      recursos: [],
    });
  }
});

export default router;
