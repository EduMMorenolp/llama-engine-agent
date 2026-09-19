import { Router } from "express";
import type { AgentLoopConfig } from "../../agent/loop.js";
import type { SessionService } from "../sessions/service.js";
import { createChatHandler } from "./handler.js";

export function createChatRoutes(agentConfig: AgentLoopConfig, store: SessionService): Router {
	const router = Router();

	router.post("/", createChatHandler(agentConfig, store));

	return router;
}
