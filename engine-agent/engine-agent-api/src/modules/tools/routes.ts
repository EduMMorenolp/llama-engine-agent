import { Router } from "express";
import type { ToolController } from "./controller.js";

export function createToolRoutes(controller: ToolController): Router {
	const router = Router();

	router.get("/", controller.list);
	router.get("/:name", controller.get);
	router.patch("/:name", controller.update);
	router.delete("/:name", controller.delete);

	return router;
}
