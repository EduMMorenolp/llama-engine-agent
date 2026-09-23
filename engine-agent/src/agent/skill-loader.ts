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
	return `\n## Skills disponibles:
${skills.map((s: Skill) => `${s.name}: ${s.description}`).join("\n")}`;
}
