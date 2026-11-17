import type { Database } from "sql.js";
import type { Skill } from "../../agent/types.js";
import { NotFoundException } from "../../common/exceptions/http-exception.js";
import { scheduleSave } from "../../db/index.js";
import type { CreateSkillDto, UpdateSkillDto } from "./dto.js";

export class SkillService {
	constructor(private db: Database) {}

	list(): Skill[] {
		const stmt = this.db.prepare("SELECT * FROM skills ORDER BY name");
		const skills: Skill[] = [];
		while (stmt.step()) {
			skills.push(this._rowToSkill(stmt.getAsObject()));
		}
		stmt.free();
		return skills;
	}

	listByAgent(agent: string): Skill[] {
		const stmt = this.db.prepare("SELECT * FROM skills WHERE agent = ? ORDER BY name");
		stmt.bind([agent]);
		const skills: Skill[] = [];
		while (stmt.step()) {
			skills.push(this._rowToSkill(stmt.getAsObject()));
		}
		stmt.free();
		return skills;
	}

	get(name: string): Skill {
		const stmt = this.db.prepare("SELECT * FROM skills WHERE name = ?");
		stmt.bind([name]);
		if (!stmt.step()) {
			stmt.free();
			throw new NotFoundException(`Skill "${name}" no encontrada`);
		}
		const skill = this._rowToSkill(stmt.getAsObject());
		stmt.free();
		return skill;
	}

	getOrNull(name: string): Skill | null {
		const stmt = this.db.prepare("SELECT * FROM skills WHERE name = ?");
		stmt.bind([name]);
		if (!stmt.step()) {
			stmt.free();
			return null;
		}
		const skill = this._rowToSkill(stmt.getAsObject());
		stmt.free();
		return skill;
	}

	create(dto: CreateSkillDto): Skill {
		const { name, agent, description, directory, metadata, allowedTools, triggers, tags } = dto;
		this.db.run(
			"INSERT INTO skills (name, agent, description, directory, metadata, allowed_tools, triggers, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			[
				name,
				agent,
				description,
				directory,
				JSON.stringify(metadata),
				JSON.stringify(allowedTools),
				JSON.stringify(triggers),
				JSON.stringify(tags),
			],
		);
		scheduleSave();
		return this.get(name);
	}

	update(name: string, dto: UpdateSkillDto): Skill {
		this.get(name);
		const fields: string[] = [];
		const values: unknown[] = [];
		if (dto.description !== undefined) {
			fields.push("description = ?");
			values.push(dto.description);
		}
		if (dto.directory !== undefined) {
			fields.push("directory = ?");
			values.push(dto.directory);
		}
		if (dto.metadata !== undefined) {
			fields.push("metadata = ?");
			values.push(JSON.stringify(dto.metadata));
		}
		if (dto.allowedTools !== undefined) {
			fields.push("allowed_tools = ?");
			values.push(JSON.stringify(dto.allowedTools));
		}
		if (dto.triggers !== undefined) {
			fields.push("triggers = ?");
			values.push(JSON.stringify(dto.triggers));
		}
		if (dto.tags !== undefined) {
			fields.push("tags = ?");
			values.push(JSON.stringify(dto.tags));
		}
		if (fields.length > 0) {
			values.push(name);
			fields.push("updated_at = unixepoch()");
			this.db.run(`UPDATE skills SET ${fields.join(", ")} WHERE name = ?`, values as string[]);
			scheduleSave();
		}
		return this.get(name);
	}

	delete(name: string): boolean {
		this.db.run("DELETE FROM skill_files WHERE skill_name = ?", [name]);
		this.db.run("DELETE FROM skills WHERE name = ?", [name]);
		const modified = this.db.getRowsModified() > 0;
		if (modified) scheduleSave();
		return modified;
	}

	incrementUsage(name: string): void {
		this.db.run("UPDATE skills SET usage_count = usage_count + 1 WHERE name = ?", [name]);
	}

	incrementSuccess(name: string): void {
		this.db.run(
			"UPDATE skills SET success_count = success_count + 1, usage_count = usage_count + 1 WHERE name = ?",
			[name],
		);
	}

	private _rowToSkill(row: Record<string, unknown>): Skill {
		return {
			name: row.name as string,
			agent: row.agent as string,
			description: row.description as string,
			directory: row.directory as string,
			metadata: JSON.parse(row.metadata as string) as Skill["metadata"],
			allowedTools: JSON.parse(row.allowed_tools as string),
			triggers: JSON.parse(row.triggers as string),
			tags: JSON.parse(row.tags as string),
			usageCount: row.usage_count as number,
			successCount: row.success_count as number,
			createdAt: row.created_at as number,
			updatedAt: row.updated_at as number,
		};
	}
}
