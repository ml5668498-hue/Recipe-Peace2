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
import entriesRouter from "./entries";
import userdataRouter from "./userdata";
import setupRouter from "./setup";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(planRouter);
router.use(waitlistRouter);
router.use(authRouter);
router.use(webhooksRouter);
router.use(subscriptionsRouter);
router.use(setupRouter);

// Protected generation routes — require auth + active subscription
router.use(requireAuth, requireSubscription, recipesRouter);
router.use(requireAuth, requireSubscription, menuRouter);
router.use(requireAuth, requireSubscription, plannerRouter);

// Protected data routes — require auth + active subscription
router.use(requireAuth, requireSubscription, entriesRouter);
router.use(requireAuth, requireSubscription, userdataRouter);

export default router;
