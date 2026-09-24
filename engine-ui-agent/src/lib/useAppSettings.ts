import { useEffect, useState } from "react";
import { type AppSettings, loadSettings, saveSettings } from "./settings.ts";

export function useAppSettings() {
	const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

	useEffect(() => {
		const handleSettingsChanged = (e: Event) => {
			const customEvent = e as CustomEvent<AppSettings>;
			if (customEvent.detail) {
				setSettings(customEvent.detail);
			} else {
				setSettings(loadSettings());
			}
		};

		window.addEventListener("llama_settings_changed", handleSettingsChanged);
		window.addEventListener("storage", handleSettingsChanged);

		return () => {
			window.removeEventListener("llama_settings_changed", handleSettingsChanged);
			window.removeEventListener("storage", handleSettingsChanged);
		};
	}, []);

	const updateSettings = (partial: Partial<AppSettings>) => {
		const updated = saveSettings(partial);
		setSettings(updated);
	};

	return {
		settings,
		updateSettings,
	};
}
