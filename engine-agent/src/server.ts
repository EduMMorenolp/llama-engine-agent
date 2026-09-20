import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { Database } from "sql.js";
import type { AgentLoopConfig } from "./agent/loop.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import type { MemoryService } from "./modules/memories/service.js";
import type { SessionService } from "./modules/sessions/service.js";
import { createApiRoutes } from "./routes/index.js";
import type { ToolRegistry } from "./tools/registry.js";

export interface ServerConfig {
	port: number;
	apiKey: string;
}

export function createApp(
	serverConfig: ServerConfig,
	db: Database,
	sessionService: SessionService,
	memoryService: MemoryService,
	toolRegistry: ToolRegistry,
	agentConfig: AgentLoopConfig,
) {
	const app = express();
	app.set("trust proxy", 1);
	app.use(helmet());
	app.use(cors({ origin: true }));
	app.use(express.json());
	app.use(morgan("dev"));

	app.get("/api/health", (_req, res) => {
		res.json({ status: "ok", agentRunning: true });
	});

	const authMiddleware = createAuthMiddleware(serverConfig.apiKey);
	app.use(
		"/api",
		authMiddleware,
		createApiRoutes(db, sessionService, memoryService, toolRegistry, agentConfig),
	);

	app.use(errorHandler);

	return app;
}
