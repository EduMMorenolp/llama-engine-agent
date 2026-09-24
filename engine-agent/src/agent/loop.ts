import { randomUUID } from "node:crypto";
import type { MemoryService } from "../modules/memories/service.js";
import type { SessionService } from "../modules/sessions/service.js";
import type { SkillService } from "../modules/skills/service.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { ToolContext } from "../tools/types.js";
import type { LLMClient } from "./llm-client.js";
import { buildPrompt, getMemoriesForContext } from "./prompt.js";
import { toolCache } from "./tool-cache.js";
import type {
	AgentOptions,
	AgentResult,
	LLMMessage,
	StreamEvent,
	ToolCallResult,
} from "./types.js";

export interface AgentLoopConfig {
	llmClient: LLMClient;
	toolRegistry: ToolRegistry;
	store: SessionService;
	memoryService: MemoryService;
	skillService: SkillService;
	maxIterations: number;
	workDir: string;
}

export async function runAgent(
	config: AgentLoopConfig,
	options: AgentOptions,
	onEvent?: (event: StreamEvent) => void,
): Promise<AgentResult> {
	const { llmClient, toolRegistry, store, memoryService, maxIterations, workDir } = config;
	const { sessionId, message, model, systemPrompt, enabledTools, modelSettings } = options;

	const userMsgId = randomUUID();
	store.addMessage(userMsgId, sessionId, "user", message);

	const memories = getMemoriesForContext(memoryService);
	let tools = toolRegistry.getSpecs();
	if (enabledTools !== undefined) {
		tools = tools.filter((t) => enabledTools.includes(t.function.name));
	}
	const toolContext: ToolContext = {
		sessionId,
		workDir,
		store,
		memoryService,
		skillService: config.skillService,
	};

	const reasoningInstruction =
		modelSettings?.enableReasoning === false
			? "\n\nInstrucción de respuesta: No uses etiquetas ni bloques de pensamiento <think>. Responde directamente a la consulta."
			: "";

	const messages: LLMMessage[] = buildPrompt({
		store,
		sessionId,
		systemPrompt: (systemPrompt ?? "") + reasoningInstruction,
		memories,
		model,
	});

	const allToolCalls: ToolCallResult[] = [];
	let iterations = 0;
	let finalContent = "";

	for (let i = 0; i < maxIterations; i++) {
		iterations++;
		const toolsToPass = tools;

		let accumulatedContent = "";
		const toolCallMap: Record<number, { id: string; name: string; arguments: string }> = {};

		if (typeof llmClient.sendMessageStream === "function") {
			const stream = llmClient.sendMessageStream(messages, toolsToPass, model, modelSettings);
			for await (const chunk of stream) {
				if (chunk.type === "content" && chunk.data) {
					accumulatedContent += chunk.data;
					onEvent?.({ type: "message", payload: { role: "assistant", content: chunk.data } });
				} else if (chunk.type === "tool_call" && chunk.data) {
					const idx = chunk.data.index ?? 0;
					if (!toolCallMap[idx]) {
						toolCallMap[idx] = {
							id: chunk.data.id || randomUUID(),
							name: chunk.data.function?.name || "",
							arguments: "",
						};
					}
					if (chunk.data.id) {
						toolCallMap[idx].id = chunk.data.id;
					}
					if (chunk.data.function?.name) {
						toolCallMap[idx].name = chunk.data.function.name;
					}
					if (chunk.data.function?.arguments) {
						toolCallMap[idx].arguments += chunk.data.function.arguments;
					}
				}
			}
		} else {
			const response = await llmClient.sendMessage(messages, toolsToPass, model, modelSettings);
			accumulatedContent = response.content ?? "";
			if (accumulatedContent) {
				onEvent?.({ type: "message", payload: { role: "assistant", content: accumulatedContent } });
			}
			if (response.tool_calls) {
				response.tool_calls.forEach((tc, idx) => {
					toolCallMap[idx] = {
						id: tc.id || randomUUID(),
						name: tc.function.name,
						arguments: tc.function.arguments,
					};
				});
			}
		}

		const responseToolCalls = Object.values(toolCallMap)
			.filter((tc) => tc.name)
			.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: {
					name: tc.name,
					arguments: tc.arguments,
				},
			}));

		if (responseToolCalls.length > 0) {
			const assistantMsgId = randomUUID();
			store.addMessage(
				assistantMsgId,
				sessionId,
				"assistant",
				accumulatedContent || null,
				JSON.stringify(responseToolCalls),
			);

			messages.push({
				role: "assistant",
				content: accumulatedContent || null,
				tool_calls: responseToolCalls,
			});

			const settledResults = await Promise.allSettled(
				responseToolCalls.map(async (tc) => {
					const callId = tc.id || randomUUID();
					let args: Record<string, unknown> = {};
					try {
						args = JSON.parse(tc.function.arguments);
					} catch {
						args = { raw: tc.function.arguments };
					}

					onEvent?.({
						type: "tool_start",
						payload: { id: callId, name: tc.function.name, args },
					});

					let result: string;
					const cached = toolCache.get(tc.function.name, args);
					if (cached !== null) {
						result = cached;
					} else {
						try {
							result = await toolRegistry.execute(tc.function.name, args, toolContext);
						} catch (err: unknown) {
							result = `Error: ${err instanceof Error ? err.message : String(err)}`;
						}
						toolCache.set(tc.function.name, args, result);
						toolCache.invalidateOnMutation(tc.function.name);
					}

					onEvent?.({
						type: "tool_end",
						payload: { id: callId, name: tc.function.name, result },
					});

					const toolMsgId = randomUUID();
					store.addMessage(toolMsgId, sessionId, "tool", result, null, callId);

					return { id: callId, name: tc.function.name, args, result };
				}),
			);

			for (const settled of settledResults) {
				if (settled.status === "fulfilled") {
					const { id, name, args, result } = settled.value;
					allToolCalls.push({ name, args, result });
					messages.push({
						role: "tool",
						content: result,
						tool_call_id: id,
					});
				}
			}
		} else {
			finalContent = accumulatedContent;
			if (finalContent) {
				const assistantMsgId = randomUUID();
				store.addMessage(assistantMsgId, sessionId, "assistant", finalContent);
			}
			break;
		}
	}

	if (!finalContent && allToolCalls.length > 0) {
		const toolSummary = allToolCalls.map((tc) => `- ${tc.name}: completado`).join("\n");
		finalContent = [
			`He alcanzado el máximo de ${maxIterations} iteraciones.`,
			`Herramientas ejecutadas (${allToolCalls.length}):`,
			toolSummary,
			"",
			"Por favor, resume los resultados obtenidos y responde al usuario.",
		].join("\n");
		onEvent?.({ type: "message", payload: { role: "assistant", content: finalContent } });
		const assistantMsgId = randomUUID();
		store.addMessage(assistantMsgId, sessionId, "assistant", finalContent);
	}

	const msgId = randomUUID();
	onEvent?.({ type: "done", payload: { messageId: msgId } });

	return {
		content: finalContent,
		toolCalls: allToolCalls,
		iterations,
	};
}
