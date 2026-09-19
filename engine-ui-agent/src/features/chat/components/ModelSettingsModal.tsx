import { useState } from "react";
import { createPortal } from "react-dom";
import {
	BrainIcon,
	CheckIcon,
	RotateCcwIcon,
	SlidersIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";

export interface ModelSettings {
	enableReasoning: boolean;
	temperature: number;
	topP: number;
	maxTokens: number;
	presencePenalty: number;
	frequencyPenalty: number;
}

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
	enableReasoning: true,
	temperature: 0.7,
	topP: 0.9,
	maxTokens: 4096,
	presencePenalty: 0.0,
	frequencyPenalty: 0.0,
};

interface ModelSettingsModalProps {
	settings: ModelSettings;
	modelName?: string;
	onSave: (settings: ModelSettings) => void;
	onClose: () => void;
}

const PRESETS: Array<{
	name: string;
	icon: string;
	desc: string;
	settings: Partial<ModelSettings>;
}> = [
	{
		name: "Preciso / Código",
		icon: "🎯",
		desc: "Determinista y estructurado",
		settings: { temperature: 0.2, topP: 0.8, enableReasoning: true },
	},
	{
		name: "Balanceado",
		icon: "⚖️",
		desc: "Uso general equilibrado",
		settings: { temperature: 0.7, topP: 0.9, enableReasoning: true },
	},
	{
		name: "Creativo",
		icon: "🎨",
		desc: "Variado y expresivo",
		settings: { temperature: 1.1, topP: 0.95, enableReasoning: true },
	},
	{
		name: "Directo / Rápido",
		icon: "⚡",
		desc: "Sin bloque de razonamiento",
		settings: { temperature: 0.5, topP: 0.9, enableReasoning: false },
	},
];

