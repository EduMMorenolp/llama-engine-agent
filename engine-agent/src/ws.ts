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

		ws.on("message", async (data) => {
			try {
				const msg = JSON.parse(data.toString());
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
						existingSession = store.createSession({ id: sessionId, name: autoName, model });
					} else if (!existingSession.name || existingSession.name === "Nuevo Chat") {
						const cleanMsg = typeof message === "string" ? message.trim() : "";
						if (cleanMsg) {
							const autoName = cleanMsg.length > 35 ? `${cleanMsg.slice(0, 35)}...` : cleanMsg;
							store.updateSession(sessionId, { name: autoName });
						}
					}

					let agentDef: AgentDefinition | null = null;
					if (agentName) {
						agentDef = agentService.getOrNull(agentName);
					}

					const finalSystemPrompt = agentDef?.corePrompt
						? (systemPrompt ?? agentDef.corePrompt)
						: systemPrompt;
					const finalEnabledTools = agentDef?.tools
						? (enabledTools?.filter((t: string) => agentDef?.tools?.includes(t)) ?? enabledTools)
						: enabledTools;
					const finalModel = agentDef?.model ?? model;

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
						},
						(event) => {
							const enrichedEvent = {
								...event,
								payload: {
									...event.payload,
									_subAgent: agentName ?? undefined,
								},
							};
							ws.send(JSON.stringify(enrichedEvent));
						},
					);
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
				ws.send(JSON.stringify({ type: "error", payload: { message: errMsg } }));
			}
		});

		ws.on("close", () => {
			logger.info("[ws] client disconnected");
		});
	});

	return wss;
}
