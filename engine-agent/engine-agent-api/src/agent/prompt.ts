import type { MemoryService } from "../modules/memories/service.js";
import type { SessionService } from "../modules/sessions/service.js";
import { getSkillLevel0Metadata } from "./skill-loader.js";
import type { LLMMessage, Skill } from "./types.js";

export interface PromptContext {
	store: SessionService;
	sessionId: string;
	systemPrompt?: string;
	memories?: Array<{ key: string; content: string }>;
	maxHistoryChars?: number;
	model?: string;
	skills?: Skill[];
}

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
	"qwen3.5-4b": 65536,
	"qwen3.5-9b": 65536,
	"mistral-small-7b": 32768,
	"llama-3.2-3b": 131072,
	"gemma-4-e4b": 32768,
	"phi-4-mini": 16384,
	"qwen2.5-coder-7b": 65536,
};

export function getModelContextLimit(modelName?: string): number {
	if (!modelName) return 65536;
	const lower = modelName.toLowerCase();
	for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
		if (lower.includes(key)) return limit;
	}
	return 65536;
}

export function buildPrompt(context: PromptContext): LLMMessage[] {
	const {
		store,
		sessionId,
		systemPrompt,
		memories,
		maxHistoryChars,
		model,
		skills = [],
	} = context;

	const modelLimit = getModelContextLimit(model);
	// Reserve 8,000 tokens for system prompt, tool definitions and generation buffer
	const safeBudgetTokens = Math.max(8000, modelLimit - 8000);
	const budgetChars = maxHistoryChars ?? safeBudgetTokens * 4;
	const messages: LLMMessage[] = [];

	const systemParts: string[] = [];
	systemParts.push(systemPrompt ?? "Sos un asistente de IA inteligente, empático y servicial.");

	systemParts.push(`
## Gestión de Memoria Persistente y Servidores MCP
Las memorias guardadas del usuario se inyectan automáticamente a continuación si existen. Disponés de herramientas nativas para gestionar memoria, skills y servidores MCP:

- **memorize**: SIEMPRE que el usuario te pida recordar o guardar algo ("recuerda que...", "guarda en tu memoria...", "mi nombre es...", preferencias, stack o acuerdos), invocá INMEDIATAMENTE la herramienta \`memorize\` con una clave en snake_case (ej: \`key="user_name"\`, \`content="Eduardo"\`).
- **update_memory**: Si un dato existente en la memoria del usuario cambia, actualizalo con \`update_memory\`.
- **search_memories**: Usala cuando necesites buscar un recuerdo específico en la base de datos de memorias.
- **mcp_add_server / mcp_connect_server / mcp_list_servers**: Cuando el usuario te pida configurar, instalar o conectar un servidor MCP (como n8n MCP con URL y Access Token), usá DIRECTAMENTE \`mcp_add_server\` pasando \`name\`, \`transport\`, \`url\` y \`bearerToken\` (NO busques ni edites archivos en \`dist/\` con bash).`);

	if (memories && memories.length > 0) {
		systemParts.push("\n## Memoria del usuario:");
		for (const mem of memories) {
			systemParts.push(`- ${mem.key}: ${mem.content}`);
		}
	}

	const skillCatalog = getSkillLevel0Metadata(skills);
	if (skillCatalog) {
		systemParts.push(skillCatalog);
	}

	messages.push({ role: "system", content: systemParts.join("\n") });

	let sessionSummary: string | null = null;
	try {
		const s = store as unknown as {
			getSessionOrNull?: (id: string) => { summary?: string | null } | null;
			getSession?: (id: string) => { summary?: string | null } | null;
		};
		if (typeof s.getSessionOrNull === "function") {
			sessionSummary = s.getSessionOrNull(sessionId)?.summary ?? null;
		} else if (typeof s.getSession === "function") {
			sessionSummary = s.getSession(sessionId)?.summary ?? null;
		}
	} catch {
		// safe fallback
	}
	if (sessionSummary) {
		messages.push({
			role: "system",
			content: `## Resumen de la conversación previa:\n${sessionSummary}`,
		});
	}

	const rawHistory = store.getMessages(sessionId);
	const convertedMessages: LLMMessage[] = [];

	for (const msg of rawHistory) {
		const rawContent = msg.content ?? "";

		// Check for embedded markdown base64 images: ![alt](data:image/...;base64,...)
		const imageMatch = rawContent.match(/!\[(.*?)\]\((data:image\/[^;]+;base64,[^)]+)\)/);

		if (msg.role === "tool") {
			let content = rawContent;
			if (content.length > 12000) {
				content = `${content.slice(0, 6000)}\n\n... [Contenido truncado para ajuste de contexto] ...\n\n${content.slice(-6000)}`;
			}
			convertedMessages.push({
				role: "tool",
				content,
				tool_call_id: msg.toolCallId ?? undefined,
			});
		} else if (msg.toolCalls) {
			let content = rawContent;
			if (content.length > 12000) {
				content = `${content.slice(0, 6000)}\n\n... [Contenido truncado para ajuste de contexto] ...\n\n${content.slice(-6000)}`;
			}
			try {
				convertedMessages.push({
					role: "assistant",
					content: content || null,
					tool_calls: JSON.parse(msg.toolCalls),
				});
			} catch {
				convertedMessages.push({
					role: "assistant",
					content,
				});
			}
		} else if (msg.role === "user" && imageMatch) {
			const imageUrl = imageMatch[2];
			let textPart = rawContent.replace(imageMatch[0], "").trim();
			if (textPart.length > 12000) {
				textPart = `${textPart.slice(0, 6000)}\n\n... [Contenido truncado] ...\n\n${textPart.slice(-6000)}`;
			}

			convertedMessages.push({
				role: "user",
				content: [
					{ type: "text", text: textPart || "Por favor analiza la imagen adjunta." },
					{ type: "image_url", image_url: { url: imageUrl } },
				],
			});
		} else {
			let content = rawContent;
			if (content.length > 12000) {
				content = `${content.slice(0, 6000)}\n\n... [Contenido truncado para ajuste de contexto] ...\n\n${content.slice(-6000)}`;
			}
			convertedMessages.push({
				role: msg.role as "user" | "assistant",
				content,
			});
		}
	}

	// Calculate total characters (ignoring image base64 length for budget calculation)
	const totalChars = convertedMessages.reduce((sum, m) => sum + countMessageChars(m), 0);

	if (totalChars > budgetChars && convertedMessages.length > 2) {
		const trimmed = trimHistoryPreservingPairs(convertedMessages, budgetChars);
		messages.push(...trimmed);
	} else {
		messages.push(...convertedMessages);
	}

	return messages;
}

