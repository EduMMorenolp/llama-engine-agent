import type { Database } from "sql.js";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "./db/index.js";
import { MemoryService } from "./modules/memories/service.js";
import { SessionService } from "./modules/sessions/service.js";
import { SkillService } from "./modules/skills/service.js";
import { createApp, type ServerConfig } from "./server.js";
import { ToolRegistry } from "./tools/registry.js";

let db: Database;
let sessionService: SessionService;
let memoryService: MemoryService;
let skillService: SkillService;
let registry: ToolRegistry;
let app: ReturnType<typeof createApp>;

const config: ServerConfig = {
	port: 3060,
	apiKey: "test-key",
};

beforeAll(async () => {
	process.env.ENGINE_API_KEY = "test-key";
	process.env.DB_PATH = ":memory:";

	db = await getDb();
	sessionService = new SessionService(db);
	memoryService = new MemoryService(db);
	skillService = new SkillService(db);
	registry = new ToolRegistry();
	app = createApp(config, db, sessionService, memoryService, skillService, registry, {
		llmClient: {} as any,
		toolRegistry: registry,
		store: sessionService,
		memoryService,
		skillService,
		maxIterations: 10,
		workDir: "/tmp",
	});
});

afterAll(() => {
	closeDb();
});

describe("server", () => {
	describe("GET /api/health", () => {
		it("returns status ok", async () => {
			const res = await request(app).get("/api/health");
			expect(res.status).toBe(200);
			expect(res.body.status).toBe("ok");
		});
	});

	describe("POST /api/chat", () => {
		it("requires auth", async () => {
			const res = await request(app).post("/api/chat").send({ message: "hi" });
			expect(res.status).toBe(401);
		});

		it("returns 400 without message", async () => {
			const res = await request(app).post("/api/chat").set("x-api-key", "test-key").send({});
			expect(res.status).toBe(400);
		});
	});

	describe("GET /api/sessions", () => {
		it("requires auth", async () => {
			const res = await request(app).get("/api/sessions");
			expect(res.status).toBe(401);
		});

		it("returns session list", async () => {
			const res = await request(app).get("/api/sessions").set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.sessions).toBeDefined();
		});
	});

	describe("POST /api/sessions", () => {
		it("creates session", async () => {
			const res = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Test" });
			expect(res.status).toBe(201);
			expect(res.body.id).toBeDefined();
			expect(res.body.name).toBe("Test");
		});
	});

	describe("GET /api/sessions/:id", () => {
		it("returns 404 for non-existent session", async () => {
			const res = await request(app).get("/api/sessions/nonexistent").set("x-api-key", "test-key");
			expect(res.status).toBe(404);
		});

		it("returns session with messages and pagination metadata", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Paginated" });
			const sessionId = create.body.id;

			// Add messages
			for (let i = 0; i < 5; i++) {
				await sessionService.addMessage(`msg_${i}`, sessionId, "user", `message ${i}`);
			}

			const res = await request(app)
				.get(`/api/sessions/${sessionId}?limit=2`)
				.set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.messages).toHaveLength(2);
			expect(res.body.hasMore).toBe(true);
			expect(res.body.totalMessages).toBe(5);
		});

		it("returns hasMore false when all messages fit", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Small" });
			const sessionId = create.body.id;
			await sessionService.addMessage("m1", sessionId, "user", "hi");

			const res = await request(app)
				.get(`/api/sessions/${sessionId}?limit=100`)
				.set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.messages).toHaveLength(1);
			expect(res.body.hasMore).toBe(false);
			expect(res.body.totalMessages).toBe(1);
		});

		it("supports offset for pagination", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Offset" });
			const sessionId = create.body.id;
			for (let i = 0; i < 5; i++) {
				await sessionService.addMessage(`m_${i}`, sessionId, "user", `msg ${i}`);
			}

			const res = await request(app)
				.get(`/api/sessions/${sessionId}?limit=2&offset=2`)
				.set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.messages).toHaveLength(2);
			expect(res.body.messages[0].content).toBe("msg 1");
			expect(res.body.messages[1].content).toBe("msg 2");
		});
	});

	describe("DELETE /api/sessions/:id", () => {
		it("deletes session", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "To Delete" });
			const res = await request(app)
				.delete(`/api/sessions/${create.body.id}`)
				.set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
		});
	});

	describe("PATCH /api/sessions/:id", () => {
		it("renames a session", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Original Title" });
			const res = await request(app)
				.patch(`/api/sessions/${create.body.id}`)
				.set("x-api-key", "test-key")
				.send({ name: "Renamed Title" });
			expect(res.status).toBe(200);
			expect(res.body.name).toBe("Renamed Title");
		});
	});

	describe("DELETE /api/sessions/:id/messages/:messageId", () => {
		it("deletes a single message from session", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Message Delete Test" });
			const sessionId = create.body.id;
			await sessionService.addMessage("msg-to-del", sessionId, "user", "Delete me");

			const res = await request(app)
				.delete(`/api/sessions/${sessionId}/messages/msg-to-del`)
				.set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);

			const check = await request(app)
				.get(`/api/sessions/${sessionId}`)
				.set("x-api-key", "test-key");
			expect(check.body.messages).toHaveLength(0);
		});
	});

	describe("POST /api/sessions/:id/fork", () => {
		it("forks a session with its messages", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Original Session" });
			const sessionId = create.body.id;
			await sessionService.addMessage("fork_m1", sessionId, "user", "Message 1");
			await sessionService.addMessage("fork_m2", sessionId, "assistant", "Message 2");

			const res = await request(app)
				.post(`/api/sessions/${sessionId}/fork`)
				.set("x-api-key", "test-key")
				.send({ name: "Forked Session" });

			expect(res.status).toBe(201);
			expect(res.body.id).toBeDefined();
			expect(res.body.name).toBe("Forked Session");

			const forkedDetails = await request(app)
				.get(`/api/sessions/${res.body.id}`)
				.set("x-api-key", "test-key");
			expect(forkedDetails.body.messages).toHaveLength(2);
			expect(forkedDetails.body.messages[0].content).toBe("Message 1");
		});
	});

	describe("PATCH /api/sessions/:id/messages/:messageId", () => {
		it("toggles message favorite status", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Favorite Test" });
			const sessionId = create.body.id;
			sessionService.addMessage("fav-msg-1", sessionId, "assistant", "Important advice");

			const res = await request(app)
				.patch(`/api/sessions/${sessionId}/messages/fav-msg-1`)
				.set("x-api-key", "test-key")
				.send({ favorite: true });
			expect(res.status).toBe(200);
			expect(res.body.favorite).toBe(true);

			const favs = await request(app).get("/api/messages/favorites").set("x-api-key", "test-key");
			expect(favs.status).toBe(200);
			expect(favs.body.favorites).toHaveLength(1);
			expect(favs.body.favorites[0].message.id).toBe("fav-msg-1");
			expect(favs.body.favorites[0].session.name).toBe("Favorite Test");
		});
	});

	describe("GET /api/messages/search", () => {
		it("searches across message content", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Search Test Session" });
			const sessionId = create.body.id;
			sessionService.addMessage("search-m1", sessionId, "user", "How do I configure Vite?");
			sessionService.addMessage(
				"search-m2",
				sessionId,
				"assistant",
				"You configure vite.config.ts with plugins.",
			);

			const res = await request(app)
				.get("/api/messages/search?q=plugins")
				.set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.results.length).toBeGreaterThanOrEqual(1);
			expect(res.body.results[0].snippet).toContain("plugins");
			expect(res.body.results[0].session.id).toBe(sessionId);
		});
	});

	describe("PATCH /api/sessions/:id with tags and summary", () => {
		it("updates tags and summary", async () => {
			const create = await request(app)
				.post("/api/sessions")
				.set("x-api-key", "test-key")
				.send({ name: "Tagged Session" });
			const sessionId = create.body.id;

			const res = await request(app)
				.patch(`/api/sessions/${sessionId}`)
				.set("x-api-key", "test-key")
				.send({ tags: ["dev", "ai"], summary: "Conversation summary." });
			expect(res.status).toBe(200);
			expect(res.body.tags).toEqual(["dev", "ai"]);
			expect(res.body.summary).toBe("Conversation summary.");
		});
	});

	describe("GET /api/tools", () => {
		it("returns tool list", async () => {
			const res = await request(app).get("/api/tools").set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.tools).toBeDefined();
		});
	});

	describe("GET /api/memories", () => {
		it("returns memory list", async () => {
			const res = await request(app).get("/api/memories").set("x-api-key", "test-key");
			expect(res.status).toBe(200);
			expect(res.body.memories).toBeDefined();
		});
	});
});
