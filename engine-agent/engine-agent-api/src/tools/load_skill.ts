import type { ToolSpec } from "./types.js";

export const loadSkillTool: ToolSpec = {
	type: "function",
	function: {
		name: "load_skill",
		description:
			"Carga una skill completa con sus instrucciones. Usa esta skill cuando el task sea relevante.",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string", description: "Nombre de la skill a cargar" },
			},
			required: ["name"],
		},
	},
};
