import { Router } from "express";
import { ValidationPipe } from "../../middleware/validation.js";
import type { SessionController } from "./controller.js";
import { createSessionDto, forkSessionDto, updateMessageDto, updateSessionDto } from "./dto.js";

export function createSessionRoutes(controller: SessionController): Router {
	const router = Router();

	router.get("/", controller.list);
	router.post("/", ValidationPipe(createSessionDto), controller.create);
	router.get("/:id", controller.getById);
	router.patch("/:id", ValidationPipe(updateSessionDto), controller.update);
	router.put("/:id", ValidationPipe(updateSessionDto), controller.update);
	router.delete("/:id", controller.delete);
	router.patch(
		"/:id/messages/:messageId",
		ValidationPipe(updateMessageDto),
		controller.updateMessage,
	);
	router.delete("/:id/messages/:messageId", controller.deleteMessage);
	router.post("/:id/fork", ValidationPipe(forkSessionDto), controller.fork);

	return router;
}
