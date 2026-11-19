import type { ToolSpec } from "./types.js";

export const webSearchTool: ToolSpec = {
	type: "function",
	function: {
		name: "web_search",
		description:
			"Busca información en internet en tiempo real: clima actual y pronóstico de cualquier ciudad (hoy, mañana y próximos días), noticias, documentación técnica o consultas generales en la web. Usala también cuando se active la skill 'web-research'.",
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description:
						"Consulta de búsqueda (ej: 'clima mañana en La Plata', 'Node.js 22 release notes')",
				},
				location: {
					type: "string",
					description:
						"Ciudad o localidad específica cuando se consulta el clima (ej: 'La Plata', 'Buenos Aires', 'Córdoba', 'Madrid')",
				},
			},
			required: ["query"],
		},
	},
};

export const webFetchTool: ToolSpec = {
	type: "function",
	function: {
		name: "web_fetch",
		description:
			"Descarga y extrae el contenido de texto o JSON de cualquier URL pública (HTTP/HTTPS).",
		parameters: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "URL completa a consultar (ej: 'https://wttr.in/La+Plata?format=3')",
				},
			},
			required: ["url"],
		},
	},
};
