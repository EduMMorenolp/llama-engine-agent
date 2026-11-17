import type { NextFunction, Request, Response } from "express";
import type { CreateSkillDto, UpdateSkillDto } from "./dto.js";
import type { SkillService } from "./service.js";

export class SkillController {
	constructor(private service: SkillService) {}

	list = (_req: Request, res: Response, _next: NextFunction) => {
		const skills = this.service.list();
		res.json({ skills });
	};

	listByAgent = (req: Request, res: Response, _next: NextFunction) => {
		const agent = String(req.params.agent);
		const skills = this.service.listByAgent(agent);
		res.json({ skills });
	};

	get = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		try {
			const skill = this.service.get(name);
			res.json(skill);
		} catch {
			res.status(404).json({ error: `Skill "${name}" no encontrada` });
		}
	};

	create = (req: Request, res: Response, _next: NextFunction) => {
		const dto = req.body as CreateSkillDto;
		const skill = this.service.create(dto);
		res.status(201).json(skill);
	};

	update = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		const dto = req.body as UpdateSkillDto;
		try {
			const skill = this.service.update(name, dto);
			res.json(skill);
		} catch {
			res.status(404).json({ error: `Skill "${name}" no encontrada` });
		}
	};

	delete = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		const deleted = this.service.delete(name);
		if (!deleted) {
			res.status(404).json({ error: `Skill "${name}" no encontrada` });
			return;
		}
		res.json({ ok: true });
	};
}
