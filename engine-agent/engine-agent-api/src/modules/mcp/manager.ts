import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ToolRegistry } from "../../tools/registry.js";
import type { MCPServerConfig, MCPToolDefinition } from "./types.js";

interface ActiveProcess {
	process: ChildProcess;
	registeredTools: string[];
	pendingRequests: Map<
		number | string,
		{ resolve: (res: any) => void; reject: (err: any) => void }
	>;
	reqId: number;
}

const DEFAULT_N8N_TOKEN =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZWQ1OTk4MS0xNTJkLTRiMGEtYWEwYy04MmNmYzFiYzI1MTYiLCJpc3MiOiJuOG4iLCJqdGkiOiI5MmY2YThkOS1iZjI5LTQ0YjItOGYyMi03ZGYxNmM3NDQyMTQiLCJpYXQiOjE3OTUxMDQ5NzEsImF1ZCI6Im1jcC1zZXJ2ZXItYXBpIn0.uCbweM9ypvobXT5cEequpHoWREUToDGrDu1hjA-R5vA";

function resolveContainerUrl(rawUrl: string): string {
	try {
		if (fs.existsSync("/.dockerenv")) {
			return rawUrl.replace(
				/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
				"http://host.docker.internal$2",
			);
		}
	} catch {}
	return rawUrl;
}

function parseJsonOrSseResponse(rawText: string): any {
	const trimmed = rawText.trim();
	if (!trimmed) return {};
	try {
		return JSON.parse(trimmed);
	} catch {
		// Parse SSE lines: data: {...}
		const lines = trimmed.split(/\r?\n/);
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i].trim();
			if (line.startsWith("data:")) {
				const dataPayload = line.slice(5).trim();
				try {
					return JSON.parse(dataPayload);
				} catch {}
			}
		}
		return {};
	}
}

export class MCPManager {
	private servers = new Map<string, MCPServerConfig>();
	private activeProcesses = new Map<string, ActiveProcess>();
	private activeHttpTools = new Map<string, string[]>();
	private storagePath: string;

	constructor(private toolRegistry: ToolRegistry) {
		const dataDir = path.resolve(process.cwd(), "data");
		try {
			if (!fs.existsSync(dataDir)) {
				fs.mkdirSync(dataDir, { recursive: true });
			}
		} catch {}
		this.storagePath = path.join(dataDir, "mcp-servers.json");
		this.loadFromDisk();
	}

	private loadFromDisk() {
		let loaded = false;
		try {
			if (fs.existsSync(this.storagePath)) {
				const raw = fs.readFileSync(this.storagePath, "utf-8");
				const parsed = JSON.parse(raw) as MCPServerConfig[];
				if (Array.isArray(parsed) && parsed.length > 0) {
					for (const item of parsed) {
						// Skip deprecated broken preset @modelcontextprotocol/server-fetch
						if (
							item.name === "Fetch & Web Search" ||
							item.args?.includes("@modelcontextprotocol/server-fetch")
						) {
							continue;
						}
						this.servers.set(item.id, {
							...item,
							status: "disconnected",
						});
					}
					loaded = this.servers.size > 0;
				}
			}
		} catch {}

		if (!loaded) {
			this.addPresetServers();
		} else {
			// Ensure n8n-mcp is present
			const hasN8n = Array.from(this.servers.values()).some(
				(s) => s.name.toLowerCase() === "n8n-mcp" || s.url?.includes("/mcp-server/http"),
			);
			if (!hasN8n) {
				this.addServer({
					name: "n8n-mcp",
					transport: "http",
					url: "http://localhost:5678/mcp-server/http",
					headers: {
						Authorization: `Bearer ${DEFAULT_N8N_TOKEN}`,
					},
				});
			}
		}

		this.saveToDisk();

		// Auto-connect n8n-mcp in background on startup
		for (const s of this.servers.values()) {
			if (s.transport === "http" || s.transport === "sse") {
				void this.connect(s.id).catch(() => {});
			}
		}
	}

	private saveToDisk() {
		try {
			const list = Array.from(this.servers.values());
			fs.writeFileSync(this.storagePath, JSON.stringify(list, null, 2), "utf-8");
		} catch {}
	}

