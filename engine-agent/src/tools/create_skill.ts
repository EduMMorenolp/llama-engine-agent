import type { ToolSpec } from "./types.js";

export const createSkillTool: ToolSpec = {
	type: "function",
	function: {
		name: "create_skill",
		description: "Crea una nueva skill con instrucciones y opcionalmente scripts de referencia.",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string", description: "Nombre único de la skill (minúsculas con guiones)" },
				description: { type: "string", description: "Descripción corta de cuándo usar esta skill" },
				instructions: { type: "string", description: "Instrucciones completas de la skill" },
				triggers: { type: "string", description: "Patrones de activación (JSON array)" },
				tags: { type: "string", description: "Tags de categoría (JSON array)" },
			},
			required: ["name", "description", "instructions"],
		},
	},
};
