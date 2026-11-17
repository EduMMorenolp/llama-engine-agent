import { Router } from "express";
import type { ModelsController } from "./controller.js";

export function createModelsRoutes(controller: ModelsController): Router {
	const router = Router();
	router.get("/", controller.listModels);
	return router;
}
