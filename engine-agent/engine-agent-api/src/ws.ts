import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { type WebSocket, WebSocketServer } from "ws";
import type { AgentLoopConfig } from "./agent/loop.js";
import { runAgent } from "./agent/loop.js";
import type { AgentDefinition } from "./agent/types.js";
import type { AgentService } from "./modules/agents/service.js";
import type { SessionService } from "./modules/sessions/service.js";
import { logger } from "./utils/logger.js";

export function createWebSocketServer(
	httpServer: Server,
	store: SessionService,
	agentService: AgentService,
	agentConfig: AgentLoopConfig,
) {
	const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

	wss.on("connection", (ws: WebSocket) => {
		logger.info("[ws] client connected");
		const activeControllers = new Map<string, AbortController>();

		ws.on("message", async (data) => {
			try {
				const msg = JSON.parse(data.toString());
				if (msg.type === "abort") {
					const sessionId = msg.payload?.sessionId;
					if (sessionId && activeControllers.has(sessionId)) {
						activeControllers.get(sessionId)?.abort();
						activeControllers.delete(sessionId);
						ws.send(JSON.stringify({ type: "done", payload: { aborted: true } }));
					}
					return;
				}

				if (msg.type === "chat") {
					const {
						sessionId: inputSessionId,
						message,
						model,
						systemPrompt,
						enabledTools,
						modelSettings,
						agent: agentName,
					} = msg.payload ?? {};
					const sessionId = inputSessionId ?? randomUUID();

					let existingSession = store.getSessionOrNull(sessionId);
					if (!existingSession) {
						const cleanMsg = typeof message === "string" ? message.trim() : "";
						const autoName = cleanMsg
							? cleanMsg.length > 35
								? `${cleanMsg.slice(0, 35)}...`
								: cleanMsg
							: "Nuevo Chat";
						existingSession = store.createSession({
							id: sessionId,
							name: autoName,
							model,
							autoTitled: true,
						});
					} else if (
						!existingSession.name ||
						existingSession.name === "Nuevo Chat" ||
						existingSession.autoTitled
					) {
						const cleanMsg = typeof message === "string" ? message.trim() : "";
						if (cleanMsg) {
							const autoName = cleanMsg.length > 35 ? `${cleanMsg.slice(0, 35)}...` : cleanMsg;
							store.updateSession(sessionId, { name: autoName, autoTitled: true });
						}
					}

					let agentDef: AgentDefinition | null = null;
					if (agentName) {
						agentDef = agentService.getOrNull(agentName);
					}

					const finalSystemPrompt = agentDef?.corePrompt
						? (systemPrompt ?? agentDef.corePrompt)
						: systemPrompt;
					const finalEnabledTools = enabledTools ?? agentDef?.tools;
					const finalModel = agentDef?.model ?? model;

					const abortController = new AbortController();
					activeControllers.set(sessionId, abortController);

					try {
						await runAgent(
							{
								...agentConfig,
								store,
								maxIterations: agentDef?.maxIterations ?? agentConfig.maxIterations,
							},
							{
								sessionId,
								message,
								model: finalModel,
								systemPrompt: finalSystemPrompt,
								enabledTools: finalEnabledTools ? [...finalEnabledTools] : undefined,
								modelSettings,
								agent: agentName,
								signal: abortController.signal,
							},
							(event) => {
								if (ws.readyState === ws.OPEN) {
									const enrichedEvent = {
										...event,
										payload: {
											...event.payload,
											_subAgent: agentName ?? undefined,
										},
									};
									ws.send(JSON.stringify(enrichedEvent));
								}
							},
						);
					} finally {
						activeControllers.delete(sessionId);
					}
				}
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : "Error al procesar mensaje";
				try {
					const parsed = JSON.parse(data.toString());
					const sessId = parsed?.payload?.sessionId;
					if (sessId && store.getSessionOrNull(sessId)) {
						store.addMessage(randomUUID(), sessId, "assistant", `⚠️ **Aviso**: ${errMsg}`);
					}
				} catch {}
				if (ws.readyState === ws.OPEN) {
					ws.send(JSON.stringify({ type: "error", payload: { message: errMsg } }));
				}
			}
		});

		ws.on("close", () => {
			logger.info("[ws] client disconnected");
			for (const controller of activeControllers.values()) {
				controller.abort();
			}
			activeControllers.clear();
		});
	});

	return wss;
}
