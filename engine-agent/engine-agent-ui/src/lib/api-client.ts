export function getAgentUrl(): string {
	try {
		const raw = localStorage.getItem("llama_engine_settings");
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed.apiUrl) return parsed.apiUrl;
		}
	} catch {}
	return import.meta.env.VITE_AGENT_URL ?? "http://localhost:3060";
}

export function getAgentKey(): string {
	try {
		const raw = localStorage.getItem("llama_engine_settings");
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed.apiKey) return parsed.apiKey;
		}
	} catch {}
	return import.meta.env.VITE_AGENT_KEY || "llama-engine-dev";
}

export const AGENT_URL = import.meta.env.VITE_AGENT_URL ?? "http://localhost:3060";
export const AGENT_KEY = import.meta.env.VITE_AGENT_KEY ?? "llama-engine-dev";

interface RequestOptions extends RequestInit {
	params?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { params, ...fetchOptions } = options;
	const baseUrl = getAgentUrl();
	const url = new URL(path, baseUrl);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
	}

	const headers: Record<string, string> = {
		"x-api-key": getAgentKey(),
		...(fetchOptions.headers as Record<string, string>),
	};

	if (fetchOptions.body && typeof fetchOptions.body === "string") {
		headers["Content-Type"] = "application/json";
	}

	const res = await fetch(url.toString(), {
		...fetchOptions,
		headers,
	});

	if (!res.ok) {
		const payload = await res.json().catch(() => ({}));
		const message = (payload as { error?: string }).error ?? `${res.status} ${res.statusText}`;
		throw new Error(message);
	}

	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
	return request<T>(path, { method: "GET", params });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
	return request<T>(path, {
		method: "POST",
		body: body ? JSON.stringify(body) : undefined,
	});
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
	return request<T>(path, {
		method: "PATCH",
		body: body ? JSON.stringify(body) : undefined,
	});
}

export function apiDelete<T>(path: string): Promise<T> {
	return request<T>(path, { method: "DELETE" });
}

export function connectWebSocket(): WebSocket {
	const wsUrl = `${getAgentUrl().replace(/^http/, "ws")}/ws`;
	return new WebSocket(wsUrl);
}
