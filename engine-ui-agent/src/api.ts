import { apiDelete, apiGet, apiPatch, apiPost, connectWebSocket } from "./lib/api-client.ts";

export { connectWebSocket };

export interface Session {
	id: string;
	name: string | null;
	model: string | null;
	tags?: string[];
	autoTitled?: boolean;
	summary?: string | null;
	createdAt: number;
	updatedAt: number;
}

export interface Message {
	id: string;
	sessionId: string;
	role: "system" | "user" | "assistant" | "tool";
	content: string | null;
	toolCalls: string | null;
	toolCallId: string | null;
	favorite?: boolean;
	createdAt: number;
	_subAgent?: string;
}

export interface Tool {
	name: string;
	description: string;
	enabled: boolean;
}

export interface StreamEvent {
	type: "message" | "tool_start" | "tool_end" | "done" | "error";
	payload: Record<string, unknown>;
}

export interface AgentDefinition {
	name: string;
	corePrompt: string;
	description: string;
	tools: string[];
	model: string;
	maxIterations: number;
	enabled: boolean;
}

export interface SkillMetadata {
	name: string;
	description: string;
	version?: string;
	tags: string[];
}

export interface SkillFile {
	path: string;
	content: string;
	language: string;
}

export interface Skill {
	name: string;
	agent: string;
	description: string;
	directory: string;
	metadata: SkillMetadata;
	allowedTools: string[];
	triggers: string[];
	tags: string[];
	usageCount: number;
	successCount: number;
	createdAt: number;
	updatedAt: number;
}

export async function fetchSessions(): Promise<Session[]> {
	const res = await apiGet<{ sessions: Session[] }>("/api/sessions");
	return res.sessions;
}

export async function createSession(
	name?: string,
	model?: string,
	tags?: string[],
): Promise<Session> {
	return apiPost<Session>("/api/sessions", { name, model, tags });
}

export async function updateSession(
	id: string,
	data: { name?: string | null; model?: string | null; tags?: string[]; summary?: string | null },
): Promise<Session> {
	return apiPatch<Session>(`/api/sessions/${id}`, data);
}

export interface SessionWithMessages extends Session {
	messages: Message[];
	hasMore: boolean;
	totalMessages: number;
}

export async function fetchSession(
	id: string,
	limit?: number,
	offset?: number,
): Promise<SessionWithMessages> {
	const params = new URLSearchParams();
	if (limit !== undefined) params.set("limit", String(limit));
	if (offset !== undefined) params.set("offset", String(offset));
	const qs = params.toString();
	return apiGet(`/api/sessions/${id}${qs ? `?${qs}` : ""}`);
}

export async function deleteSession(id: string): Promise<void> {
	await apiDelete(`/api/sessions/${id}`);
}

export async function updateSessionMessage(
	sessionId: string,
	messageId: string,
	data: { favorite: boolean },
): Promise<Message> {
	return apiPatch<Message>(`/api/sessions/${sessionId}/messages/${messageId}`, data);
}

export async function deleteSessionMessage(sessionId: string, messageId: string): Promise<void> {
	await apiDelete(`/api/sessions/${sessionId}/messages/${messageId}`);
}

export async function fetchFavoriteMessages(
	limit = 50,
): Promise<Array<{ message: Message; session: { id: string; name: string | null } }>> {
	const res = await apiGet<{
		favorites: Array<{ message: Message; session: { id: string; name: string | null } }>;
	}>(`/api/messages/favorites?limit=${limit}`);
	return res.favorites;
}

export async function searchMessages(
	query: string,
	limit = 30,
): Promise<
	Array<{
		message: Message;
		session: { id: string; name: string | null };
		snippet: string;
	}>
> {
	const res = await apiGet<{
		results: Array<{
			message: Message;
			session: { id: string; name: string | null };
			snippet: string;
		}>;
	}>(`/api/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`);
	return res.results;
}

export async function forkSession(
	sessionId: string,
	data?: { upToMessageId?: string; name?: string },
): Promise<Session> {
	return apiPost<Session>(`/api/sessions/${sessionId}/fork`, data || {});
}

export async function fetchTools(): Promise<Tool[]> {
	const res = await apiGet<{ tools: Tool[] }>("/api/tools");
	return res.tools;
}

export interface HealthStatus {
	status: string;
	agentRunning: boolean;
}

export async function fetchHealth(): Promise<HealthStatus> {
	return apiGet<HealthStatus>("/api/health");
}

export interface MCPServer {
	id: string;
	name: string;
	transport: "stdio" | "sse" | "http";
	command?: string;
	args?: string[];
	url?: string;
	status: "connected" | "disconnected" | "error";
	toolsCount?: number;
	errorMessage?: string;
}

export async function fetchMCPServers(): Promise<MCPServer[]> {
	const res = await apiGet<{ servers: MCPServer[] }>("/api/mcp/servers");
	return res.servers;
}

export async function addMCPServer(server: Partial<MCPServer>): Promise<MCPServer> {
	return apiPost<MCPServer>("/api/mcp/servers", server);
}

export async function deleteMCPServer(id: string): Promise<void> {
	await apiDelete(`/api/mcp/servers/${id}`);
}

export async function connectMCPServer(
	id: string,
): Promise<{ success: boolean; tools: string[]; error?: string }> {
	return apiPost(`/api/mcp/servers/${id}/connect`, {});
}

export async function disconnectMCPServer(id: string): Promise<{ success: boolean }> {
	return apiPost(`/api/mcp/servers/${id}/disconnect`, {});
}

export interface ModelInfo {
	id: string;
	name: string;
	size?: string;
	vision?: boolean;
	loaded?: boolean;
	badge?: string;
	desc?: string;
}

export async function fetchAvailableModels(): Promise<{
	models: ModelInfo[];
	activeModel?: string;
}> {
	return apiGet<{ models: ModelInfo[]; activeModel?: string }>("/api/models");
}

// Agent API
export async function fetchAgents(): Promise<AgentDefinition[]> {
	const res = await apiGet<{ agents: AgentDefinition[] }>("/api/agents");
	return res.agents;
}

export async function createAgent(dto: Partial<AgentDefinition>): Promise<AgentDefinition> {
	return apiPost<AgentDefinition>("/api/agents", dto);
}

export async function updateAgent(
	name: string,
	dto: Partial<AgentDefinition>,
): Promise<AgentDefinition> {
	return apiPatch<AgentDefinition>(`/api/agents/${name}`, dto);
}

export async function deleteAgent(name: string): Promise<void> {
	await apiDelete(`/api/agents/${name}`);
}

export async function getAgent(name: string): Promise<AgentDefinition> {
	return apiGet<AgentDefinition>(`/api/agents/${name}`);
}

// Skill API
export async function fetchSkills(): Promise<Skill[]> {
	const res = await apiGet<{ skills: Skill[] }>("/api/skills");
	return res.skills;
}

export async function createSkill(dto: Partial<Skill>): Promise<Skill> {
	return apiPost<Skill>("/api/skills", dto);
}

export async function updateSkill(name: string, dto: Partial<Skill>): Promise<Skill> {
	return apiPatch<Skill>(`/api/skills/${name}`, dto);
}

export async function deleteSkill(name: string): Promise<void> {
	await apiDelete(`/api/skills/${name}`);
}

export async function getSkill(name: string): Promise<Skill> {
	return apiGet<Skill>(`/api/skills/${name}`);
}
