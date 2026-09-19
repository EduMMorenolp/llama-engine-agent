import { z } from "zod";

export const addServerDto = z.object({
	name: z.string().min(1),
	transport: z.enum(["stdio", "sse", "http"]),
	command: z.string().optional(),
	args: z.array(z.string()).optional(),
	url: z.string().optional(),
	env: z.record(z.string()).optional(),
});

export const serverIdParamsDto = z.object({
	id: z.string().min(1),
});

export type AddServerDto = z.infer<typeof addServerDto>;
export type ServerIdParamsDto = z.infer<typeof serverIdParamsDto>;
