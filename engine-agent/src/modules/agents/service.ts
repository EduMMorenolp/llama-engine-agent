import type { Database } from "sql.js";
import { NotFoundException } from "../../common/exceptions/http-exception.js";
import { scheduleSave } from "../../db/index.js";
import type { AgentDefinition } from "../../agent/types.js";
import type { CreateAgentDto, UpdateAgentDto } from "./dto.js";

export class AgentService {
	constructor(private db: Database) {}

	list(): AgentDefinition[] {
		const stmt = this.db.prepare("SELECT * FROM agents ORDER BY name");
		const agents: AgentDefinition[] = [];
		while (stmt.step()) {
			agents.push(this._rowToAgent(stmt.getAsObject()));
		}
		stmt.free();
		return agents;
	}

	get(name: string): AgentDefinition {
		const stmt = this.db.prepare("SELECT * FROM agents WHERE name = ?");
		stmt.bind([name]);
		if (!stmt.step()) {
			stmt.free();
			throw new NotFoundException(`Agente "${name}" no encontrado`);
		}
		const agent = this._rowToAgent(stmt.getAsObject());
		stmt.free();
		return agent;
	}

	getOrNull(name: string): AgentDefinition | null {
		const stmt = this.db.prepare("SELECT * FROM agents WHERE name = ?");
		stmt.bind([name]);
		if (!stmt.step()) {
			stmt.free();
			return null;
		}
		const agent = this._rowToAgent(stmt.getAsObject());
		stmt.free();
		return agent;
	}

	create(dto: CreateAgentDto): AgentDefinition {
		const { name, description, corePrompt, tools, model, maxIterations, memoryBudget, skillBudget } = dto;
		this.db.run(
			"INSERT INTO agents (name, description, core_prompt, tools, model, max_iterations, memory_budget, skill_budget) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			[name, description, corePrompt ?? "", JSON.stringify(tools ?? []), model ?? null, maxIterations ?? null, memoryBudget ?? 500, skillBudget ?? 3000],
		);
		scheduleSave();
		return this.get(name);
	}

	update(name: string, dto: UpdateAgentDto): AgentDefinition {
		this.get(name);
		const fields: string[] = [];
		const values: unknown[] = [];
		if (dto.description !== undefined) { fields.push("description = ?"); values.push(dto.description); }
		if (dto.corePrompt !== undefined) { fields.push("core_prompt = ?"); values.push(dto.corePrompt); }
		if (dto.tools !== undefined) { fields.push("tools = ?"); values.push(JSON.stringify(dto.tools)); }
		if (dto.model !== undefined) { fields.push("model = ?"); values.push(dto.model); }
		if (dto.maxIterations !== undefined) { fields.push("max_iterations = ?"); values.push(dto.maxIterations); }
		if (dto.memoryBudget !== undefined) { fields.push("memory_budget = ?"); values.push(dto.memoryBudget); }
		if (dto.skillBudget !== undefined) { fields.push("skill_budget = ?"); values.push(dto.skillBudget); }
		if (dto.enabled !== undefined) { fields.push("enabled = ?"); values.push(dto.enabled ? 1 : 0); }
		if (fields.length > 0) {
			values.push(name);
			fields.push("updated_at = unixepoch()");
			this.db.run(`UPDATE agents SET ${fields.join(", ")} WHERE name = ?`, values as string[]);
			scheduleSave();
		}
		return this.get(name);
	}

	delete(name: string): boolean {
		this.db.run("DELETE FROM skills WHERE agent = ?", [name]);
		this.db.run("DELETE FROM agents WHERE name = ?", [name]);
		const modified = this.db.getRowsModified() > 0;
		if (modified) scheduleSave();
		return modified;
	}

	private _rowToAgent(row: Record<string, unknown>): AgentDefinition {
		return {
			name: row.name as string,
			description: row.description as string,
			corePrompt: row.core_prompt as string,
			tools: JSON.parse(row.tools as string),
			model: (row.model as string) ?? null,
			maxIterations: row.max_iterations as number | null,
			memoryBudget: row.memory_budget as number,
			skillBudget: row.skill_budget as number,
			enabled: (row.enabled as number) === 1,
		};
	}
}
