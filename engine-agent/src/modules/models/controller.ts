import type { Request, Response } from "express";
import { getConfig } from "../../config/index.js";

function formatBytes(bytes: number): string {
	if (!bytes || bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatModelName(id: string): string {
	return id
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

export class ModelsController {
	listModels = async (_req: Request, res: Response): Promise<void> => {
		try {
			const config = getConfig();
			const apiKey = config.ENGINE_API_KEY || "llama-engine-dev";
			const baseUrl = config.ENGINE_API_URL || "http://localhost:3050";

			const headers = { "x-api-key": apiKey };

			// Fetch models list and runtime health in parallel
			const [modelsRes, healthRes] = await Promise.allSettled([
				fetch(`${baseUrl}/api/models`, { headers }).then((r) => r.json()),
				fetch(`${baseUrl}/api/runtime/health`, { headers }).then((r) => r.json()),
			]);

			const rawModels: any[] =
				modelsRes.status === "fulfilled" && (modelsRes.value as any)?.models
					? (modelsRes.value as any).models
					: [];

			const loadedModelId: string | null =
				healthRes.status === "fulfilled" && (healthRes.value as any)?.loadedModel
					? (healthRes.value as any).loadedModel
					: null;

			if (rawModels.length === 0) {
				// Fallback if engine-api is offline
				res.json({
					models: [
						{
							id: "qwen3.5-9b",
							name: "Qwen 3.5 9B",
							size: "4.7 GB",
							vision: false,
							loaded: true,
							badge: "Activo",
							desc: "Modelo principal cargado en llama.cpp",
						},
						{
							id: "qwen3.5-4b",
							name: "Qwen 3.5 4B",
							size: "2.6 GB",
							vision: true,
							loaded: false,
							badge: "Visión",
							desc: "Multimodal con soporte de imágenes",
						},
					],
				});
				return;
			}

			const formatted = rawModels.map((m) => {
				const isLoaded = loadedModelId ? m.id === loadedModelId : false;
				const sizeStr = m.sizeBytes ? formatBytes(m.sizeBytes) : "";
				let badge = isLoaded ? "Activo" : m.vision ? "Visión" : "GGUF";

				return {
					id: m.id,
					name: formatModelName(m.id),
					size: sizeStr,
					vision: Boolean(m.vision),
					loaded: isLoaded,
					badge,
					desc: `${m.vision ? "Multimodal (visión)" : "Texto"} · ${sizeStr || "Local GGUF"}`,
				};
			});

			// Sort so loaded model is first
			formatted.sort((a, b) => (b.loaded ? 1 : 0) - (a.loaded ? 1 : 0));

			res.json({ models: formatted, activeModel: loadedModelId });
		} catch (err: any) {
			res.status(500).json({ error: err.message });
		}
	};
}
