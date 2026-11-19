import type { ToolRegistry } from "../../tools/registry.js";
import type { ToolSpec } from "../../tools/types.js";
import { getMCPManager } from "./manager.js";

export const mcpListServersTool: ToolSpec = {
	type: "function",
	function: {
		name: "mcp_list_servers",
		description:
			"Lista todos los servidores MCP (Model Context Protocol) configurados en el agente, incluyendo su ID, nombre, transporte (http, sse, stdio), URL/comando, estado (connected, disconnected, error) y cantidad de herramientas expuestas.",
		parameters: {
			type: "object",
			properties: {},
		},
	},
};

export const mcpAddServerTool: ToolSpec = {
	type: "function",
	function: {
		name: "mcp_add_server",
		description:
			"Registra o actualiza un servidor MCP (Model Context Protocol) en el sistema y prueba su conexión automáticamente. Soporta servidores HTTP/SSE (como n8n MCP con url y bearerToken/headers) y procesos locales STDIO (command y args).",
		parameters: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Nombre identificador del servidor MCP (ej. 'n8n-mcp', 'filesystem-mcp').",
				},
				transport: {
					type: "string",
					enum: ["http", "sse", "stdio"],
					description: "Tipo de transporte: 'http', 'sse' o 'stdio'.",
				},
				url: {
					type: "string",
					description:
						"URL del endpoint para transporte 'http' o 'sse' (ej. 'http://localhost:5678/mcp-server/http').",
				},
				bearerToken: {
					type: "string",
					description:
						"Access Token o Bearer Token opcional para autenticación en el header Authorization: Bearer <token>.",
				},
				headers: {
					type: "object",
					description: "Headers HTTP adicionales opcionales (ej. {'Authorization': 'Bearer ...'}).",
				},
				command: {
					type: "string",
					description: "Comando ejecutable cuando transport es 'stdio' (ej. 'npx').",
				},
				args: {
					type: "array",
					description:
						"Lista de argumentos para el comando 'stdio' (ej. ['-y', '@modelcontextprotocol/server-memory']).",
				},
			},
			required: ["name", "transport"],
		},
	},
};

export const mcpConnectServerTool: ToolSpec = {
	type: "function",
	function: {
		name: "mcp_connect_server",
		description:
			"Ejecuta el test de conexión con un servidor MCP registrado (por ID o por nombre como 'n8n-mcp') y descubre/activa sus herramientas en el agente.",
		parameters: {
			type: "object",
			properties: {
				idOrName: {
					type: "string",
					description: "ID o nombre del servidor MCP a conectar y probar (ej. 'n8n-mcp').",
				},
			},
			required: ["idOrName"],
		},
	},
};

export const mcpRemoveServerTool: ToolSpec = {
	type: "function",
	function: {
		name: "mcp_remove_server",
		description: "Elimina un servidor MCP del sistema por su ID o nombre.",
		parameters: {
			type: "object",
			properties: {
				idOrName: {
					type: "string",
					description: "ID o nombre del servidor MCP a eliminar.",
				},
			},
			required: ["idOrName"],
		},
	},
};

export function registerMCPTools(registry: ToolRegistry): void {
	const manager = getMCPManager(registry);

	registry.register(mcpListServersTool, async () => {
		const servers = manager.listServers();
		if (servers.length === 0) {
			return "No hay servidores MCP registrados.";
		}
		return JSON.stringify(
			servers.map((s) => ({
				id: s.id,
				name: s.name,
				transport: s.transport,
				url: s.url,
				command: s.command,
				args: s.args,
				hasAuthHeader: Boolean(s.headers?.Authorization),
				status: s.status,
				toolsCount: s.toolsCount ?? 0,
				errorMessage: s.errorMessage,
			})),
			null,
			2,
		);
	});

	registry.register(mcpAddServerTool, async (args) => {
		const name = String(args.name || "").trim();
		const rawTransport = String(args.transport || "http")
			.trim()
			.toLowerCase();
		const transport: "http" | "sse" | "stdio" =
			rawTransport === "stdio" ? "stdio" : rawTransport === "sse" ? "sse" : "http";

		if (!name) {
			return "Error: El parámetro 'name' es obligatorio.";
		}

		const headers: Record<string, string> = {};
		if (args.headers && typeof args.headers === "object") {
			for (const [k, v] of Object.entries(args.headers as Record<string, unknown>)) {
				if (typeof v === "string" && v.trim()) {
					headers[k] = v.trim();
				}
			}
		}
		if (typeof args.bearerToken === "string" && args.bearerToken.trim()) {
			const token = args.bearerToken.trim().replace(/^Bearer\s+/i, "");
			headers.Authorization = `Bearer ${token}`;
		}

		const url = typeof args.url === "string" ? args.url.trim() : undefined;
		const command = typeof args.command === "string" ? args.command.trim() : undefined;
		const cmdArgs = Array.isArray(args.args) ? args.args.map(String) : undefined;

		const server = manager.addServer({
			name,
			transport,
			url,
			command,
			args: cmdArgs,
			headers: Object.keys(headers).length > 0 ? headers : undefined,
		});

		const connectRes = await manager.connect(server.id);
		return JSON.stringify(
			{
				message: connectRes.success
					? `Servidor MCP "${server.name}" registrado y conectado exitosamente.`
					: `Servidor MCP "${server.name}" registrado, pero el test de conexión reportó un error: ${connectRes.error}`,
				server: {
					id: server.id,
					name: server.name,
					transport: server.transport,
					url: server.url,
					status: server.status,
					toolsCount: server.toolsCount,
					discoveredTools: connectRes.tools,
					error: connectRes.error,
				},
			},
			null,
			2,
		);
	});

	registry.register(mcpConnectServerTool, async (args) => {
		const idOrName = String(args.idOrName || "").trim();
		if (!idOrName) {
			return "Error: 'idOrName' es requerido.";
		}
		try {
			const res = await manager.connect(idOrName);
			const srv = manager.getServer(idOrName);
			return JSON.stringify(
				{
					success: res.success,
					server: srv?.name || idOrName,
					status: srv?.status,
					toolsCount: srv?.toolsCount ?? res.tools.length,
					tools: res.tools,
					error: res.error,
				},
				null,
				2,
			);
		} catch (err: unknown) {
			return `Error conectando servidor MCP "${idOrName}": ${err instanceof Error ? err.message : String(err)}`;
		}
	});

	registry.register(mcpRemoveServerTool, async (args) => {
		const idOrName = String(args.idOrName || "").trim();
		const removed = await manager.removeServer(idOrName);
		return removed
			? `Servidor MCP "${idOrName}" eliminado correctamente.`
			: `No se encontró ningún servidor MCP con ID o nombre "${idOrName}".`;
	});
}
