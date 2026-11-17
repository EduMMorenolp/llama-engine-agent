import type { Database } from "sql.js";
import { NotFoundException } from "../../common/exceptions/http-exception.js";
import { scheduleSave } from "../../db/index.js";
import type { Message, Session } from "../../sessions/types.js";
import type { CreateSessionDto, UpdateSessionDto } from "./dto.js";

export class SessionService {
	constructor(private db: Database) {}

	private _rowToSession(row: Record<string, unknown>): Session {
		let tags: string[] = [];
		try {
			if (typeof row.tags === "string") {
				tags = JSON.parse(row.tags);
			}
		} catch {
			tags = [];
		}
		return {
			id: row.id as string,
			name: row.name as string | null,
			model: row.model as string | null,
			tags,
			autoTitled: (row.auto_titled as number) === 1,
			summary: (row.summary as string) ?? null,
			createdAt: (row.created_at as number) * 1000,
			updatedAt: (row.updated_at as number) * 1000,
		};
	}

	private _rowToMessage(row: Record<string, unknown>): Message {
		return {
			id: row.id as string,
			sessionId: row.session_id as string,
			role: row.role as "system" | "user" | "assistant" | "tool",
			content: row.content as string | null,
			toolCalls: row.tool_calls as string | null,
			toolCallId: row.tool_call_id as string | null,
			favorite: (row.favorite as number) === 1,
			createdAt: (row.created_at as number) * 1000,
		};
	}

	createSession(dto: CreateSessionDto): Session {
		const id = dto.id || crypto.randomUUID();
		const tagsJson = JSON.stringify(dto.tags ?? []);
		this.db.run("INSERT INTO sessions (id, name, model, tags) VALUES (?, ?, ?, ?)", [
			id,
			dto.name ?? null,
			dto.model ?? null,
			tagsJson,
		]);
		scheduleSave();
		return this.getSession(id);
	}

	createSessionRaw(id: string, name?: string, model?: string): Session {
		this.db.run("INSERT INTO sessions (id, name, model, tags) VALUES (?, ?, ?, '[]')", [
			id,
			name ?? null,
			model ?? null,
		]);
		scheduleSave();
		return this.getSession(id)!;
	}

	getSession(id: string): Session {
		const stmt = this.db.prepare("SELECT * FROM sessions WHERE id = ?");
		stmt.bind([id]);
		if (!stmt.step()) {
			stmt.free();
			throw new NotFoundException(`Sesión ${id} no encontrada`);
		}
		const row = stmt.getAsObject();
		stmt.free();
		return this._rowToSession(row);
	}

	getSessionOrNull(id: string): Session | null {
		const stmt = this.db.prepare("SELECT * FROM sessions WHERE id = ?");
		stmt.bind([id]);
		if (!stmt.step()) {
			stmt.free();
			return null;
		}
		const row = stmt.getAsObject();
		stmt.free();
		return this._rowToSession(row);
	}

	listSessions(): Session[] {
		const stmt = this.db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC");
		const sessions: Session[] = [];
		while (stmt.step()) {
			const row = stmt.getAsObject();
			sessions.push(this._rowToSession(row));
		}
		stmt.free();
		return sessions;
	}

	deleteSession(id: string): boolean {
		this.db.run("DELETE FROM messages WHERE session_id = ?", [id]);
		this.db.run("DELETE FROM sessions WHERE id = ?", [id]);
		const modified = this.db.getRowsModified() > 0;
		if (modified) {
			scheduleSave();
		}
		return modified;
	}

	updateSession(id: string, data: UpdateSessionDto): Session {
		this.getSession(id);
		const fields: string[] = [];
		const values: unknown[] = [];
		if (data.name !== undefined) {
			fields.push("name = ?");
			values.push(data.name);
		}
		if (data.model !== undefined) {
			fields.push("model = ?");
			values.push(data.model);
		}
		if (data.tags !== undefined) {
			fields.push("tags = ?");
			values.push(JSON.stringify(data.tags));
		}
		if (data.autoTitled !== undefined) {
			fields.push("auto_titled = ?");
			values.push(data.autoTitled ? 1 : 0);
		}
		if (data.summary !== undefined) {
			fields.push("summary = ?");
			values.push(data.summary);
		}
		if (fields.length > 0) {
			fields.push("updated_at = unixepoch()");
			values.push(id);
			this.db.run(`UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`, values as string[]);
			scheduleSave();
		}
		return this.getSession(id);
	}

	addMessage(
		id: string,
		sessionId: string,
		role: string,
		content: string | null,
		toolCalls?: string | null,
		toolCallId?: string | null,
		favorite = false,
	): Message {
		this.db.run(
			"INSERT INTO messages (id, session_id, role, content, tool_calls, tool_call_id, favorite) VALUES (?, ?, ?, ?, ?, ?, ?)",
			[id, sessionId, role, content, toolCalls ?? null, toolCallId ?? null, favorite ? 1 : 0],
		);
		this.db.run("UPDATE sessions SET updated_at = unixepoch() WHERE id = ?", [sessionId]);
		scheduleSave();
		const stmt = this.db.prepare("SELECT * FROM messages WHERE id = ?");
		stmt.bind([id]);
		stmt.step();
		const row = stmt.getAsObject();
		stmt.free();
		return this._rowToMessage(row);
	}

