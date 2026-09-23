import type { ToolSpec } from "./types.js";

export const reflectTool: ToolSpec = {
	type: "function",
	function: {
		name: "reflect",
		description: "Reflexiona sobre un resultado. Escribe lecciones aprendidas en la memoria para mejorar futuras ejecuciones.",
		parameters: {
			type: "object",
			properties: {
				result: { type: "string", description: "Resultado de la tarea ejecutada" },
				success: { type: "boolean", description: "¿La tarea fue exitosa?" },
				lesson: { type: "string", description: "Lección aprendida o patrón identificado" },
			},
			required: ["result", "success", "lesson"],
		},
	},
};
