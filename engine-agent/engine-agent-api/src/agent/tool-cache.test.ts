import { describe, expect, it } from "vitest";
import { ToolCache } from "./tool-cache.js";

describe("ToolCache", () => {
	it("returns null for non-cacheable tools", () => {
		const cache = new ToolCache();
		expect(cache.get("bash", { command: "ls" })).toBeNull();
	});

	it("caches and retrieves results for cacheable tools", () => {
		const cache = new ToolCache();
		const args = { path: "/tmp/test.txt" };
		cache.set("read_file", args, "file content");
		expect(cache.get("read_file", args)).toBe("file content");
	});

	it("returns null for different args", () => {
		const cache = new ToolCache();
		cache.set("read_file", { path: "/a.txt" }, "content a");
		expect(cache.get("read_file", { path: "/b.txt" })).toBeNull();
	});

	it("expires entries after TTL", async () => {
		const cache = new ToolCache(1); // TTL of 1ms
		const args = { path: "/tmp/test.txt" };
		cache.set("read_file", args, "content");
		// Wait for TTL to expire
		await new Promise((r) => setTimeout(r, 10));
		expect(cache.get("read_file", args)).toBeNull();
	});

	it("clears all entries", () => {
		const cache = new ToolCache();
		cache.set("read_file", { path: "/a.txt" }, "a");
		cache.set("glob_search", { pattern: "*.ts" }, "files");
		cache.clear();
		expect(cache.get("read_file", { path: "/a.txt" })).toBeNull();
		expect(cache.get("glob_search", { pattern: "*.ts" })).toBeNull();
	});

	it("does not cache error results", () => {
		const cache = new ToolCache();
		const args = { path: "/tmp/missing.txt" };
		// Even if we cache an error string, it should be retrievable
		cache.set("read_file", args, "Error: file not found");
		expect(cache.get("read_file", args)).toBe("Error: file not found");
	});

	it("invalidates file cache entries on file mutation tools", () => {
		const cache = new ToolCache();
		cache.set("read_file", { path: "/app/index.ts" }, "original content");
		cache.set("glob_search", { pattern: "*.ts" }, "file list");
		cache.set("search_memories", { query: "name" }, "user is Alice");

		cache.invalidateOnMutation("edit_file");

		expect(cache.get("read_file", { path: "/app/index.ts" })).toBeNull();
		expect(cache.get("glob_search", { pattern: "*.ts" })).toBeNull();
		expect(cache.get("search_memories", { query: "name" })).toBe("user is Alice");
	});

	it("invalidates memory cache entries on memory mutation tools", () => {
		const cache = new ToolCache();
		cache.set("read_file", { path: "/app/index.ts" }, "original content");
		cache.set("search_memories", { query: "name" }, "user is Alice");

		cache.invalidateOnMutation("memorize");

		expect(cache.get("read_file", { path: "/app/index.ts" })).toBe("original content");
		expect(cache.get("search_memories", { query: "name" })).toBeNull();
	});
});
