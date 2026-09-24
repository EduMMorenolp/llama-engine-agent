import { z } from "zod";

export const createSessionDto = z.object({
	id: z.string().optional(),
	name: z.string().optional().nullable(),
	model: z.string().optional().nullable(),
	tags: z.array(z.string()).max(10).optional(),
});

export const updateSessionDto = z.object({
	name: z.string().optional().nullable(),
	model: z.string().optional().nullable(),
	tags: z.array(z.string()).max(10).optional(),
	autoTitled: z.boolean().optional(),
	summary: z.string().optional().nullable(),
});

export const forkSessionDto = z.object({
	upToMessageId: z.string().optional(),
	name: z.string().optional(),
});

export const updateMessageDto = z.object({
	favorite: z.boolean().optional(),
});

export type CreateSessionDto = z.infer<typeof createSessionDto>;
export type UpdateSessionDto = z.infer<typeof updateSessionDto>;
export type ForkSessionDto = z.infer<typeof forkSessionDto>;
export type UpdateMessageDto = z.infer<typeof updateMessageDto>;
