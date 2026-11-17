interface CacheEntry {
	result: string;
	timestamp: number;
}

const CACHEABLE_TOOLS = new Set(["read_file", "glob_search", "grep_search", "search_memories"]);
const FILE_TOOLS = new Set(["read_file", "glob_search", "grep_search"]);
const MEMORY_TOOLS = new Set(["search_memories"]);
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

	invalidateCategory(category: "files" | "memories" | "all"): void {
		if (category === "all") {
			this.cache.clear();
			return;
		}
		for (const key of this.cache.keys()) {
			const tool = key.split(":")[0];
			if (category === "files" && FILE_TOOLS.has(tool)) {
				this.cache.delete(key);
			} else if (category === "memories" && MEMORY_TOOLS.has(tool)) {
				this.cache.delete(key);
			}
		}
	}

	invalidateOnMutation(mutatingToolName: string): void {
		if (["write_file", "edit_file", "bash", "run_skill_script"].includes(mutatingToolName)) {
			this.invalidateCategory("files");
		} else if (["memorize", "update_memory", "reflect"].includes(mutatingToolName)) {
			this.invalidateCategory("memories");
		} else if (["create_skill", "update_skill", "delete_skill"].includes(mutatingToolName)) {
			this.invalidateCategory("all");
		}
	}

	clear(): void {
		this.cache.clear();
	}
}

export const toolCache = new ToolCache();
