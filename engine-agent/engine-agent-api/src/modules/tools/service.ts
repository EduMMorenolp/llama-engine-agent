import type { ToolRegistry } from "../../tools/registry.js";

export class ToolService {
	constructor(private registry: ToolRegistry) {}

	list() {
		return this.registry.list();
	}

	get(name: string) {
		const tool = this.registry.get(name);
		if (!tool) return null;
		return {
			name: tool.spec.function.name,
			description: tool.spec.function.description,
			enabled: tool.enabled,
			parameters: tool.spec.function.parameters,
			spec: tool.spec,
		};
	}

	update(name: string, data: { description?: string; enabled?: boolean }) {
		return this.registry.updateTool(name, data);
	}

	unregister(name: string): boolean {
		return this.registry.unregister(name);
	}
}