	private addPresetServers() {
		const presets: Omit<MCPServerConfig, "id" | "status">[] = [
			{
				name: "n8n-mcp",
				transport: "http",
				url: "http://localhost:5678/mcp-server/http",
				headers: {
					Authorization: `Bearer ${DEFAULT_N8N_TOKEN}`,
				},
			},
			{
				name: "Memory Graph",
				transport: "stdio",
				command: "npx",
				args: ["-y", "@modelcontextprotocol/server-memory"],
			},
			{
				name: "Filesystem MCP",
				transport: "stdio",
				command: "npx",
				args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
			},
		];

		for (const p of presets) {
			const id = randomUUID();
			this.servers.set(id, {
				id,
				...p,
				status: "disconnected",
				toolsCount: 0,
			});
		}
	}

	listServers(): MCPServerConfig[] {
		return Array.from(this.servers.values());
	}

	getServer(idOrName: string): MCPServerConfig | undefined {
		if (this.servers.has(idOrName)) {
			return this.servers.get(idOrName);
		}
		const lower = idOrName.toLowerCase();
		return Array.from(this.servers.values()).find(
			(s) => s.id.toLowerCase() === lower || s.name.toLowerCase() === lower,
		);
	}

	addServer(config: Omit<MCPServerConfig, "id" | "status">): MCPServerConfig {
		// If a server with the same name already exists, update it instead of duplicating
		const existingByName = Array.from(this.servers.values()).find(
			(s) => s.name.toLowerCase() === config.name.trim().toLowerCase(),
		);
		if (existingByName) {
			return this.updateServer(existingByName.id, config) ?? existingByName;
		}

		const id = randomUUID();
		const server: MCPServerConfig = {
			id,
			...config,
			name: config.name.trim(),
			status: "disconnected",
			toolsCount: 0,
		};
		this.servers.set(id, server);
		this.saveToDisk();
		return server;
	}

	updateServer(
		id: string,
		config: Partial<Omit<MCPServerConfig, "id" | "status">>,
	): MCPServerConfig | undefined {
		const existing = this.getServer(id);
		if (!existing) return undefined;
		const updated: MCPServerConfig = {
			...existing,
			...config,
			id: existing.id,
		};
		this.servers.set(existing.id, updated);
		this.saveToDisk();
		return updated;
	}

	async removeServer(idOrName: string): Promise<boolean> {
		const target = this.getServer(idOrName);
		if (!target) return false;
		if (this.activeProcesses.has(target.id) || this.activeHttpTools.has(target.id)) {
			await this.disconnect(target.id);
		}
		const deleted = this.servers.delete(target.id);
		if (deleted) this.saveToDisk();
		return deleted;
	}

	private async connectHttpMcp(
		server: MCPServerConfig,
	): Promise<{ success: boolean; tools: string[]; error?: string }> {
		if (!server.url) {
			server.status = "error";
			server.errorMessage = "URL de endpoint requerida para transporte HTTP/SSE";
			this.saveToDisk();
			return { success: false, tools: [], error: server.errorMessage };
		}

		const targetUrl = resolveContainerUrl(server.url);
		const sessionHeaders: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
			...(server.headers ?? {}),
		};

		let reqCounter = 1;
		const sendHttpRpc = async (
			method: string,
			params: Record<string, unknown> = {},
			isNotification = false,
		): Promise<any> => {
			const bodyPayload: Record<string, unknown> = {
				jsonrpc: "2.0",
				method,
				params,
			};
			if (!isNotification) {
				bodyPayload.id = reqCounter++;
			}

			const res = await fetch(targetUrl, {
				method: "POST",
				headers: sessionHeaders,
				body: JSON.stringify(bodyPayload),
				signal: AbortSignal.timeout(12000),
			});

			const mcpSessionId = res.headers.get("mcp-session-id");
			if (mcpSessionId) {
				sessionHeaders["mcp-session-id"] = mcpSessionId;
			}

			if (res.status === 401 || res.status === 403) {
				throw new Error(
					`Autenticación rechazada por el servidor MCP (HTTP ${res.status}). Verifica el Access Token / Bearer Token.`,
				);
			}

			if (!res.ok && res.status >= 400) {
				const errText = await res.text().catch(() => "");
				throw new Error(
					`HTTP ${res.status} (${res.statusText})${errText ? `: ${errText.slice(0, 180)}` : ""}`,
				);
			}

			const rawText = await res.text();
			const parsed = parseJsonOrSseResponse(rawText);
			if (parsed?.error) {
				throw new Error(parsed.error.message || JSON.stringify(parsed.error));
			}
			return parsed?.result ?? parsed;
		};

