import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { getConfig } from "../config/index.js";
import { registerMCPTools } from "../modules/mcp/tools.js";
import { bashTool } from "./bash.js";
import { createSkillTool } from "./create_skill.js";
import { deleteSkillTool } from "./delete_skill.js";
import { editFileTool, readFileTool, writeFileTool } from "./file-ops.js";
import { listSkillsTool, loadSkillTool } from "./load_skill.js";
import { memorizeTool, searchMemoriesTool, updateMemoryTool } from "./memory.js";
import { reflectTool } from "./reflect.js";
import type { ToolRegistry } from "./registry.js";
import { runSkillScriptTool } from "./run_skill_script.js";
import { globSearchTool, grepSearchTool } from "./search.js";
import type { ToolHandler } from "./types.js";
import { updateSkillTool } from "./update_skill.js";
import { webFetchTool, webSearchTool } from "./web.js";

const execAsync = promisify(exec);

const MAX_OUTPUT_CHARS = 12000; // ~3000 tokens max per tool execution
const IGNORED_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"data",
	".gemini",
	".vscode",
	"coverage",
]);

function truncate(text: string, limit = MAX_OUTPUT_CHARS): string {
	if (!text || text.length <= limit) return text;
	const half = Math.floor(limit / 2);
	const head = text.slice(0, half);
	const tail = text.slice(-half);
	return `${head}\n\n... [Contenido truncado (${text.length} caracteres totales). Usa parámetros o rangos más específicos] ...\n\n${tail}`;
}

const bashHandler: ToolHandler = async (args, ctx) => {
	const command = String(args.command);
	try {
		const { stdout, stderr } = await execAsync(command, {
			encoding: "utf8",
			timeout: 30000,
			maxBuffer: 5 * 1024 * 1024,
			cwd: ctx?.workDir || process.cwd(),
		});
		return truncate(stdout || stderr || "(comando ejecutado sin salida)");
	} catch (err: unknown) {
		const error = err as { stderr?: string; stdout?: string; message?: string };
		return truncate(error.stderr || error.stdout || error.message || "Unknown error");
	}
};

const readFileHandler: ToolHandler = async (args) => {
	const filePath = String(args.path);
	try {
		if (!fs.existsSync(filePath)) {
			return `Error: el archivo "${filePath}" no existe.`;
		}
		const stat = fs.statSync(filePath);
		if (stat.isDirectory()) {
			return `Error: "${filePath}" es un directorio, usa glob_search para listar archivos.`;
		}
		const content = fs.readFileSync(filePath, "utf8");
		return truncate(content);
	} catch (err: unknown) {
		const error = err as { message?: string };
		return `Error leyendo archivo: ${error.message || String(err)}`;
	}
};

const writeFileHandler: ToolHandler = async (args) => {
	const filePath = String(args.path);
	const content = String(args.content);
	try {
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(filePath, content, "utf8");
		return `Archivo escrito correctamente (${content.length} caracteres)`;
	} catch (err: unknown) {
		const error = err as { message?: string };
		return `Error escribiendo archivo: ${error.message || String(err)}`;
	}
};

const editFileHandler: ToolHandler = async (args) => {
	const filePath = String(args.path);
	const oldText = String(args.oldText);
	const newText = String(args.newText);
	try {
		if (!fs.existsSync(filePath)) {
			return `Error: el archivo "${filePath}" no existe.`;
		}
		let content = fs.readFileSync(filePath, "utf8");
		if (!content.includes(oldText)) {
			const normalizedContent = content.replace(/\r\n/g, "\n");
			const normalizedOld = oldText.replace(/\r\n/g, "\n");
			if (!normalizedContent.includes(normalizedOld)) {
				return "Error: texto no encontrado en el archivo";
			}
			content = normalizedContent.replace(normalizedOld, newText.replace(/\r\n/g, "\n"));
		} else {
			content = content.replace(oldText, newText);
		}
		fs.writeFileSync(filePath, content, "utf8");
		return "Archivo editado correctamente";
	} catch (err: unknown) {
		const error = err as { message?: string };
		return `Error editando archivo: ${error.message || String(err)}`;
	}
};

