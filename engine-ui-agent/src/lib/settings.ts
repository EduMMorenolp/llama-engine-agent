export interface AppSettings {
	autoScroll: boolean;
	streamResponses: boolean;
	showMetrics: boolean;
	expandReasoning: boolean;
	temperature: number;
	topP: number;
	topK: number;
	repeatPenalty: number;
	apiUrl: string;
	engineUrl: string;
	debugLogs: boolean;
	theme: "dark" | "light";
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
	autoScroll: true,
	streamResponses: true,
	showMetrics: true,
	expandReasoning: true,
	temperature: 0.7,
	topP: 0.9,
	topK: 40,
	repeatPenalty: 1.1,
	apiUrl: "http://localhost:3060",
	engineUrl: "http://localhost:3050",
	debugLogs: false,
	theme: "dark",
};

const SETTINGS_KEY = "llama_engine_settings";

export function loadSettings(): AppSettings {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return { ...DEFAULT_APP_SETTINGS };
		const parsed = JSON.parse(raw);
		return {
			...DEFAULT_APP_SETTINGS,
			...parsed,
		};
	} catch {
		return { ...DEFAULT_APP_SETTINGS };
	}
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
	const current = loadSettings();
	const updated = { ...current, ...settings };
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
		window.dispatchEvent(new CustomEvent("llama_settings_changed", { detail: updated }));
	} catch (err) {
		console.warn("[settings] Error al guardar configuración:", err);
	}
	return updated;
}