	updateMessage(sessionId: string, messageId: string, data: { favorite?: boolean }): Message {
		const fields: string[] = [];
		const values: unknown[] = [];
		if (data.favorite !== undefined) {
			fields.push("favorite = ?");
			values.push(data.favorite ? 1 : 0);
		}
		if (fields.length > 0) {
			values.push(messageId, sessionId);
			this.db.run(
				`UPDATE messages SET ${fields.join(", ")} WHERE id = ? AND session_id = ?`,
				values as string[],
			);
			scheduleSave();
		}
		const stmt = this.db.prepare("SELECT * FROM messages WHERE id = ? AND session_id = ?");
		stmt.bind([messageId, sessionId]);
		if (!stmt.step()) {
			stmt.free();
			throw new NotFoundException(`Mensaje ${messageId} no encontrado`);
		}
		const row = stmt.getAsObject();
		stmt.free();
		return this._rowToMessage(row);
	}

	getMessages(sessionId: string): Message[] {
		const stmt = this.db.prepare(
			"SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC",
		);
		stmt.bind([sessionId]);
		const messages: Message[] = [];
		while (stmt.step()) {
			const row = stmt.getAsObject();
			messages.push(this._rowToMessage(row));
		}
		stmt.free();
		return messages;
	}

	getMessagesPaginated(
		sessionId: string,
		limit: number,
		offset: number,
	): { messages: Message[]; total: number } {
		const countStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM messages WHERE session_id = ?");
		countStmt.bind([sessionId]);
		countStmt.step();
		const total = (countStmt.getAsObject().cnt as number) || 0;
		countStmt.free();

		const stmt = this.db.prepare(
			"SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?",
		);
		stmt.bind([sessionId, limit, offset]);
		const messages: Message[] = [];
		while (stmt.step()) {
			const row = stmt.getAsObject();
			messages.push(this._rowToMessage(row));
		}
		stmt.free();
		return { messages: messages.reverse(), total };
	}

	listFavorites(
		limit = 50,
	): Array<{ message: Message; session: { id: string; name: string | null } }> {
		const stmt = this.db.prepare(
			`SELECT m.*, s.name as session_name 
			 FROM messages m 
			 JOIN sessions s ON s.id = m.session_id 
			 WHERE m.favorite = 1 
			 ORDER BY m.created_at DESC 
			 LIMIT ?`,
		);
		stmt.bind([limit]);
		const results: Array<{ message: Message; session: { id: string; name: string | null } }> = [];
		while (stmt.step()) {
			const row = stmt.getAsObject();
			results.push({
				message: this._rowToMessage(row),
				session: {
					id: row.session_id as string,
					name: (row.session_name as string) || null,
				},
			});
		}
		stmt.free();
		return results;
	}

	searchMessages(
		query: string,
		limit = 30,
	): Array<{
		message: Message;
		session: { id: string; name: string | null };
		snippet: string;
	}> {
		if (!query.trim()) return [];
		const pattern = `%${query.trim()}%`;
		const stmt = this.db.prepare(
			`SELECT m.*, s.name as session_name 
			 FROM messages m 
			 JOIN sessions s ON s.id = m.session_id 
			 WHERE m.content LIKE ? 
			   AND m.role IN ('user', 'assistant') 
			 ORDER BY m.created_at DESC 
			 LIMIT ?`,
		);
		stmt.bind([pattern, limit]);
		const results: Array<{
			message: Message;
			session: { id: string; name: string | null };
			snippet: string;
		}> = [];
		while (stmt.step()) {
			const row = stmt.getAsObject();
			const msg = this._rowToMessage(row);
			const content = msg.content || "";
			const qLower = query.toLowerCase();
			const idx = content.toLowerCase().indexOf(qLower);
			let snippet = content;
			if (idx !== -1) {
				const start = Math.max(0, idx - 40);
				const end = Math.min(content.length, idx + query.length + 40);
				snippet =
					(start > 0 ? "..." : "") +
					content.slice(start, end).trim() +
					(end < content.length ? "..." : "");
			} else if (content.length > 80) {
				snippet = `${content.slice(0, 80)}...`;
			}
			results.push({
				message: msg,
				session: {
					id: row.session_id as string,
					name: (row.session_name as string) || null,
				},
				snippet,
			});
		}
		stmt.free();
		return results;
	}

	deleteMessage(sessionId: string, messageId: string): boolean {
		this.db.run("DELETE FROM messages WHERE id = ? AND session_id = ?", [messageId, sessionId]);
		const modified = this.db.getRowsModified() > 0;
		if (modified) {
			this.db.run("UPDATE sessions SET updated_at = unixepoch() WHERE id = ?", [sessionId]);
			scheduleSave();
		}
		return modified;
	}

	forkSession(sessionId: string, upToMessageId?: string, name?: string): Session {
		const original = this.getSession(sessionId);
		const newId = crypto.randomUUID();
		const forkedName = name || `${original.name || "Conversación"} (Fork)`;
		const tagsJson = JSON.stringify(original.tags ?? []);
		this.db.run("INSERT INTO sessions (id, name, model, tags) VALUES (?, ?, ?, ?)", [
			newId,
			forkedName,
			original.model,
			tagsJson,
		]);

		const allMessages = this.getMessages(sessionId);
		let messagesToCopy = allMessages;
		if (upToMessageId) {
			const idx = allMessages.findIndex((m) => m.id === upToMessageId);
			if (idx !== -1) {
				messagesToCopy = allMessages.slice(0, idx + 1);
			}
		}

		for (const msg of messagesToCopy) {
			const msgId = crypto.randomUUID();
			this.db.run(
				"INSERT INTO messages (id, session_id, role, content, tool_calls, tool_call_id, favorite) VALUES (?, ?, ?, ?, ?, ?, ?)",
				[
					msgId,
					newId,
					msg.role,
					msg.content,
					msg.toolCalls ?? null,
					msg.toolCallId ?? null,
					msg.favorite ? 1 : 0,
				],
			);
		}

		scheduleSave();
		return this.getSession(newId);
	}
}