const globSearchHandler: ToolHandler = async (args) => {
	const pattern = String(args.pattern || "*");
	const basePath = args.path ? String(args.path) : ".";
	try {
		const files: string[] = [];
		const regex = new RegExp(
			"^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
			"i",
		);
		const entries = await fs.promises.readdir(basePath, { recursive: true });
		for (const entry of entries) {
			const entryStr = String(entry);
			const parts = entryStr.split(/[\\/]/);
			if (parts.some((p) => IGNORED_DIRS.has(p))) continue;
			if (pattern === "*" || regex.test(entryStr) || regex.test(parts[parts.length - 1])) {
				files.push(entryStr);
				if (files.length >= 100) {
					files.push("... [Límite de 100 archivos alcanzado]");
					break;
				}
			}
		}
		return files.length ? files.join("\n") : "No se encontraron archivos";
	} catch (err: unknown) {
		const error = err as { message?: string };
		return `Error en búsqueda: ${error.message || String(err)}`;
	}
};

function createSearchRegex(pattern: string): RegExp {
	try {
		return new RegExp(pattern, "gi");
	} catch {
		const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return new RegExp(escaped, "gi");
	}
}

const grepSearchHandler: ToolHandler = async (args) => {
	const pattern = String(args.pattern);
	const searchPath = args.path ? String(args.path) : ".";
	try {
		const regex = createSearchRegex(pattern);
		const results: string[] = [];

		function searchInPath(currentPath: string) {
			if (results.length >= 60) return;
			const baseName = path.basename(currentPath);
			if (IGNORED_DIRS.has(baseName)) return;

			let stat: fs.Stats;
			try {
				stat = fs.statSync(currentPath);
			} catch {
				return;
			}

			if (stat.isFile()) {
				if (stat.size > 1024 * 1024) return; // skip files > 1MB
				try {
					const content = fs.readFileSync(currentPath, "utf8");
					const lines = content.split("\n");
					for (let i = 0; i < lines.length; i++) {
						if (regex.test(lines[i])) {
							results.push(`${currentPath}:${i + 1}: ${lines[i].trim().slice(0, 150)}`);
							if (results.length >= 60) break;
						}
						regex.lastIndex = 0;
					}
				} catch {
					// skip unreadable
				}
			} else if (stat.isDirectory()) {
				let entries: fs.Dirent[] = [];
				try {
					entries = fs.readdirSync(currentPath, { withFileTypes: true });
				} catch {
					return;
				}
				for (const entry of entries) {
					if (results.length >= 60) break;
					if (IGNORED_DIRS.has(entry.name)) continue;
					searchInPath(path.join(currentPath, entry.name));
				}
			}
		}

		searchInPath(searchPath);

		if (results.length >= 60) {
			results.push("... [Límite de 60 coincidencias alcanzado]");
		}

		return results.length ? results.join("\n") : "No se encontraron coincidencias";
	} catch (err: unknown) {
		const error = err as { message?: string };
		return `Error en búsqueda: ${error.message || String(err)}`;
	}
};

const memorizeHandler: ToolHandler = async (args, ctx) => {
	const key = String(args.key);
	const content = String(args.content);
	const tags = args.tags
		? String(args.tags)
				.split(",")
				.map((t) => t.trim())
		: [];
	if (ctx.memoryService) {
		ctx.memoryService.upsert(key, content, tags);
	} else {
		throw new Error("Memory service not available");
	}
	return `Memoria "${key}" guardada`;
};

const searchMemoriesHandler: ToolHandler = async (args, ctx) => {
	const query = String(args.query);
	if (!ctx.memoryService) return "No se encontraron memorias";
	const memories = ctx.memoryService.search(query);
	if (!memories.length) return "No se encontraron memorias";
	return memories.map((m) => `${m.key}: ${m.content}`).join("\n");
};

const updateMemoryHandler: ToolHandler = async (args, ctx) => {
	const key = String(args.key);
	const content = String(args.content);
	if (!ctx.memoryService) throw new Error("Memory service not available");
	ctx.memoryService.upsert(key, content, []);
	return `Memoria "${key}" actualizada`;
};

function formatSkillsCatalog(ctx: Parameters<ToolHandler>[1]): string {
	if (!ctx.skillService) return "Skill service no disponible";
	const skills = ctx.skillService.list();
	if (skills.length === 0) {
		return "No hay skills instaladas actualmente. Podés crear una nueva con create_skill.";
	}
	return skills
		.map((s) => {
			const triggers =
				Array.isArray(s.triggers) && s.triggers.length > 0 ? s.triggers.join(", ") : "ninguno";
			const tags = Array.isArray(s.tags) && s.tags.length > 0 ? s.tags.join(", ") : "ninguno";
			return `- **${s.name}** (agente: ${s.agent})\n  Descripción: ${s.description}\n  Triggers: ${triggers} | Tags: ${tags} | Directorio: ${s.directory}`;
		})
		.join("\n\n");
}

