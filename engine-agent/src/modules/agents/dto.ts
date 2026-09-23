import { z } from "zod";

export const createAgentDto = z.object({
	name: z.string().min(1).max(64).regex(/^[a-z][a-z0-9-]*$/),
	description: z.string().min(1).max(500),
	corePrompt: z.string().min(1).max(10000).optional(),
	tools: z.array(z.string()).optional(),
	model: z.string().optional().nullable(),
	maxIterations: z.number().int().min(1).max(50).optional(),
	memoryBudget: z.number().int().min(0).optional(),
	skillBudget: z.number().int().min(0).optional(),
});

export const updateAgentDto = z.object({
	description: z.string().min(1).max(500).optional(),
	corePrompt: z.string().min(0).max(10000).optional(),
	tools: z.array(z.string()).optional(),
	model: z.string().optional().nullable(),
	maxIterations: z.number().int().min(1).max(50).optional(),
	memoryBudget: z.number().int().min(0).optional(),
	skillBudget: z.number().int().min(0).optional(),
	enabled: z.boolean().optional(),
});

export type CreateAgentDto = z.infer<typeof createAgentDto>;
export type UpdateAgentDto = z.infer<typeof updateAgentDto>;
