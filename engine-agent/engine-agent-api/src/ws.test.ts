import { createServer } from "node:http";
import type { Database } from "sql.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { closeDb, getDb } from "./db/index.js";
import { AgentService } from "./modules/agents/service.js";
import { MemoryService } from "./modules/memories/service.js";
import { SessionService } from "./modules/sessions/service.js";
import { SkillService } from "./modules/skills/service.js";
import { createApp } from "./server.js";
import { ToolRegistry } from "./tools/registry.js";
import { createWebSocketServer } from "./ws.js";

describe("WebSocket /ws", () => {
	let db: Database;
	let sessionService: SessionService;
	let memoryService: MemoryService;
	let skillService: SkillService;
	let agentService: AgentService;
	let registry: ToolRegistry;
	let server: ReturnType<typeof createServer>;
	let port: number;

	const mockLlmClient = {
		sendMessage: vi.fn().mockResolvedValue({
			content: "Hola! Soy el agente de Llama Engine.",
			tool_calls: null,
			finish_reason: "stop",
		}),
		getModel: () => "default",
		getBaseURL: () => "http://localhost:3050/v1",
	};

	beforeAll(async () => {
		process.env.ENGINE_API_KEY = "test-key";
		process.env.DB_PATH = ":memory:";

		db = await getDb();
		sessionService = new SessionService(db);
		memoryService = new MemoryService(db);
		skillService = new SkillService(db);
		agentService = new AgentService(db);
		registry = new ToolRegistry();

		const agentConfig = {
			llmClient: mockLlmClient as any,
			toolRegistry: registry,
			store: sessionService,
			memoryService,
			skillService,
			maxIterations: 5,
			workDir: process.cwd(),
		};

		const app = createApp(
			{ port: 0, apiKey: "test-key" },
			db,
			sessionService,
			memoryService,
			skillService,
			registry,
			agentConfig,
		);

		server = createServer(app);
		createWebSocketServer(server, sessionService, agentService, agentConfig);

		await new Promise<void>((resolve) => {
			server.listen(0, () => {
				const addr = server.address();
				if (typeof addr === "object" && addr) {
					port = addr.port;
				}
				resolve();
			});
		});
	});

	afterAll(() => {
		server.close();
		closeDb();
	});

	it("connects and processes a chat message", async () => {
		const ws = new WebSocket(`ws://localhost:${port}/ws`);

		await new Promise<void>((resolve) => {
			ws.on("open", () => resolve());
		});

		const events: any[] = [];

		const messagePromise = new Promise<void>((resolve) => {
			ws.on("message", (data) => {
				const event = JSON.parse(data.toString());
				events.push(event);
				if (event.type === "done") {
					resolve();
				}
			});
		});

		ws.send(
			JSON.stringify({
				type: "chat",
				payload: {
					sessionId: "test-session-ws",
					message: "Hola agente",
					model: "qwen3.5",
				},
			}),
		);

		await messagePromise;
		ws.close();

		expect(events.length).toBeGreaterThan(0);
		const messageEvent = events.find((e) => e.type === "message");
		expect(messageEvent).toBeDefined();
		expect(messageEvent.payload.content).toBe("Hola! Soy el agente de Llama Engine.");
		const doneEvent = events.find((e) => e.type === "done");
		expect(doneEvent).toBeDefined();
	});

	it("handles invalid json gracefully with error event", async () => {
		const ws = new WebSocket(`ws://localhost:${port}/ws`);

		await new Promise<void>((resolve) => {
			ws.on("open", () => resolve());
		});

		const errorPromise = new Promise<any>((resolve) => {
			ws.on("message", (data) => {
				const event = JSON.parse(data.toString());
				resolve(event);
			});
		});

		ws.send("not-a-valid-json");
		const event = await errorPromise;
		ws.close();

		expect(event.type).toBe("error");
		expect(event.payload.message).toBeDefined();
	});
});
