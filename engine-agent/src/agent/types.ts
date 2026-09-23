export interface ModelSettings {
	enableReasoning?: boolean;
	temperature?: number;
	topP?: number;
	maxTokens?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
}

export interface AgentOptions {
	sessionId: string;
	message: string;
	model?: string;
	workDir?: string;
	systemPrompt?: string;
	enabledTools?: string[];
	maxIterations?: number;
	modelSettings?: ModelSettings;
	agent?: string;
	depth?: number;
}

export interface AgentResult {
	content: string;
	toolCalls: ToolCallResult[];
	iterations: number;
}

export interface ToolCallResult {
	name: string;
	args: Record<string, unknown>;
	result: string;
}

export interface StreamEvent {
	type: "message" | "tool_start" | "tool_end" | "done" | "error";
	payload: Record<string, unknown>;
}

export interface LLMMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string | any[] | null;
	tool_calls?: LLMToolCall[];
	tool_call_id?: string;
}

export interface LLMToolCall {
	id: string;
	type: "function";
	function: {
		name: string;
		arguments: string;
	};
}

export interface LLMResponse {
	content: string | null;
	tool_calls?: LLMToolCall[];
	finish_reason: string | null;
}

// Agent definition (stored in DB, loaded for spawn_agent)
export interface AgentDefinition {
	name: string;
	description: string;
	corePrompt: string;
	tools: string[] | null;
	model: string | null;
	maxIterations: number | null;
	memoryBudget: number;
	skillBudget: number;
	enabled: boolean;
}

// Skill metadata (Level 0: always in system prompt)
export interface SkillMetadata {
	triggers: string[];
	allowedTools: string[];
	tags: string[];
	examples: string[];
	[key: string]: unknown;
}

// Skill representation
export interface Skill {
	name: string;
	agent: string;
	description: string;
	directory: string;
	metadata: SkillMetadata;
	allowedTools: string[];
	triggers: string[];
	tags: string[];
	usageCount: number;
	successCount: number;
	createdAt: number;
	updatedAt: number;
}

// Skill file
export interface SkillFile {
	skillName: string;
	filePath: string;
	fileType: "script" | "reference" | "asset";
	content: string;
	updatedAt: number;
}
