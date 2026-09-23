import type { NextFunction, Request, Response } from "express";
import type { AgentService } from "./service.js";
import type { CreateAgentDto, UpdateAgentDto } from "./dto.js";

export class AgentController {
	constructor(private service: AgentService) {}

	list = (_req: Request, res: Response, _next: NextFunction) => {
		const agents = this.service.list();
		res.json({ agents });
	};

	get = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		try {
			const agent = this.service.get(name);
			res.json(agent);
		} catch {
			res.status(404).json({ error: `Agente "${name}" no encontrado` });
		}
	};

	create = (req: Request, res: Response, _next: NextFunction) => {
		const dto = req.body as CreateAgentDto;
		const agent = this.service.create(dto);
		res.status(201).json(agent);
	};

	update = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		const dto = req.body as UpdateAgentDto;
		try {
			const agent = this.service.update(name, dto);
			res.json(agent);
		} catch {
			res.status(404).json({ error: `Agente "${name}" no encontrado` });
		}
	};

	delete = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		const deleted = this.service.delete(name);
		if (!deleted) {
			res.status(404).json({ error: `Agente "${name}" no encontrado` });
			return;
		}
		res.json({ ok: true });
	};
}
