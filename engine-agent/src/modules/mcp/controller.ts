import type { NextFunction, Request, Response } from "express";
import { BadRequestException } from "../../common/exceptions/http-exception.js";
import { addServerDto } from "./dto.js";
import type { MCPManager } from "./manager.js";

export class MCPController {
	constructor(private mcpManager: MCPManager) {}

	listServers = async (_req: Request, res: Response): Promise<void> => {
		const servers = this.mcpManager.listServers();
		res.json({ servers });
	};

	addServer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const result = addServerDto.safeParse(req.body);
			if (!result.success) {
				const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
				throw new BadRequestException(messages.join(", "));
			}
			const server = this.mcpManager.addServer(result.data);
			res.status(201).json(server);
		} catch (err) {
			next(err);
		}
	};

	deleteServer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const id = req.params.id as string;
			const removed = await this.mcpManager.removeServer(id);
			if (!removed) {
				res.status(404).json({ error: "Servidor MCP no encontrado" });
				return;
			}
			res.json({ success: true });
		} catch (err) {
			next(err);
		}
	};

	connectServer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const id = req.params.id as string;
			const result = await this.mcpManager.connect(id);
			res.json(result);
		} catch (err) {
			next(err);
		}
	};

	disconnectServer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const id = req.params.id as string;
			const result = await this.mcpManager.disconnect(id);
			res.json({ success: result });
		} catch (err) {
			next(err);
		}
	};
}
