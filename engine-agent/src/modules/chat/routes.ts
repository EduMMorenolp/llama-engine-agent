import { Router } from "express";
import type { AgentLoopConfig } from "../../agent/loop.js";
import { AgentService } from "../../modules/agents/service.js";
import type { SessionService } from "../sessions/service.js";
import { createChatHandler } from "./handler.js";

export function createChatRoutes(agentConfig: AgentLoopConfig, store: SessionService, agentService: AgentService): Router {
	const router = Router();

	router.post("/", createChatHandler(agentConfig, store, agentService));

	return router;
}
