import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import menuRouter from "./menu";
import plannerRouter from "./planner";
import planRouter from "./plan";
import waitlistRouter from "./waitlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(planRouter);
router.use(recipesRouter);
router.use(menuRouter);
router.use(plannerRouter);
router.use(waitlistRouter);

export default router;
