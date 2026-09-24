const KEY = "session_agents";

type AgentSessionMap = Record<string, string>;

export function getAgentSessionMap(): AgentSessionMap {
	try {
		return JSON.parse(localStorage.getItem(KEY) || "{}") as AgentSessionMap;
	} catch {
		return {};
	}
}

export function setAgentForSession(sessionId: string, agent: string): void {
	try {
		const map = getAgentSessionMap();
		map[sessionId] = agent;
		localStorage.setItem(KEY, JSON.stringify(map));
	} catch {
		// noop
	}
}

export function getAgentForSession(sessionId: string | null): string | null {
	if (!sessionId) return null;
	return getAgentSessionMap()[sessionId] ?? null;
}

export function findSessionIdForAgent(agent: string): string | null {
	const map = getAgentSessionMap();
	const entry = Object.entries(map).find(([, a]) => a === agent);
	return entry?.[0] ?? null;
}
