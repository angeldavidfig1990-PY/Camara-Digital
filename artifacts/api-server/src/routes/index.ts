import { Router, type IRouter } from "express";
import healthRouter from "./health";
import legislativeRouter from "./legislative";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(legislativeRouter);
router.use(aiRouter);

export default router;
