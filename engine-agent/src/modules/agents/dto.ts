import { z } from "zod";

export const createAgentDto = z.object({
	name: z
		.string()
		.min(1)
		.max(64)
		.transform((val) => val.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-"))
		.pipe(z.string().min(1)),
	description: z
		.string()
		.max(500)
		.optional()
		.transform((val) => val?.trim() || "Agente personalizado"),
	corePrompt: z.string().max(10000).optional().default(""),
	tools: z.array(z.string()).optional().default([]),
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
