import { Router, type IRouter } from "express";
import healthRouter from "./health";
import legislativeRouter from "./legislative";
import systemRouter from "./system";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(legislativeRouter);
router.use(systemRouter);
router.use(aiRouter);

export default router;
