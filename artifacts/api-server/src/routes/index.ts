import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import menuRouter from "./menu";
import plannerRouter from "./planner";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recipesRouter);
router.use(menuRouter);
router.use(plannerRouter);

export default router;
