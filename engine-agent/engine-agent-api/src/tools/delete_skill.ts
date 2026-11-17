import type { ToolSpec } from "./types.js";

export const deleteSkillTool: ToolSpec = {
	type: "function",
	function: {
		name: "delete_skill",
		description: "Elimina una skill que ya no es útil.",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string", description: "Nombre de la skill a eliminar" },
			},
			required: ["name"],
		},
	},
};
