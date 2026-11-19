import type { ToolSpec } from "./types.js";

export const listSkillsTool: ToolSpec = {
	type: "function",
	function: {
		name: "list_skills",
		description:
			"Lista todas las skills disponibles e instaladas en el agente con su nombre, descripción, agente asignado, triggers y tags.",
		parameters: {
			type: "object",
			properties: {},
		},
	},
};

export const loadSkillTool: ToolSpec = {
	type: "function",
	function: {
		name: "load_skill",
		description:
			"Carga una skill por su nombre con sus instrucciones completas. Si se omite 'name' o se pasa 'list', lista todas las skills disponibles.",
		parameters: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description:
						"Nombre de la skill a cargar (ej: 'code-review', 'quick-fix'). Opcional: si se omite o es 'list', devuelve todas las skills disponibles.",
				},
			},
			required: [],
		},
	},
};
