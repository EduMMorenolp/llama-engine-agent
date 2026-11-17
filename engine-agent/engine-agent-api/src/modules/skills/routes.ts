import { Router } from "express";
import { ValidationPipe } from "../../middleware/validation.js";
import type { SkillController } from "./controller.js";
import { createSkillDto, updateSkillDto } from "./dto.js";

export function createSkillRoutes(controller: SkillController): Router {
	const router = Router();

	router.get("/", controller.list);
	router.get("/agent/:agent", controller.listByAgent);
	router.get("/:name", controller.get);
	router.post("/", ValidationPipe(createSkillDto), controller.create);
	router.patch("/:name", ValidationPipe(updateSkillDto), controller.update);
	router.delete("/:name", controller.delete);

	return router;
}