const listSkillsHandler: ToolHandler = async (_args, ctx) => {
	return formatSkillsCatalog(ctx);
};

const BUILTIN_SKILL_PLAYBOOKS: Record<string, string> = {
	"web-research": [
		'1. Para buscar clima, pronóstico, noticias o datos en internet, llamá INMEDIATAMENTE a la herramienta nativa `web_search` pasando `query` y `location` (si es clima, poné solo el nombre de la ciudad en `location`, por ejemplo `{"query": "clima mañana La Plata", "location": "La Plata"}`).',
		"2. Si necesitás inspeccionar el contenido de una página o endpoint puntual, llamá a `web_fetch` con la URL.",
		"3. NO uses `run_skill_script` (esta skill usa directamente `web_search` y `web_fetch`).",
		"4. Presentá la respuesta sintetizada con los datos exactos obtenidos (temperaturas máxima/mínima, probabilidad de lluvia, viento o enlaces relevantes).",
	].join("\n"),
	"code-review": [
		"1. Usá `glob_search`, `grep_search` y `read_file` para inspeccionar los archivos relevantes del proyecto.",
		"2. Analizá corrección, legibilidad, arquitectura, seguridad y rendimiento.",
		"3. Presentá hallazgos concretos con archivo, línea y propuesta de mejora.",
	].join("\n"),
	"quick-fix": [
		"1. Leé el archivo afectado con `read_file` o buscá el error con `grep_search`.",
		"2. Aplicá la corrección quirúrgica usando `edit_file` y verificá con `bash` si corresponde.",
	].join("\n"),
	"architecture-audit": [
		"1. Listá la estructura del proyecto con `glob_search` y leé los archivos de configuración y entrada con `read_file`.",
		"2. Evaluá modularidad, acoplamiento, dependencias y proponé un plan de mejoras.",
	].join("\n"),
};

const loadSkillHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.skillService) return "Skill service no disponible";
	const rawName = args?.name !== undefined && args?.name !== null ? String(args.name).trim() : "";
	if (!rawName || rawName === "list" || rawName === "all" || rawName === "*") {
		return `Skills disponibles:\n\n${formatSkillsCatalog(ctx)}`;
	}
	const skill = ctx.skillService.getOrNull(rawName);
	if (!skill) {
		return `Skill "${rawName}" no encontrada.\n\nSkills disponibles actualmente:\n${formatSkillsCatalog(ctx)}`;
	}
	ctx.skillService.incrementUsage(skill.name);
	const baseSkillDir = getConfig().SKILL_DIR;
	const candidatePaths = [
		path.join(baseSkillDir, skill.directory, "SKILL.md"),
		path.join(skill.directory, "SKILL.md"),
		path.join(baseSkillDir, skill.name, "SKILL.md"),
	];
	for (const candidate of candidatePaths) {
		if (fs.existsSync(candidate)) {
			const instructions = fs.readFileSync(candidate, "utf8");
			return `# Skill: ${skill.name} (agente: ${skill.agent})\nDescripción: ${skill.description}\n\n## Instrucciones (SKILL.md):\n${instructions}`;
		}
	}
	const playbook =
		BUILTIN_SKILL_PLAYBOOKS[skill.name] ??
		`Ejecutá la tarea usando directamente las herramientas nativas permitidas: ${((skill.metadata as { allowed_tools?: string[] })?.allowed_tools || ["web_search", "read_file", "glob_search"]).join(", ")}.`;
	return `# Skill activada: ${skill.name} (agente: ${skill.agent})\nDescripción: ${skill.description}\n\n## Instrucciones paso a paso:\n${playbook}`;
};

const createSkillHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.skillService) return "Skill service no disponible";
	const name = String(args.name).trim();
	const description = String(args.description);
	const instructions = String(args.instructions);
	const triggers = (args.triggers as string[]) ?? [];
	const tags = (args.tags as string[]) ?? [];
	const directory = `skills/${name}`;
	ctx.skillService.create({
		name,
		agent: "default",
		description,
		directory,
		metadata: {},
		allowedTools: [],
		triggers,
		tags,
	});
	const skillDir = path.join(getConfig().SKILL_DIR, name);
	if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });
	fs.writeFileSync(path.join(skillDir, "SKILL.md"), instructions, "utf8");
	return `Skill "${name}" creada correctamente en ${skillDir}/SKILL.md`;
};

const reflectHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.memoryService) return "Memory service no disponible";
	const success = args.success as boolean;
	const lesson = String(args.lesson);
	const key = `reflect_${Date.now()}`;
	ctx.memoryService.upsert(key, lesson, success ? ["lesson"] : ["insight"]);
	if (success) {
		ctx.memoryService.updateRelevance(key, 3);
	}
	return `Reflexión guardada: ${lesson.slice(0, 100)}...`;
};

const updateSkillHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.skillService) return "Skill service no disponible";
	const name = String(args.name).trim();
	const instructions = args.instructions as string | undefined;
	const description = args.description as string | undefined;
	const metadata = args.metadata as Record<string, unknown> | undefined;
	ctx.skillService.update(name, { description, metadata: metadata ?? {} });
	if (instructions) {
		const skill = ctx.skillService.getOrNull(name);
		if (skill) {
			const skillDir = path.join(getConfig().SKILL_DIR, skill.name);
			if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });
			fs.writeFileSync(path.join(skillDir, "SKILL.md"), instructions, "utf8");
		}
	}
	return `Skill "${name}" actualizada`;
};

const deleteSkillHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.skillService) return "Skill service no disponible";
	const name = String(args.name).trim();
	const skill = ctx.skillService.getOrNull(name);
	ctx.skillService.delete(name);
	if (skill) {
		for (const dir of [
			path.join(getConfig().SKILL_DIR, skill.name),
			path.join(getConfig().SKILL_DIR, skill.directory),
		]) {
			if (fs.existsSync(dir)) {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		}
	}
	return `Skill "${name}" eliminada`;
};

const runSkillScriptHandler: ToolHandler = async (args, ctx) => {
	const skillName = String(args.skillName || "").trim();
	const scriptName = String(args.scriptName || "").trim();
	const scriptArgs = args.args ? String(args.args) : "";

	if (!skillName || !scriptName) {
		return "Error: skillName y scriptName son requeridos.";
	}

	const safeSkill = path.basename(skillName);
	const safeScript = path.basename(scriptName);
	const baseSkillDir = getConfig().SKILL_DIR;
	const candidateDirs = [
		path.join(baseSkillDir, safeSkill, "scripts"),
		path.join(baseSkillDir, "default", safeSkill, "scripts"),
		path.join(process.cwd(), "skills", safeSkill, "scripts"),
	];

	let scriptPath: string | null = null;
	for (const dir of candidateDirs) {
		if (fs.existsSync(dir)) {
			const files = fs.readdirSync(dir);
			const found = files.find((f) => f === safeScript || f.startsWith(`${safeScript}.`));
			if (found) {
				scriptPath = path.join(dir, found);
				break;
			}
		}
	}

	if (!scriptPath) {
		return `Error: No se encontró el script "${safeScript}" en la carpeta scripts de la skill "${safeSkill}".`;
	}

	try {
		const ext = path.extname(scriptPath).toLowerCase();
		let cmd = "";
		if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
			cmd = `node "${scriptPath}" ${scriptArgs}`;
		} else if (ext === ".py") {
			cmd = `python3 "${scriptPath}" ${scriptArgs}`;
		} else if (ext === ".sh") {
			cmd = `bash "${scriptPath}" ${scriptArgs}`;
		} else {
			cmd = `"${scriptPath}" ${scriptArgs}`;
		}

		const { stdout, stderr } = await execAsync(cmd.trim(), {
			encoding: "utf8",
			timeout: 30000,
			maxBuffer: 5 * 1024 * 1024,
			cwd: ctx?.workDir || process.cwd(),
		});
		return truncate(stdout || stderr || "(script ejecutado sin salida)");
	} catch (err: unknown) {
		const error = err as { stderr?: string; stdout?: string; message?: string };
		return truncate(error.stderr || error.stdout || error.message || "Error al ejecutar script");
	}
};

function stripHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

