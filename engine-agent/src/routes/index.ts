import { Router } from "express";
import type { Database } from "sql.js";
import type { AgentLoopConfig } from "../agent/loop.js";
import { AgentController } from "../modules/agents/controller.js";
import { createAgentRoutes } from "../modules/agents/routes.js";
import { AgentService } from "../modules/agents/service.js";
import { createChatRoutes } from "../modules/chat/routes.js";
import { MCPController } from "../modules/mcp/controller.js";
import { MCPManager } from "../modules/mcp/manager.js";
import { createMCPRoutes } from "../modules/mcp/routes.js";
import { MemoryController } from "../modules/memories/controller.js";
import { createMemoryRoutes } from "../modules/memories/routes.js";
import type { MemoryService } from "../modules/memories/service.js";
import { ModelsController } from "../modules/models/controller.js";
import { createModelsRoutes } from "../modules/models/routes.js";
import { SessionController } from "../modules/sessions/controller.js";
import { createSessionRoutes } from "../modules/sessions/routes.js";
import type { SessionService } from "../modules/sessions/service.js";
import { SkillController } from "../modules/skills/controller.js";
import { createSkillRoutes } from "../modules/skills/routes.js";
import type { SkillService } from "../modules/skills/service.js";
import { ToolController } from "../modules/tools/controller.js";
import { createToolRoutes } from "../modules/tools/routes.js";
import { ToolService } from "../modules/tools/service.js";
import type { ToolRegistry } from "../tools/registry.js";

export function createApiRoutes(
	_db: Database,
	sessionService: SessionService,
	memoryService: MemoryService,
	skillService: SkillService,
	toolRegistry: ToolRegistry,
	agentConfig: AgentLoopConfig,
) {
	const router = Router();

	const sessionController = new SessionController(sessionService);
	router.use("/sessions", createSessionRoutes(sessionController));

	const memoryController = new MemoryController(memoryService);
	router.use("/memories", createMemoryRoutes(memoryController));

	const agentService = new AgentService(_db);
	const agentController = new AgentController(agentService);
	router.use("/agents", createAgentRoutes(agentController));

	const skillController = new SkillController(skillService);
	router.use("/skills", createSkillRoutes(skillController));

	const toolService = new ToolService(toolRegistry);
	const toolController = new ToolController(toolService);
	router.use("/tools", createToolRoutes(toolController));

	const mcpManager = new MCPManager(toolRegistry);
	const mcpController = new MCPController(mcpManager);
	router.use("/mcp", createMCPRoutes(mcpController));

	const modelsController = new ModelsController();
	router.use("/models", createModelsRoutes(modelsController));

	router.use("/chat", createChatRoutes(agentConfig, sessionService, agentService));

	return router;
}
