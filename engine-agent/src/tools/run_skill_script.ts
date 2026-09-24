import type { ToolSpec } from "./types.js";

export const runSkillScriptTool: ToolSpec = {
	type: "function",
	function: {
		name: "run_skill_script",
		description:
			"Ejecuta un script de una skill. El script debe existir en skills/{agent}/{skill}/scripts/.",
		parameters: {
			type: "object",
			properties: {
				skillName: { type: "string", description: "Nombre de la skill" },
				scriptName: { type: "string", description: "Nombre del script (sin extensión)" },
				args: { type: "string", description: "Argumentos para el script (JSON string)" },
			},
			required: ["skillName", "scriptName"],
		},
	},
};
