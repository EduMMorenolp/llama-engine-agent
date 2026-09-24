import type { NextFunction, Request, Response } from "express";
import type {
	CreateSessionDto,
	ForkSessionDto,
	UpdateMessageDto,
	UpdateSessionDto,
} from "./dto.js";
import type { SessionService } from "./service.js";

export class SessionController {
	constructor(private service: SessionService) {}

	create = (req: Request, res: Response, _next: NextFunction) => {
		const dto = req.body as CreateSessionDto;
		const session = this.service.createSession(dto);
		res.status(201).json(session);
	};

	getById = (req: Request, res: Response, _next: NextFunction) => {
		const id = String(req.params.id);
		const session = this.service.getSession(id);
		const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
		const offset = Math.max(Number(req.query.offset) || 0, 0);
		const { messages, total } = this.service.getMessagesPaginated(id, limit, offset);
		res.json({
			...session,
			messages,
			hasMore: offset + messages.length < total,
			totalMessages: total,
		});
	};

	list = (_req: Request, res: Response, _next: NextFunction) => {
		const sessions = this.service.listSessions();
		res.json({ sessions });
	};

	delete = (req: Request, res: Response, _next: NextFunction) => {
		const id = String(req.params.id);
		const deleted = this.service.deleteSession(id);
		if (!deleted) {
			res.status(404).json({ error: "Sesión no encontrada" });
			return;
		}
		res.json({ ok: true });
	};

	update = (req: Request, res: Response, _next: NextFunction) => {
		const id = String(req.params.id);
		const dto = req.body as UpdateSessionDto;
		const session = this.service.updateSession(id, dto);
		res.json(session);
	};

	updateMessage = (req: Request, res: Response, _next: NextFunction) => {
		const id = String(req.params.id);
		const messageId = String(req.params.messageId);
		const dto = req.body as UpdateMessageDto;
		const message = this.service.updateMessage(id, messageId, dto);
		res.json(message);
	};

	deleteMessage = (req: Request, res: Response, _next: NextFunction) => {
		const id = String(req.params.id);
		const messageId = String(req.params.messageId);
		const deleted = this.service.deleteMessage(id, messageId);
		if (!deleted) {
			res.status(404).json({ error: "Mensaje no encontrado" });
			return;
		}
		res.json({ ok: true });
	};

	fork = (req: Request, res: Response, _next: NextFunction) => {
		const id = String(req.params.id);
		const dto = (req.body || {}) as ForkSessionDto;
		const forked = this.service.forkSession(id, dto.upToMessageId, dto.name);
		res.status(201).json(forked);
	};

	listFavorites = (req: Request, res: Response, _next: NextFunction) => {
		const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
		const favorites = this.service.listFavorites(limit);
		res.json({ favorites });
	};

	searchMessages = (req: Request, res: Response, _next: NextFunction) => {
		const q = String(req.query.q || "");
		const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
		const results = this.service.searchMessages(q, limit);
		res.json({ results });
	};
}
