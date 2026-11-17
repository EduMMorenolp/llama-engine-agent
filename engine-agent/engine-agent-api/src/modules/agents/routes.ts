import { Router } from "express";
import { ValidationPipe } from "../../middleware/validation.js";
import type { AgentController } from "./controller.js";
import { createAgentDto, updateAgentDto } from "./dto.js";

export function createAgentRoutes(controller: AgentController): Router {
	const router = Router();

	router.get("/", controller.list);
	router.get("/:name", controller.get);
	router.post("/", ValidationPipe(createAgentDto), controller.create);
	router.patch("/:name", ValidationPipe(updateAgentDto), controller.update);
	router.delete("/:name", controller.delete);

	return router;
}
