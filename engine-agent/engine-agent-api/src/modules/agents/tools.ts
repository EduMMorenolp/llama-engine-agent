import type { ToolRegistry } from "../../tools/registry.js";
import type { ToolHandler, ToolSpec } from "../../tools/types.js";

export const listAgentsTool: ToolSpec = {
	type: "function",
	function: {
		name: "list_agents",
		description:
			"Lista todos los agentes y personalidades especializadas configuradas en el sistema (nombre, rol, descripción, modelo y herramientas).",
		parameters: {
			type: "object",
			properties: {},
		},
	},
};

export const createAgentTool: ToolSpec = {
	type: "function",
	function: {
		name: "create_agent",
		description:
			"Crea y registra un nuevo agente o personalidad especializada en el sistema con su nombre identificador, rol, system prompt, herramientas asignadas y modelo.",
		parameters: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description:
						"Identificador único del agente en minúsculas sin espacios (ej: 'sql-expert', 'devops-architect', 'asistente-ventas')",
				},
				description: {
					type: "string",
					description: "Descripción resumida del rol y capacidades principales del agente",
				},
				corePrompt: {
					type: "string",
					description:
						"System prompt detallado con las instrucciones, rol y directivas de comportamiento del agente",
				},
				tools: {
					type: "string",
					description:
						"Lista de herramientas asignadas separadas por coma (ej: 'web_search, read_file, execute_bash, search_memories')",
				},
				model: {
					type: "string",
					description:
						"Modelo asignado al agente (ej: 'qwen3.5-4b', 'qwen3.5-9b', 'qwen2.5-coder-7b')",
				},
				maxIterations: {
					type: "number",
					description:
						"Número máximo de iteraciones de razonamiento (entre 1 y 50, por defecto 10)",
				},
			},
			required: ["name", "description", "corePrompt"],
		},
	},
};

export const updateAgentTool: ToolSpec = {
	type: "function",
	function: {
		name: "update_agent",
		description:
			"Actualiza un agente o personalidad existente modificando su rol, system prompt, herramientas asignadas, modelo o iteraciones.",
		parameters: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Nombre identificador exacto del agente a modificar",
				},
				description: {
					type: "string",
					description: "Nueva descripción del rol",
				},
				corePrompt: {
					type: "string",
					description: "Nuevo system prompt o instrucciones operativas",
				},
				tools: {
					type: "string",
					description: "Nuevas herramientas asignadas separadas por coma",
				},
				model: {
					type: "string",
					description: "Nuevo modelo asignado",
				},
				maxIterations: {
					type: "number",
					description: "Nuevo límite de iteraciones",
				},
				enabled: {
					type: "boolean",
					description: "Activar o desactivar el agente",
				},
			},
			required: ["name"],
		},
	},
};

export const deleteAgentTool: ToolSpec = {
	type: "function",
	function: {
		name: "delete_agent",
		description:
			"Elimina un agente especializado del sistema por su nombre. Nota: el agente base 'asistente' está protegido y no se puede eliminar.",
		parameters: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Nombre del agente a eliminar",
				},
			},
			required: ["name"],
		},
	},
};

export const listAgentsHandler: ToolHandler = async (_args, ctx) => {
	if (!ctx.agentService) return "Servicio de agentes no disponible en este contexto.";
	const agents = ctx.agentService.list();
	if (agents.length === 0) {
		return "No hay agentes registrados en el sistema.";
	}
	return agents
		.map((ag) => {
			const toolsList =
				Array.isArray(ag.tools) && ag.tools.length > 0 ? ag.tools.join(", ") : "ninguna";
			return `- **${ag.name}** [${ag.model || "qwen3.5-4b"}]\n  Descripción: ${ag.description}\n  Herramientas: ${toolsList}\n  Max Iteraciones: ${ag.maxIterations ?? 10}`;
		})
		.join("\n\n");
};

