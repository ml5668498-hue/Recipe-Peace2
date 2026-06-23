import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireSubscription } from "../middleware/requireSubscription";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import menuRouter from "./menu";
import plannerRouter from "./planner";
import planRouter from "./plan";
import waitlistRouter from "./waitlist";
import authRouter from "./auth";
import subscriptionsRouter from "./subscriptions";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(planRouter);
router.use(waitlistRouter);
router.use(authRouter);
router.use(webhooksRouter);
router.use(subscriptionsRouter);

// Protected generation routes — require auth + active subscription
router.use(requireAuth, requireSubscription, recipesRouter);
router.use(requireAuth, requireSubscription, menuRouter);
router.use(requireAuth, requireSubscription, plannerRouter);

export default router;
