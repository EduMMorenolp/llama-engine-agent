import type { Request, Response } from "express";
import type { AgentLoopConfig } from "../../agent/loop.js";
import { runAgent } from "../../agent/loop.js";
import type { AgentDefinition } from "../../agent/types.js";
import { AgentService } from "../../modules/agents/service.js";
import { logger } from "../../utils/logger.js";
import type { SessionService } from "../sessions/service.js";

export function createChatHandler(
	agentConfig: AgentLoopConfig,
	store: SessionService,
	agentService: AgentService,
) {
	return async (req: Request, res: Response) => {
		const { sessionId: inputSessionId, message, model, agent: agentName } = req.body ?? {};
		if (!message || typeof message !== "string") {
			res.status(400).json({ error: "message es requerido" });
			return;
		}

		const sessionId = inputSessionId ?? crypto.randomUUID();
		if (!store.getSession(sessionId)) {
			store.createSession({ id: sessionId, model });
		}

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		let agentDef: AgentDefinition | null = null;
		if (agentName) {
			agentDef = agentService.getOrNull(agentName);
		}

		const finalModel = agentDef?.model ?? model;

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
					systemPrompt: agentDef?.corePrompt,
					enabledTools: agentDef?.tools ? [...agentDef.tools] : undefined,
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
					res.write(`data: ${JSON.stringify(enrichedEvent)}\n\n`);
				},
			);
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			logger.error("Agent error:", errorMessage);
			res.write(
				`data: ${JSON.stringify({ type: "error", payload: { message: errorMessage } })}\n\n`,
			);
		}

		res.end();
	};
}
