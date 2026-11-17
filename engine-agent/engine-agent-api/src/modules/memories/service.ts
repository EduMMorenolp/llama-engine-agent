import { randomUUID } from "node:crypto";
import type { Database } from "sql.js";
import { scheduleSave } from "../../db/index.js";
import type { Memory } from "../../sessions/types.js";

export class MemoryService {
	constructor(private db: Database) {}

	search(query: string): Memory[] {
		const stmt = this.db.prepare("SELECT * FROM memories WHERE key LIKE ? OR content LIKE ?");
		stmt.bind([`%${query}%`, `%${query}%`]);
		const memories: Memory[] = [];
		while (stmt.step()) {
			const row = stmt.getAsObject();
			memories.push(this._rowToMemory(row));
		}
		stmt.free();
		return memories;
	}

	upsert(key: string, content: string, tags: string[]): Memory {
		const existing = this.get(key);
		if (existing) {
			this.db.run(
				"UPDATE memories SET content = ?, tags = ?, updated_at = unixepoch() WHERE key = ?",
				[content, JSON.stringify(tags), key],
			);
		} else {
			this.db.run("INSERT INTO memories (id, key, content, tags) VALUES (?, ?, ?, ?)", [
				`mem_${randomUUID()}`,
				key,
				content,
				JSON.stringify(tags),
			]);
		}
		scheduleSave();
		return this.get(key)!;
	}

	get(key: string): Memory | null {
		const stmt = this.db.prepare("SELECT * FROM memories WHERE key = ?");
		stmt.bind([key]);
		if (!stmt.step()) {
			stmt.free();
			return null;
		}
		const row = stmt.getAsObject();
		stmt.free();
		return this._rowToMemory(row);
	}

	delete(key: string): boolean {
		this.db.run("DELETE FROM memories WHERE key = ?", [key]);
		const modified = this.db.getRowsModified() > 0;
		if (modified) scheduleSave();
		return modified;
	}

	getActiveMemories(limit = 8): Memory[] {
		const stmt = this.db.prepare(
			"SELECT * FROM memories WHERE type IN ('insight', 'lesson') ORDER BY relevance DESC, last_used_at DESC LIMIT ?",
		);
		stmt.bind([limit]);
		const memories: Memory[] = [];
		while (stmt.step()) {
			memories.push(this._rowToMemory(stmt.getAsObject()));
		}
		stmt.free();
		return memories;
	}

	getDistilledSummary(): string {
		const stmt = this.db.prepare(
			"SELECT content FROM memories WHERE type = 'distilled' ORDER BY updated_at DESC LIMIT 5",
		);
		const contents: string[] = [];
		while (stmt.step()) {
			contents.push(stmt.getAsObject().content as string);
		}
		stmt.free();
		return contents.join("\n");
	}

	consolidate(): void {
		const stmt = this.db.prepare(
			"SELECT id, content FROM memories WHERE type = 'insight' AND relevance < 5 ORDER BY last_used_at ASC LIMIT 20",
		);
		const oldMemories: Array<{ id: string; content: string }> = [];
		while (stmt.step()) {
			const row = stmt.getAsObject();
			oldMemories.push({ id: row.id as string, content: row.content as string });
		}
		stmt.free();

		if (oldMemories.length >= 5) {
			const distilledContent = oldMemories.map((m) => m.content).join("\n");
			this.upsert(`distilled_${Date.now()}`, distilledContent, ["distilled"]);
			const mem = this.get(`distilled_${Date.now()}`);
			if (mem) {
				this.db.run(
					"UPDATE memories SET type = 'distilled', relevance = 3, updated_at = unixepoch() WHERE id = ?",
					[mem.id],
				);
			}
			const ids = oldMemories.map((m) => m.id).join(",");
			this.db.run(`DELETE FROM memories WHERE id IN (${ids})`);
			scheduleSave();
		}
	}

	updateRelevance(key: string, increment = 1): void {
		this.db.run(
			"UPDATE memories SET relevance = MIN(relevance + ?, 10), last_used_at = unixepoch() WHERE key = ?",
			[increment, key],
		);
	}

	getMemoryTokenCount(): number {
		const stmt = this.db.prepare("SELECT SUM(LENGTH(content)) as total FROM memories");
		const row = stmt.getAsObject();
		stmt.free();
		return (row.total as number) ?? 0;
	}

	private _rowToMemory(row: Record<string, unknown>): Memory {
		return {
			id: row.id as string,
			key: row.key as string,
			content: row.content as string,
			tags: JSON.parse(row.tags as string),
			type: (row.type as string) ?? "insight",
			relevance: (row.relevance as number) ?? 0,
			lastUsedAt: (row.last_used_at as number) ?? null,
			createdAt: (row.created_at as number) * 1000,
			updatedAt: (row.updated_at as number) * 1000,
		};
	}
}
