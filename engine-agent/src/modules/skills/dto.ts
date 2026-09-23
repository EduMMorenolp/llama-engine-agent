import { z } from "zod";

export const createSkillDto = z.object({
	name: z.string().min(1).max(64).regex(/^[a-z][a-z0-9-]*$/),
	agent: z.string().min(1),
	description: z.string().min(1).max(500),
	directory: z.string().min(1).max(255),
	metadata: z.record(z.unknown()).default({}),
	allowedTools: z.array(z.string()).default([]),
	triggers: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([]),
});

export const updateSkillDto = z.object({
	description: z.string().min(1).max(500).optional(),
	directory: z.string().min(1).max(255).optional(),
	metadata: z.record(z.unknown()).optional(),
	allowedTools: z.array(z.string()).optional(),
	triggers: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
});

export type CreateSkillDto = z.infer<typeof createSkillDto>;
export type UpdateSkillDto = z.infer<typeof updateSkillDto>;
