import type { ToolSpec } from "./types.js";

export const updateSkillTool: ToolSpec = {
	type: "function",
	function: {
		name: "update_skill",
		description: "Actualiza una skill existente. Usa para refinar instrucciones basándote en resultados.",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string", description: "Nombre de la skill a actualizar" },
				instructions: { type: "string", description: "Nuevas instrucciones (opcional)" },
				description: { type: "string", description: "Nueva descripción (opcional)" },
				metadata: { type: "object", description: "Metadatos adicionales para actualizar" },
			},
			required: ["name"],
		},
	},
};
