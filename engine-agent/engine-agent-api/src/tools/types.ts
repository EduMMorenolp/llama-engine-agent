import type { MemoryService } from "../modules/memories/service.js";
import type { SessionService } from "../modules/sessions/service.js";
import type { SkillService } from "../modules/skills/service.js";

export interface ToolParameters {
	type: "object";
	properties: Record<string, { type: string; description?: string; enum?: string[] }>;
	required?: string[];
}

export interface ToolSpec {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: ToolParameters;
	};
}

export interface ToolContext {
	sessionId: string;
	workDir: string;
	store: SessionService;
	memoryService?: MemoryService;
	skillService?: SkillService;
}

export type ToolHandler = (args: Record<string, unknown>, context: ToolContext) => Promise<string>;

export interface ToolDefinition {
	spec: ToolSpec;
	handler: ToolHandler;
	enabled: boolean;
}

export interface CustomToolConfig {
	name: string;
	description: string;
	parameters: ToolParameters;
	handlerType: "bash" | "http" | "prompt";
	handlerConfig: Record<string, unknown>;
}