		try {
			// Unregister previous HTTP tools for this server if any
			this.cleanupHttpServer(server.id);

			// 1. Try JSON-RPC MCP initialize handshake (Streamable HTTP)
			let mcpTools: MCPToolDefinition[] = [];
			try {
				await sendHttpRpc("initialize", {
					protocolVersion: "2024-11-05",
					capabilities: {},
					clientInfo: { name: "llama-engine-agent", version: "1.0.0" },
				});
				await sendHttpRpc("notifications/initialized", {}, true).catch(() => {});
				const toolsRes = await sendHttpRpc("tools/list", {});
				if (Array.isArray(toolsRes?.tools)) {
					mcpTools = toolsRes.tools;
				}
			} catch (rpcErr: unknown) {
				// If initialize failed due to 401/403 or ECONNREFUSED, rethrow; otherwise fallback to GET probe
				const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
				if (
					msg.includes("Autenticación rechazada") ||
					msg.includes("fetch failed") ||
					msg.includes("ECONNREFUSED")
				) {
					throw rpcErr;
				}
				const probeRes = await fetch(targetUrl, {
					method: "GET",
					headers: server.headers ?? {},
					signal: AbortSignal.timeout(6000),
				});
				if (probeRes.status === 401 || probeRes.status === 403) {
					throw new Error(
						`Autenticación rechazada (HTTP ${probeRes.status}). Verifica el Access Token.`,
					);
				}
				if (probeRes.status >= 500) {
					throw new Error(`Servidor respondió con HTTP ${probeRes.status}`);
				}
			}

			const registeredNames: string[] = [];
			const safePrefix = server.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

			for (const mcpTool of mcpTools) {
				const toolName = `mcp_${safePrefix}_${mcpTool.name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
				this.toolRegistry.register(
					{
						type: "function",
						function: {
							name: toolName,
							description: mcpTool.description || `MCP tool ${mcpTool.name} from ${server.name}`,
							parameters: (mcpTool.inputSchema as any) || { type: "object", properties: {} },
						},
					},
					async (args) => {
						const callRes = await sendHttpRpc("tools/call", {
							name: mcpTool.name,
							arguments: args,
						});
						if (callRes?.content) {
							if (Array.isArray(callRes.content)) {
								return callRes.content.map((c: any) => c.text ?? JSON.stringify(c)).join("\n");
							}
							return typeof callRes.content === "string"
								? callRes.content
								: JSON.stringify(callRes.content);
						}
						return JSON.stringify(callRes);
					},
					true,
				);
				registeredNames.push(toolName);
			}

			this.activeHttpTools.set(server.id, registeredNames);
			server.status = "connected";
			server.toolsCount =
				registeredNames.length > 0 ? registeredNames.length : server.toolsCount || 1;
			server.errorMessage = undefined;
			this.saveToDisk();

			return { success: true, tools: registeredNames };
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			server.status = "error";
			server.errorMessage = msg;
			this.saveToDisk();
			return { success: false, tools: [], error: msg };
		}
	}

	async connect(idOrName: string): Promise<{ success: boolean; tools: string[]; error?: string }> {
		const server = this.getServer(idOrName);
		if (!server) {
			throw new Error(`MCP Server "${idOrName}" no encontrado`);
		}

		if (server.transport === "http" || server.transport === "sse") {
			return this.connectHttpMcp(server);
		}

		if (server.status === "connected" && this.activeProcesses.has(server.id)) {
			const active = this.activeProcesses.get(server.id);
			return { success: true, tools: active?.registeredTools ?? [] };
		}

		if (server.transport !== "stdio" || !server.command) {
			server.status = "error";
			server.errorMessage = `Transporte ${server.transport} requiere un comando ejecutable válido`;
			this.saveToDisk();
			return { success: false, tools: [], error: server.errorMessage };
		}

		try {
			const child = spawn(server.command, server.args ?? [], {
				env: { ...process.env, ...(server.env ?? {}) },
				shell: true,
			});

			const pendingRequests = new Map<
				number | string,
				{ resolve: (res: any) => void; reject: (err: any) => void }
			>();
			const active: ActiveProcess = {
				process: child,
				registeredTools: [],
				pendingRequests,
				reqId: 1,
			};

			let buffer = "";
			child.stdout?.on("data", (chunk: Buffer) => {
				buffer += chunk.toString("utf-8");
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					try {
						const json = JSON.parse(trimmed);
						if (json.id !== undefined && pendingRequests.has(json.id)) {
							const handler = pendingRequests.get(json.id)!;
							pendingRequests.delete(json.id);
							if (json.error) {
								handler.reject(new Error(json.error.message || JSON.stringify(json.error)));
							} else {
								handler.resolve(json.result);
							}
						}
					} catch {
						// Ignored non-JSON line
					}
				}
			});

			child.on("error", (err) => {
				server.status = "error";
				server.errorMessage = err.message;
				this.cleanupServer(server.id);
				this.saveToDisk();
			});

			child.on("exit", () => {
				server.status = "disconnected";
				this.cleanupServer(server.id);
				this.saveToDisk();
			});

			this.activeProcesses.set(server.id, active);

			const sendRpc = (method: string, params: Record<string, unknown> = {}): Promise<any> => {
				return new Promise((resolve, reject) => {
					const reqId = active.reqId++;
					const timeout = setTimeout(() => {
						if (pendingRequests.has(reqId)) {
							pendingRequests.delete(reqId);
							reject(new Error(`Timeout esperando respuesta de MCP server para ${method}`));
						}
					}, 15000);

					pendingRequests.set(reqId, {
						resolve: (res) => {
							clearTimeout(timeout);
							resolve(res);
						},
						reject: (err) => {
							clearTimeout(timeout);
							reject(err);
						},
					});

					const msg = JSON.stringify({
						jsonrpc: "2.0",
						id: reqId,
						method,
						params,
					});
					child.stdin?.write(`${msg}\n`);
				});
			};

			// Initialize handshake
			await sendRpc("initialize", {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "llama-engine-agent", version: "1.0.0" },
			});

			// Fetch tools list
			const toolsRes = await sendRpc("tools/list", {});
			const mcpTools: MCPToolDefinition[] = toolsRes?.tools ?? [];
			const toolNames: string[] = [];

			for (const mcpTool of mcpTools) {
				const toolName = `mcp_${server.name.toLowerCase().replace(/[^a-z0-9_]/g, "_")}_${mcpTool.name}`;
				this.toolRegistry.register(
					{
						type: "function",
						function: {
							name: toolName,
							description: mcpTool.description || `MCP tool ${mcpTool.name} from ${server.name}`,
							parameters: (mcpTool.inputSchema as any) || { type: "object", properties: {} },
						},
					},
					async (args) => {
						const callRes = await sendRpc("tools/call", {
							name: mcpTool.name,
							arguments: args,
						});
						if (callRes?.content) {
							if (Array.isArray(callRes.content)) {
								return callRes.content.map((c: any) => c.text ?? JSON.stringify(c)).join("\n");
							}
							return typeof callRes.content === "string"
								? callRes.content
								: JSON.stringify(callRes.content);
						}
						return JSON.stringify(callRes);
					},
					true,
				);

				active.registeredTools.push(toolName);
				toolNames.push(toolName);
			}

			server.status = "connected";
			server.toolsCount = toolNames.length;
			server.errorMessage = undefined;
			this.saveToDisk();

			return { success: true, tools: toolNames };
		} catch (err: any) {
			server.status = "error";
			server.errorMessage = err.message;
			this.cleanupServer(server.id);
			this.saveToDisk();
			return { success: false, tools: [], error: err.message };
		}
	}

	async disconnect(idOrName: string): Promise<boolean> {
		const server = this.getServer(idOrName);
		if (!server) return false;
		if (this.activeProcesses.has(server.id)) {
			this.cleanupServer(server.id);
		}
		if (this.activeHttpTools.has(server.id)) {
			this.cleanupHttpServer(server.id);
		}
		server.status = "disconnected";
		server.toolsCount = 0;
		server.errorMessage = undefined;
		this.saveToDisk();
		return true;
	}

	private cleanupHttpServer(id: string) {
		const tools = this.activeHttpTools.get(id);
		if (tools) {
			for (const tName of tools) {
				this.toolRegistry.unregister(tName);
			}
			this.activeHttpTools.delete(id);
		}
	}

	private cleanupServer(id: string) {
		const active = this.activeProcesses.get(id);
		if (active) {
			for (const toolName of active.registeredTools) {
				this.toolRegistry.unregister(toolName);
			}
			try {
				active.process.kill();
			} catch {
				// Process might already be terminated
			}
			this.activeProcesses.delete(id);
		}
	}
}

let sharedMcpManager: MCPManager | null = null;

export function getMCPManager(toolRegistry: ToolRegistry): MCPManager {
	if (!sharedMcpManager) {
		sharedMcpManager = new MCPManager(toolRegistry);
	}
	return sharedMcpManager;
}