export function ModelSettingsModal({
	settings: initialSettings,
	modelName,
	onSave,
	onClose,
}: ModelSettingsModalProps) {
	const [settings, setSettings] = useState<ModelSettings>({
		...DEFAULT_MODEL_SETTINGS,
		...initialSettings,
	});

	const handleApplyPreset = (presetSettings: Partial<ModelSettings>) => {
		setSettings((prev) => ({
			...prev,
			...presetSettings,
		}));
	};

	const handleReset = () => {
		setSettings(DEFAULT_MODEL_SETTINGS);
	};

	const handleSave = () => {
		onSave(settings);
		onClose();
	};

	return createPortal(
		<div className="dialog-backdrop">
			<button
				type="button"
				className="dialog-backdrop-btn"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>
			<div className="dialog-card model-settings-dialog">
				{/* Modal Header */}
				<div className="dialog-title-row">
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<SlidersIcon size={20} style={{ color: "var(--accent)" }} />
						<div>
							<span className="dialog-title">Configuración del Modelo</span>
							<div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
								Parámetros de muestreo y razonamiento para {modelName || "el modelo activo"}
							</div>
						</div>
					</div>
					<button
						type="button"
						className="session-action-btn"
						onClick={onClose}
						title="Cerrar modal"
						style={{ opacity: 1 }}
					>
						<XIcon size={18} />
					</button>
				</div>

				{/* Modal Body */}
				<div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "8px" }}>
					{/* Quick Presets */}
					<div>
						<label
							style={{
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--text-secondary)",
								marginBottom: "8px",
								display: "block",
							}}
						>
							Presets Rápidos
						</label>
						<div className="presets-grid">
							{PRESETS.map((p) => (
								<button
									key={p.name}
									type="button"
									className="preset-card-item"
									onClick={() => handleApplyPreset(p.settings)}
								>
									<span className="preset-card-icon">{p.icon}</span>
									<div className="preset-card-content">
										<div className="preset-card-title">{p.name}</div>
										<div className="preset-card-desc">{p.desc}</div>
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Reasoning Toggle */}
					<div
						className={`reasoning-toggle-card ${settings.enableReasoning ? "active" : ""}`}
						onClick={() =>
							setSettings((prev) => ({ ...prev, enableReasoning: !prev.enableReasoning }))
						}
					>
						<div className="reasoning-toggle-left">
							<BrainIcon
								size={20}
								style={{
									color: settings.enableReasoning ? "var(--ai-spark)" : "var(--text-muted)",
									transition: "color 0.2s ease",
								}}
							/>
							<div>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "6px",
										fontSize: "13px",
										fontWeight: 600,
										color: "var(--text-primary)",
									}}
								>
									<span>Activar Razonamiento (Thinking)</span>
									<span
										className={`reasoning-toggle-badge ${settings.enableReasoning ? "active" : "inactive"}`}
									>
										{settings.enableReasoning ? "Habilitado" : "Desactivado"}
									</span>
								</div>
								<div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
									{settings.enableReasoning
										? "El modelo mostrará su proceso de análisis paso a paso en una caja interactiva."
										: "Respuestas directas sin generar bloques <think>."}
								</div>
							</div>
						</div>
						<div className={`toggle-switch ${settings.enableReasoning ? "active" : ""}`}>
							<div className="toggle-knob" />
						</div>
					</div>

					{/* Temperature Slider */}
					<div className="settings-slider-block">
						<div className="slider-header">
							<label className="slider-header-label">
								Temperatura (Creatividad)
							</label>
							<span className="slider-header-val">
								{settings.temperature.toFixed(2)}
							</span>
						</div>
						<input
							type="range"
							min="0"
							max="2"
							step="0.05"
							value={settings.temperature}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									temperature: Number.parseFloat(e.target.value),
								}))
							}
							style={{ width: "100%", accentColor: "var(--accent)" }}
						/>
						<div className="slider-footer-hints">
							<span>0.0 (Preciso / Código)</span>
							<span>0.7 (Balanceado)</span>
							<span>2.0 (Muy Creativo)</span>
						</div>
					</div>

					{/* Top P Slider */}
					<div className="settings-slider-block">
						<div className="slider-header">
							<label className="slider-header-label">
								Top P (Nucleus Sampling)
							</label>
							<span className="slider-header-val">
								{settings.topP.toFixed(2)}
							</span>
						</div>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={settings.topP}
							onChange={(e) =>
								setSettings((prev) => ({ ...prev, topP: Number.parseFloat(e.target.value) }))
							}
							style={{ width: "100%", accentColor: "var(--accent)" }}
						/>
						<div className="slider-footer-hints">
							<span>0.1 (Focalizado)</span>
							<span>0.9 (Estándar)</span>
							<span>1.0 (Sin filtro)</span>
						</div>
					</div>

					{/* Max Tokens Slider */}
					<div className="settings-slider-block">
						<div className="slider-header">
							<label className="slider-header-label">
								Tokens Máximos de Respuesta
							</label>
							<span className="slider-header-val">
								{settings.maxTokens}
							</span>
						</div>
						<input
							type="range"
							min="256"
							max="16384"
							step="256"
							value={settings.maxTokens}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									maxTokens: Number.parseInt(e.target.value, 10),
								}))
							}
							style={{ width: "100%", accentColor: "var(--accent)" }}
						/>
					</div>

					{/* Penalties Accordion / Row */}
					<div className="penalties-grid">
						<div className="penalties-item">
							<div className="penalties-header">
								<span>Penalidad de Frecuencia</span>
								<span>{settings.frequencyPenalty.toFixed(1)}</span>
							</div>
							<input
								type="range"
								min="-2"
								max="2"
								step="0.1"
								value={settings.frequencyPenalty}
								onChange={(e) =>
									setSettings((prev) => ({
										...prev,
										frequencyPenalty: Number.parseFloat(e.target.value),
									}))
								}
								style={{ width: "100%", accentColor: "var(--accent)" }}
							/>
						</div>

						<div className="penalties-item">
							<div className="penalties-header">
								<span>Penalidad de Presencia</span>
								<span>{settings.presencePenalty.toFixed(1)}</span>
							</div>
							<input
								type="range"
								min="-2"
								max="2"
								step="0.1"
								value={settings.presencePenalty}
								onChange={(e) =>
									setSettings((prev) => ({
										...prev,
										presencePenalty: Number.parseFloat(e.target.value),
									}))
								}
								style={{ width: "100%", accentColor: "var(--accent)" }}
							/>
						</div>
					</div>
				</div>

				{/* Modal Footer */}
				<div
					className="dialog-footer"
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginTop: "16px",
					}}
				>
					<button
						type="button"
						className="btn-secondary"
						onClick={handleReset}
					>
						<RotateCcwIcon size={14} />
						<span>Por defecto</span>
					</button>

					<div style={{ display: "flex", gap: "8px" }}>
						<button type="button" className="btn-secondary" onClick={onClose}>
							Cancelar
						</button>
						<button
							type="button"
							className="btn-primary"
							onClick={handleSave}
						>
							<CheckIcon size={14} />
							<span>Guardar cambios</span>
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