export const createAgentHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.agentService) return "Servicio de agentes no disponible en este contexto.";
	const name = String(args.name || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "-");
	if (!name) return "Error: el nombre del agente no puede estar vacío.";

	const existing = ctx.agentService.getOrNull(name);
	if (existing) {
		return `Error: ya existe un agente registrado con el nombre "${name}". Usa 'update_agent' para modificarlo.`;
	}

	const description = String(args.description || "Agente especializado").trim();
	const corePrompt = String(args.corePrompt || "").trim();
	const model = args.model ? String(args.model).trim() : "qwen3.5-4b";
	const maxIterations =
		typeof args.maxIterations === "number" ? Math.max(1, Math.min(50, args.maxIterations)) : 10;

	let toolsArray: string[] = [];
	if (typeof args.tools === "string" && args.tools.trim()) {
		toolsArray = args.tools
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
	} else if (Array.isArray(args.tools)) {
		toolsArray = args.tools.map((t) => String(t).trim()).filter(Boolean);
	}
	if (toolsArray.length === 0) {
		toolsArray = ["web_search", "read_file", "search_memories"];
	}

	const created = ctx.agentService.create({
		name,
		description,
		corePrompt,
		model,
		tools: toolsArray,
		maxIterations,
		memoryBudget: 500,
		skillBudget: 3000,
	});

	const toolsDisplay = Array.isArray(created.tools) ? created.tools.join(", ") : "ninguna";
	const toolsCount = Array.isArray(created.tools) ? created.tools.length : 0;
	return `¡Agente "${created.name}" creado y registrado exitosamente!\n\n- Rol: ${created.description}\n- Modelo: ${created.model}\n- Herramientas (${toolsCount}): ${toolsDisplay}\n- Max Iteraciones: ${created.maxIterations}`;
};

export const updateAgentHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.agentService) return "Servicio de agentes no disponible en este contexto.";
	const name = String(args.name || "")
		.trim()
		.toLowerCase();
	if (!name) return "Error: debes especificar el nombre del agente a actualizar.";

	const existing = ctx.agentService.getOrNull(name);
	if (!existing) {
		return `Error: no existe ningún agente con el nombre "${name}".`;
	}

	const updateData: Parameters<typeof ctx.agentService.update>[1] = {};
	if (args.description !== undefined) updateData.description = String(args.description).trim();
	if (args.corePrompt !== undefined) updateData.corePrompt = String(args.corePrompt).trim();
	if (args.model !== undefined) updateData.model = String(args.model).trim();
	if (typeof args.maxIterations === "number")
		updateData.maxIterations = Math.max(1, Math.min(50, args.maxIterations));
	if (typeof args.enabled === "boolean") updateData.enabled = args.enabled;

	if (args.tools !== undefined) {
		let toolsArray: string[] = [];
		if (typeof args.tools === "string") {
			toolsArray = args.tools
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
		} else if (Array.isArray(args.tools)) {
			toolsArray = args.tools.map((t) => String(t).trim()).filter(Boolean);
		}
		updateData.tools = toolsArray;
	}

	const updated = ctx.agentService.update(name, updateData);
	const updatedToolsDisplay = Array.isArray(updated.tools) ? updated.tools.join(", ") : "ninguna";
	return `Agente "${updated.name}" actualizado exitosamente.\n- Descripción: ${updated.description}\n- Modelo: ${updated.model}\n- Herramientas: ${updatedToolsDisplay}`;
};

export const deleteAgentHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.agentService) return "Servicio de agentes no disponible en este contexto.";
	const name = String(args.name || "")
		.trim()
		.toLowerCase();
	if (name === "asistente") {
		return "Acción denegada: el agente 'asistente' es el agente base del sistema y no puede ser eliminado.";
	}
	const deleted = ctx.agentService.delete(name);
	if (!deleted) {
		return `No se encontró el agente "${name}" para eliminar.`;
	}
	return `Agente "${name}" eliminado correctamente del sistema.`;
};

export function registerAgentTools(registry: ToolRegistry): void {
	registry.register(listAgentsTool, listAgentsHandler);
	registry.register(createAgentTool, createAgentHandler);
	registry.register(updateAgentTool, updateAgentHandler);
	registry.register(deleteAgentTool, deleteAgentHandler);
}