function countMessageChars(msg: LLMMessage): number {
	if (typeof msg.content === "string") return msg.content.length;
	if (Array.isArray(msg.content)) {
		return msg.content.reduce((sum, part) => {
			if (part.type === "text" && part.text) return sum + part.text.length;
			return sum + 1000; // Count image as equivalent ~250 tokens
		}, 0);
	}
	return 0;
}

function trimHistoryPreservingPairs(messages: LLMMessage[], maxChars: number): LLMMessage[] {
	if (messages.length <= 2) return messages;

	const firstMsg = messages[0];
	const lastMsg = messages[messages.length - 1];
	// Ensure the current user prompt (lastMsg) and conversation origin (firstMsg) are ALWAYS preserved
	let currentChars = countMessageChars(firstMsg) + countMessageChars(lastMsg);

	// Group intermediate messages into atomic units
	const middle = messages.slice(1, -1);
	const blocks: LLMMessage[][] = [];
	let i = 0;
	while (i < middle.length) {
		const m = middle[i];
		if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
			const group: LLMMessage[] = [m];
			i++;
			while (i < middle.length && middle[i].role === "tool") {
				group.push(middle[i]);
				i++;
			}
			blocks.push(group);
		} else if (m.role !== "tool") {
			blocks.push([m]);
			i++;
		} else {
			i++;
		}
	}

	// Walk backwards from most recent intermediate blocks
	const keptBlocks: LLMMessage[][] = [];
	for (let b = blocks.length - 1; b >= 0; b--) {
		const block = blocks[b];
		const blockChars = block.reduce((sum, msg) => sum + countMessageChars(msg), 0);
		if (currentChars + blockChars <= maxChars) {
			keptBlocks.push(block);
			currentChars += blockChars;
		} else {
			break;
		}
	}

	keptBlocks.reverse();
	return [firstMsg, ...keptBlocks.flat(), lastMsg];
}

export function getMemoriesForContext(
	memoryService: MemoryService,
	maxBudgetTokens = 500,
): Array<{ key: string; content: string }> {
	const all = memoryService.search("");
	let usedChars = 0;
	const maxChars = maxBudgetTokens * 4;
	const result: Array<{ key: string; content: string }> = [];
	for (const m of all) {
		const cost = m.key.length + m.content.length + 4;
		if (usedChars + cost > maxChars) break;
		result.push({ key: m.key, content: m.content });
		usedChars += cost;
	}
	return result;
}

export function calculateContextUsage(
	store: SessionService,
	sessionId: string,
	model?: string,
	customMaxChars?: number,
): { contextChars: number; maxHistoryChars: number; contextPercent: number; compacted: boolean } {
	const rawHistory = store.getMessages(sessionId);
	let totalChars = 0;
	for (const msg of rawHistory) {
		totalChars += (msg.content || "").length;
	}
	const modelLimit = getModelContextLimit(model);
	const safeMaxChars = customMaxChars ?? Math.max(8000, modelLimit - 8000) * 4;
	const contextPercent = Math.min(100, Math.round((totalChars / safeMaxChars) * 100));
	const compacted = totalChars > safeMaxChars;
	return {
		contextChars: totalChars,
		maxHistoryChars: safeMaxChars,
		contextPercent,
		compacted,
	};
}
