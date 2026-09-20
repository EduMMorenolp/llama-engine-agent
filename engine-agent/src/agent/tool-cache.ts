interface CacheEntry {
	result: string;
	timestamp: number;
}

const CACHEABLE_TOOLS = new Set(["read_file", "glob_search", "grep_search", "search_memories"]);
const DEFAULT_TTL_MS = 60_000;

export class ToolCache {
	private cache = new Map<string, CacheEntry>();
	private ttl: number;

	constructor(ttl = DEFAULT_TTL_MS) {
		this.ttl = ttl;
	}

	private makeKey(toolName: string, args: Record<string, unknown>): string {
		return `${toolName}:${JSON.stringify(args)}`;
	}

	get(toolName: string, args: Record<string, unknown>): string | null {
		if (!CACHEABLE_TOOLS.has(toolName)) return null;
		const key = this.makeKey(toolName, args);
		const entry = this.cache.get(key);
		if (!entry) return null;
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return null;
		}
		return entry.result;
	}

	set(toolName: string, args: Record<string, unknown>, result: string): void {
		if (!CACHEABLE_TOOLS.has(toolName)) return;
		this.cache.set(this.makeKey(toolName, args), {
			result,
			timestamp: Date.now(),
		});
	}

	clear(): void {
		this.cache.clear();
	}
}

export const toolCache = new ToolCache();