const webFetchHandler: ToolHandler = async (args) => {
	const url = String(args.url || "").trim();
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		return "Error: La URL debe comenzar con http:// o https://";
	}
	try {
		const res = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; LlamaEngineAgent/1.0)",
				"Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
			},
			signal: AbortSignal.timeout(15000),
		});
		const contentType = res.headers.get("content-type") || "";
		const text = await res.text();
		if (contentType.includes("application/json")) {
			return truncate(text);
		}
		if (contentType.includes("text/html")) {
			return truncate(stripHtml(text));
		}
		return truncate(text);
	} catch (err: unknown) {
		const error = err as { message?: string };
		return `Error al consultar URL "${url}": ${error.message || String(err)}`;
	}
};

function extractWeatherCandidates(query: string, explicitLocation?: string): string[] {
	const candidates: string[] = [];
	if (explicitLocation && explicitLocation.trim()) {
		const cleanExplicit = explicitLocation.trim();
		candidates.push(cleanExplicit.split(",")[0].trim());
		candidates.push(cleanExplicit);
	}

	const afterEnMatch = query.match(/\b(?:en|para|de)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s,]+)$/i);
	const rawSource = afterEnMatch ? afterEnMatch[1] : query;

	const cleaned = rawSource
		.replace(
			/\b(?:que|qué|cual|cuál|como|cómo|es|sera|será|esta|está|el|clima|tiempo|temperatura|pron[oó]stico|weather|forecast|lluvia|va|a|hacer|hace|habr[aá]|para|hoy|ma[ñn]ana|pasado|ahora|actual|en)\b/gi,
			" ",
		)
		.replace(/\s+/g, " ")
		.trim();

	if (cleaned) {
		if (cleaned.includes(",")) {
			candidates.push(cleaned.split(",")[0].trim());
		}
		const withoutCountry = cleaned
			.replace(/\b(?:provincia\s+de\s+)?buenos\s+aires\s+argentina$/i, "")
			.replace(/\bargentina$/i, "")
			.trim();
		if (withoutCountry && withoutCountry.length >= 3) {
			candidates.push(withoutCountry);
			const withoutProvince = withoutCountry.replace(/\bbuenos\s+aires$/i, "").trim();
			if (withoutProvince && withoutProvince.length >= 3) {
				candidates.push(withoutProvince);
			}
		}
		candidates.push(cleaned);
	}

	candidates.push("Buenos Aires");
	return [...new Set(candidates.filter(Boolean))];
}

