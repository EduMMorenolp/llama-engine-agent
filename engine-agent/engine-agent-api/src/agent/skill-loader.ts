import type { Skill } from "../agent/types.js";
import type { SkillService } from "../modules/skills/service.js";

export class SkillLoader {
	constructor(private skillService: SkillService) {}

	getCatalog(): Array<{ name: string; description: string }> {
		const skills = this.skillService.list();
		return skills.map((s: Skill) => ({ name: s.name, description: s.description }));
	}

	getCatalogString(): string {
		const entries = this.getCatalog();
		if (entries.length === 0) return "";
		return entries.map((e) => `${e.name}: ${e.description}`).join("\n");
	}

	activate(skillName: string): Skill | null {
		const skill = this.skillService.getOrNull(skillName);
		if (!skill) return null;
		this.skillService.incrementUsage(skillName);
		return skill;
	}

	activateAndSuccess(skillName: string): Skill | null {
		const skill = this.skillService.getOrNull(skillName);
		if (!skill) return null;
		this.skillService.incrementSuccess(skillName);
		return skill;
	}

	getActiveSkillNames(): string[] {
		return this.skillService.list().map((s: Skill) => s.name);
	}
}

export function buildSkillCatalogString(skills: Skill[]): string {
	if (skills.length === 0) return "";
	return skills.map((s: Skill) => `${s.name}: ${s.description}`).join("\n");
}

export function getSkillLevel0Metadata(skills: Skill[]): string {
	if (skills.length === 0) return "";
	const lines = skills.map((s: Skill) => {
		const metaTools = (s.metadata as { allowed_tools?: string[] })?.allowed_tools ?? [];
		const allowed =
			Array.isArray(s.allowedTools) && s.allowedTools.length > 0 ? s.allowedTools : metaTools;
		const toolsHint = allowed.length > 0 ? ` -> Usá directamente: ${allowed.join(", ")}` : "";
		return `- **${s.name}** [agente: ${s.agent}]: ${s.description}${toolsHint}`;
	});
	return `\n## Skills instaladas (para aplicar una skill, invocá directamente sus herramientas nativas indicadas o consultá load_skill):\n${lines.join("\n")}`;
}
