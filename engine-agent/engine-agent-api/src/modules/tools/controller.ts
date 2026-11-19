import type { NextFunction, Request, Response } from "express";
import type { ToolService } from "./service.js";

export class ToolController {
	constructor(private service: ToolService) {}

	list = (_req: Request, res: Response, _next: NextFunction) => {
		const tools = this.service.list();
		res.json({ tools });
	};

	get = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		const tool = this.service.get(name);
		if (!tool) {
			res.status(404).json({ error: `Tool "${name}" no encontrada` });
			return;
		}
		res.json({ tool });
	};

	update = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		const { enabled, description } = req.body ?? {};
		const updated = this.service.update(name, { enabled, description });
		if (!updated) {
			res.status(404).json({ error: `Tool "${name}" no encontrada` });
			return;
		}
		const tool = this.service.get(name);
		res.json({ ok: true, tool });
	};

	delete = (req: Request, res: Response, _next: NextFunction) => {
		const name = String(req.params.name);
		const deleted = this.service.unregister(name);
		if (!deleted) {
			res.status(404).json({ error: "Tool no encontrado" });
			return;
		}
		res.json({ ok: true });
	};
}
