import { createServer } from "node:http";
import { LLMClient } from "./agent/llm-client.js";
import { getConfig } from "./config/index.js";
import { closeDb, getDb } from "./db/index.js";
import { MemoryService } from "./modules/memories/service.js";
import { SessionService } from "./modules/sessions/service.js";
import { createApp } from "./server.js";
import { registerAllTools } from "./tools/index.js";
import { toolRegistry } from "./tools/registry.js";
import { logger } from "./utils/logger.js";
import { createWebSocketServer } from "./ws.js";

async function bootstrap() {
	const config = getConfig();

	const db = await getDb();
	const sessionService = new SessionService(db);
	const memoryService = new MemoryService(db);

	registerAllTools(toolRegistry);
	logger.info(`${toolRegistry.list().length} tools registered`);

	const llmClient = new LLMClient({
		apiUrl: config.ENGINE_API_URL,
		apiKey: config.ENGINE_API_KEY ?? "",
		model: config.SYSTEM_PROMPT ? "default" : "default",
	});

	const agentConfig = {
		llmClient,
		toolRegistry,
		store: sessionService,
		memoryService,
		maxIterations: config.MAX_ITERATIONS,
		workDir: process.cwd(),
	};

	const app = createApp(
		{ port: config.AGENT_PORT, apiKey: config.ENGINE_API_KEY ?? "" },
		db,
		sessionService,
		memoryService,
		toolRegistry,
		agentConfig,
	);

	const server = createServer(app);
	createWebSocketServer(server, sessionService, agentConfig);

	server.listen(config.AGENT_PORT, config.HOST, () => {
		const apiKeySanitized = config.ENGINE_API_KEY ? "***" : "not set";
		logger.info(`
==================================================
🚀 ENGINE-AGENT INICIADO EXITOSAMENTE
==================================================
📍 URL Local:       http://${config.HOST}:${config.AGENT_PORT}
📅 Fecha:           ${new Date().toLocaleString()}
🏭 Entorno:         ${config.NODE_ENV}
🔧 Engine API:      ${config.ENGINE_API_URL}
🔑 API Key:         ${apiKeySanitized}
📦 Node Version:    ${process.version}
==================================================`);

		if (config.TELEGRAM_BOT_TOKEN) {
			logger.info("Telegram bot enabled");
		}
	});

	process.on("SIGTERM", () => {
		logger.info("Shutting down...");
		server.close();
		closeDb();
		process.exit(0);
	});

	process.on("SIGINT", () => {
		logger.info("Shutting down (SIGINT)...");
		server.close();
		closeDb();
		process.exit(0);
	});
}

bootstrap().catch((err) => {
	logger.error("Fatal error:", err);
	process.exit(1);
});