const webSearchHandler: ToolHandler = async (args) => {
	const query = String(args.query || "").trim();
	const explicitLocation = args.location ? String(args.location).trim() : undefined;
	if (!query && !explicitLocation) return "Error: Debes especificar una consulta (query).";

	const results: string[] = [];
	const isWeatherQuery =
		Boolean(explicitLocation) ||
		/\b(?:clima|tiempo|temperatura|pron[oó]stico|weather|forecast|lluvia|calor|fr[ií]o)\b/i.test(
			query,
		);

	if (isWeatherQuery) {
		const candidates = extractWeatherCandidates(query, explicitLocation);
		const fullTextLower = `${query} ${explicitLocation || ""}`.toLowerCase();
		const wantsArgentina =
			fullTextLower.includes("argentina") ||
			fullTextLower.includes("buenos aires") ||
			fullTextLower.includes("la plata");

		try {
			let place: {
				name: string;
				country?: string;
				admin1?: string;
				latitude: number;
				longitude: number;
				timezone?: string;
			} | null = null;

			for (const candidate of candidates) {
				const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=5&language=es&format=json`;
				const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(8000) });
				const geoData = (await geoRes.json()) as {
					results?: Array<{
						name: string;
						country?: string;
						country_code?: string;
						admin1?: string;
						latitude: number;
						longitude: number;
						timezone?: string;
					}>;
				};
				if (geoData.results && geoData.results.length > 0) {
					place =
						(wantsArgentina
							? geoData.results.find(
									(r) => r.country_code === "AR" || r.country?.toLowerCase() === "argentina",
								)
							: null) ?? geoData.results[0];
					break;
				}
			}

			if (!place) {
				place = {
					name: "Buenos Aires",
					country: "Argentina",
					latitude: -34.61315,
					longitude: -58.37723,
					timezone: "America/Argentina/Buenos_Aires",
				};
			}

			const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=4`;
			const meteoRes = await fetch(meteoUrl, { signal: AbortSignal.timeout(8000) });
			const meteo = (await meteoRes.json()) as {
				current?: {
					temperature_2m?: number;
					relative_humidity_2m?: number;
					apparent_temperature?: number;
					precipitation?: number;
					wind_speed_10m?: number;
				};
				daily?: {
					time?: string[];
					temperature_2m_max?: number[];
					temperature_2m_min?: number[];
					precipitation_probability_max?: number[];
					wind_speed_10m_max?: number[];
				};
			};
			if (meteo.current) {
				const c = meteo.current;
				const labels = ["Hoy", "Mañana", "Pasado mañana", "Día 4"];
				const dailyLines = (meteo.daily?.time || []).map(
					(day, i) =>
						`  - **${labels[i] || day} (${day})**: Máx ${meteo.daily?.temperature_2m_max?.[i]}°C / Mín ${meteo.daily?.temperature_2m_min?.[i]}°C | Prob. lluvia: ${meteo.daily?.precipitation_probability_max?.[i] ?? 0}% | Viento máx: ${meteo.daily?.wind_speed_10m_max?.[i] ?? "-"} km/h`,
				);
				results.push(
					[
						`### Clima y Pronóstico Oficial (Open-Meteo): ${place.name}${place.admin1 ? `, ${place.admin1}` : ""} (${place.country || ""})`,
						`- **Coordenadas**: ${place.latitude}, ${place.longitude}`,
						`- **Ahora mismo**: ${c.temperature_2m}°C (Sensación térmica: ${c.apparent_temperature}°C) | Humedad: ${c.relative_humidity_2m}% | Viento: ${c.wind_speed_10m} km/h | Precipitación: ${c.precipitation} mm`,
						`- **Pronóstico diario (Hoy y próximos días)**:\n${dailyLines.join("\n")}`,
					].join("\n"),
				);
			}
		} catch {}
	}

	try {
		const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
		const res = await fetch(ddgUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
				"Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
			},
			signal: AbortSignal.timeout(10000),
		});
		const html = await res.text();
		const snippetMatches = [
			...html.matchAll(
				/<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi,
			),
		];
		for (const m of snippetMatches.slice(0, 6)) {
			const rawHref = m[1] || "";
			const uddgMatch = rawHref.match(/uddg=([^&]+)/);
			const link = uddgMatch ? decodeURIComponent(uddgMatch[1]) : rawHref;
			const title = stripHtml(m[2] || "");
			const snippet = stripHtml(m[3] || "");
			if (title && snippet) {
				results.push(`- **${title}** (${link})\n  ${snippet}`);
			}
		}
	} catch {}

	if (results.length === 0) {
		try {
			const wikiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
			const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(8000) });
			const wikiData = (await wikiRes.json()) as {
				query?: { search?: Array<{ title: string; snippet: string }> };
			};
			for (const item of (wikiData.query?.search || []).slice(0, 4)) {
				results.push(`- **Wikipedia: ${item.title}**\n  ${stripHtml(item.snippet)}`);
			}
		} catch {}
	}

	return results.length > 0
		? results.join("\n\n")
		: `No se encontraron resultados externos para "${query}".`;
};

export function registerAllTools(registry: ToolRegistry): void {
	registry.register(webSearchTool, webSearchHandler);
	registry.register(webFetchTool, webFetchHandler);
	registry.register(listSkillsTool, listSkillsHandler);
	registry.register(loadSkillTool, loadSkillHandler);
	registry.register(createSkillTool, createSkillHandler);
	registry.register(updateSkillTool, (args, ctx) => updateSkillHandler(args, ctx));
	registry.register(deleteSkillTool, (args, ctx) => deleteSkillHandler(args, ctx));
	registry.register(runSkillScriptTool, runSkillScriptHandler);
	registry.register(bashTool, bashHandler);
	registry.register(readFileTool, readFileHandler);
	registry.register(writeFileTool, writeFileHandler);
	registry.register(editFileTool, editFileHandler);
	registry.register(globSearchTool, globSearchHandler);
	registry.register(grepSearchTool, grepSearchHandler);
	registry.register(memorizeTool, memorizeHandler);
	registry.register(searchMemoriesTool, searchMemoriesHandler);
	registry.register(updateMemoryTool, updateMemoryHandler);
	registry.register(reflectTool, reflectHandler);
	registerMCPTools(registry);
}
