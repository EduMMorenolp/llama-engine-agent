import { exec } from "node:child_process";
import fs from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getConfig } from "../config/index.js";
import { bashTool } from "./bash.js";
import { createSkillTool } from "./create_skill.js";
import { deleteSkillTool } from "./delete_skill.js";
import { editFileTool, readFileTool, writeFileTool } from "./file-ops.js";
import { loadSkillTool } from "./load_skill.js";
import { memorizeTool, searchMemoriesTool, updateMemoryTool } from "./memory.js";
import { reflectTool } from "./reflect.js";
import type { ToolRegistry } from "./registry.js";
import { runSkillScriptTool } from "./run_skill_script.js";
import { globSearchTool, grepSearchTool } from "./search.js";
import type { ToolHandler } from "./types.js";
import { updateSkillTool } from "./update_skill.js";

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
		for await (const entry of glob(pattern, { cwd: basePath })) {
			const parts = entry.split(/[\\/]/);
			if (parts.some((p) => IGNORED_DIRS.has(p))) continue;
			files.push(entry);
			if (files.length >= 100) {
				files.push("... [Límite de 100 archivos alcanzado]");
				break;
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

const loadSkillHandler: ToolHandler = async (args, ctx) => {
	const skillName = String(args.name);
	if (!ctx.skillService) return `Skill service no disponible`;
	const skill = ctx.skillService.getOrNull(skillName);
	if (!skill) return `Skill "${skillName}" no encontrada`;
	const skillDir = `${skill.directory}/SKILL.md`;
	const fs = await import("node:fs");
	if (fs.existsSync(skillDir)) {
		return fs.readFileSync(skillDir, "utf8");
	}
	return skill.description;
};

const createSkillHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.skillService) return `Skill service no disponible`;
	const name = String(args.name);
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
	const fs = await import("node:fs");
	const path = await import("node:path");
	const skillDir = path.join(getConfig().SKILL_DIR, directory);
	if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });
	fs.writeFileSync(path.join(skillDir, "SKILL.md"), instructions, "utf8");
	return `Skill "${name}" creada en ${skillDir}`;
};

const runSkillScriptHandler: ToolHandler = async (args, ctx) => {
	const skillName = String(args.skillName);
	const scriptName = String(args.scriptName);
	const argsStr = args.args ? String(args.args) : "{}";
	if (!ctx.skillService) return "Skill service no disponible";
	const skill = ctx.skillService.getOrNull(skillName);
	if (!skill) return `Skill "${skillName}" no encontrada`;
	const scriptPath = `skills/${skill.directory}/scripts/${scriptName}.ts`;
	if (!fs.existsSync(scriptPath)) return `Script "${scriptPath}" no encontrado`;
	try {
		const { stdout, stderr } = await execAsync(`npx tsx "${scriptPath}" ${argsStr}`, {
			timeout: 30000,
			encoding: "utf8",
			cwd: ctx?.workDir || process.cwd(),
		});
		return truncate(stdout || stderr || "(script ejecutado sin salida)");
	} catch (err: unknown) {
		const error = err as { stderr?: string; message?: string };
		return `Error ejecutando script: ${error.stderr || error.message || String(err)}`;
	}
};

const reflectHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.memoryService) return `Memory service no disponible`;
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
	if (!ctx.skillService) return `Skill service no disponible`;
	const name = String(args.name);
	const instructions = args.instructions as string | undefined;
	const description = args.description as string | undefined;
	const metadata = args.metadata as Record<string, unknown> | undefined;
	ctx.skillService.update(name, { description, metadata: metadata ?? {} });
	if (instructions) {
		const skill = ctx.skillService.getOrNull(name);
		if (skill) {
			const fs = await import("node:fs");
			const skillDir = path.join(getConfig().SKILL_DIR, skill.directory);
			if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });
			fs.writeFileSync(path.join(skillDir, "SKILL.md"), instructions, "utf8");
		}
	}
	return `Skill "${name}" actualizada`;
};

const deleteSkillHandler: ToolHandler = async (args, ctx) => {
	if (!ctx.skillService) return `Skill service no disponible`;
	const name = String(args.name);
	const skill = ctx.skillService.getOrNull(name);
	ctx.skillService.delete(name);
	if (skill) {
		const fs = await import("node:fs");
		const skillDir = path.join(getConfig().SKILL_DIR, skill.directory);
		if (fs.existsSync(skillDir)) {
			fs.rmSync(skillDir, { recursive: true, force: true });
		}
	}
	return `Skill "${name}" eliminada`;
};

export function registerAllTools(registry: ToolRegistry): void {
	registry.register(bashTool, bashHandler);
	registry.register(readFileTool, readFileHandler);
	registry.register(writeFileTool, writeFileHandler);
	registry.register(editFileTool, editFileHandler);
	registry.register(globSearchTool, globSearchHandler);
	registry.register(grepSearchTool, grepSearchHandler);
	registry.register(memorizeTool, memorizeHandler);
	registry.register(searchMemoriesTool, searchMemoriesHandler);
	registry.register(updateMemoryTool, updateMemoryHandler);
	registry.register(loadSkillTool, loadSkillHandler);
	registry.register(runSkillScriptTool, runSkillScriptHandler);
	registry.register(createSkillTool, createSkillHandler);
	registry.register(updateSkillTool, (args, ctx) => updateSkillHandler(args, ctx));
	registry.register(deleteSkillTool, (args, ctx) => deleteSkillHandler(args, ctx));
	registry.register(reflectTool, reflectHandler);
}
