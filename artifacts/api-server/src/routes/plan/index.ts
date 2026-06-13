import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/plan", (req, res) => {
  const mode = process.env.GROQ_API_KEY ? "premium" : "free";
  req.log.info({ mode }, "plan status requested");
  res.json({ mode });
});

export default router;
