import type { ToolSpec } from "./types.js";

export const memorizeTool: ToolSpec = {
	type: "function",
	function: {
		name: "memorize",
		description:
			"Guardar o actualizar un dato importante del usuario, preferencia técnica, stack, acuerdo o hecho relevante en la memoria persistente (SQLite). Úsala SIEMPRE que el usuario diga 'recuerda', 'memoriza', 'guarda en memoria' o comparta información personal/técnica clave.",
		parameters: {
			type: "object",
			properties: {
				key: {
					type: "string",
					description: "Clave descriptiva en snake_case (ej. 'user_name', 'preferencia_stack')",
				},
				content: {
					type: "string",
					description: "Contenido o hecho a recordar de forma persistente",
				},
				tags: {
					type: "string",
					description: "Etiquetas separadas por coma opcionales (ej. 'usuario, stack')",
				},
			},
			required: ["key", "content"],
		},
	},
};

export const searchMemoriesTool: ToolSpec = {
	type: "function",
	function: {
		name: "search_memories",
		description: "Buscar en las memorias guardadas",
		parameters: {
			type: "object",
			properties: {
				query: { type: "string", description: "Texto de búsqueda" },
			},
			required: ["query"],
		},
	},
};

export const updateMemoryTool: ToolSpec = {
	type: "function",
	function: {
		name: "update_memory",
		description: "Actualizar una memoria existente",
		parameters: {
			type: "object",
			properties: {
				key: { type: "string", description: "Clave de la memoria" },
				content: { type: "string", description: "Nuevo contenido" },
			},
			required: ["key", "content"],
		},
	},
};
