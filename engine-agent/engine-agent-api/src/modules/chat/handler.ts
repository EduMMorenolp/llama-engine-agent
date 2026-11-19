import type { Request, Response } from "express";
import type { AgentLoopConfig } from "../../agent/loop.js";
import { runAgent } from "../../agent/loop.js";
import type { AgentDefinition } from "../../agent/types.js";
import type { AgentService } from "../../modules/agents/service.js";
import { logger } from "../../utils/logger.js";
import type { SessionService } from "../sessions/service.js";

export function createChatHandler(
	agentConfig: AgentLoopConfig,
	store: SessionService,
	agentService: AgentService,
) {
	return async (req: Request, res: Response) => {
		const {
			sessionId: inputSessionId,
			message,
			model,
			systemPrompt,
			enabledTools,
			modelSettings,
			agent: agentName,
		} = req.body ?? {};
		if (!message || typeof message !== "string") {
			res.status(400).json({ error: "message es requerido" });
			return;
		}

		const sessionId = inputSessionId ?? crypto.randomUUID();
		const existingSession =
			typeof store.getSessionOrNull === "function"
				? store.getSessionOrNull(sessionId)
				: (store as any).getSession?.(sessionId);
		if (!existingSession) {
			store.createSession({ id: sessionId, model });
		}

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		let agentDef: AgentDefinition | null = null;
		if (agentName && typeof agentService?.getOrNull === "function") {
			agentDef = agentService.getOrNull(agentName);
		}

		const finalModel = agentDef?.model ?? model;
		const finalSystemPrompt = agentDef?.corePrompt
			? systemPrompt && systemPrompt !== agentDef.corePrompt
				? `${agentDef.corePrompt}\n\n${systemPrompt}`
				: agentDef.corePrompt
			: systemPrompt;
		const finalEnabledTools =
			agentDef?.tools && agentDef.tools.length > 0
				? (enabledTools?.filter((t: string) => agentDef?.tools?.includes(t)) ?? agentDef.tools)
				: enabledTools;

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
