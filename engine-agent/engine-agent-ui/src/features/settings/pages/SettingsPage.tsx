import { createSession } from "../../../api.ts";
import {
	DownloadIcon,
	MoonIcon,
	RefreshCwIcon,
	SlidersIcon,
	SunIcon,
	TrashIcon,
	UploadIcon,
} from "../../../components/ui/Icons.tsx";
import { DEFAULT_APP_SETTINGS } from "../../../lib/settings.ts";
import { useAppSettings } from "../../../lib/useAppSettings.ts";
import { useToast } from "../../../providers/ToastProvider.tsx";
import { useSessions } from "../../sessions/hooks/useSessions.ts";

export function SettingsPage() {
	const appSettings = useAppSettings();
	const { addToast } = useToast();
	const { sessions, removeSession, loadSessions } = useSessions();

	const handleResetDefaults = () => {
		appSettings.updateSettings({ ...DEFAULT_APP_SETTINGS });
		addToast("Configuración restaurada a los valores por defecto", "info");
	};

	const handleExportConversations = () => {
		try {
			const exportData = JSON.stringify(sessions, null, 2);
			const blob = new Blob([exportData], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `engine-agent-conversations-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			addToast("Conversaciones exportadas exitosamente", "success");
		} catch {
			addToast("Error al exportar conversaciones", "error");
		}
	};

	const handleImportConversations = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const content = reader.result as string;
				const imported = JSON.parse(content);
				if (Array.isArray(imported)) {
					let count = 0;
					for (const item of imported) {
						if (item && typeof item === "object") {
							const name = item.name || item.session?.name || "Conversación importada";
							const model = item.model || item.session?.model;
							await createSession(name, model);
							count++;
						}
					}
					addToast(`${count} conversaciones importadas con éxito`, "success");
					await loadSessions();
				} else {
					addToast("Formato de archivo JSON inválido", "error");
				}
			} catch {
				addToast("Error al leer el archivo JSON", "error");
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	const handleDeleteAllConversations = async () => {
		if (
			window.confirm(
				"¿Estás seguro de eliminar todas las conversaciones? Esta acción es permanente y no se puede deshacer.",
			)
		) {
			for (const s of sessions) {
				await removeSession(s.id);
			}
			addToast("Todas las conversaciones han sido eliminadas", "info");
			await loadSessions();
		}
	};

	return (
		<div style={{ flex: 1, height: "100%", overflowY: "auto", padding: "24px 32px" }}>
			{/* Page Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "24px",
					flexWrap: "wrap",
					gap: "12px",
				}}
			>
				<div>
					<h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
						Configuración del Sistema
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Preferencias generales del chat, parámetros de inferencia LLM, endpoints y respaldo de
						sesiones.
					</p>
				</div>

				<button
					type="button"
					className="btn-secondary"
					onClick={handleResetDefaults}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						padding: "8px 14px",
						fontSize: "12.5px",
					}}
				>
					<RefreshCwIcon size={14} />
					<span>Restaurar por defecto</span>
				</button>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
					gap: "20px",
					maxWidth: "1100px",
				}}
			>
				{/* Card 1: Preferencias Generales & Visualización */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<SlidersIcon size={16} style={{ color: "var(--accent)" }} />
						<h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
							Preferencias del Chat & Visualización
						</h3>
					</div>

					{/* Tema Visual */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							paddingBottom: "12px",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
								Tema Visual
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Alternar entre tema Oscuro (Obsidian) y Claro
							</div>
						</div>
						<button
							type="button"
							className="btn-secondary"
							onClick={appSettings.toggleTheme}
							style={{
								padding: "6px 12px",
								fontSize: "12px",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							{appSettings.theme === "dark" ? <SunIcon size={14} /> : <MoonIcon size={14} />}
							<span>{appSettings.theme === "dark" ? "Cambiar a Claro" : "Cambiar a Oscuro"}</span>
						</button>
					</div>

					{/* Auto-scroll */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							paddingBottom: "12px",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
								Desplazamiento Automático (Auto-scroll)
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Desplazar hacia abajo automáticamente a medida que se generan nuevos tokens
							</div>
						</div>
						<label className="switch-control" aria-label="Auto scroll">
							<input
								type="checkbox"
								checked={appSettings.autoScroll}
								onChange={(e) => appSettings.updateSettings({ autoScroll: e.target.checked })}
							/>
							<span className="switch-slider" />
						</label>
					</div>

					{/* Stream responses */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							paddingBottom: "12px",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
								Streaming en Tiempo Real
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Renderizar respuestas Markdown progresivamente por WebSocket
							</div>
						</div>
						<label className="switch-control" aria-label="Streaming en tiempo real">
							<input
								type="checkbox"
								checked={appSettings.streamResponses}
								onChange={(e) => appSettings.updateSettings({ streamResponses: e.target.checked })}
							/>
							<span className="switch-slider" />
						</label>
					</div>

					{/* Show token metrics & speed */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							paddingBottom: "12px",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
								Mostrar Métricas de Tokens y Velocidad
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Mostrar conteo de tokens, tiempo de respuesta (s) y velocidad (tokens/s)
							</div>
						</div>
						<label className="switch-control" aria-label="Mostrar métricas">
							<input
								type="checkbox"
								checked={appSettings.showMetrics}
								onChange={(e) => appSettings.updateSettings({ showMetrics: e.target.checked })}
							/>
							<span className="switch-slider" />
						</label>
					</div>

					{/* Expand Reasoning */}
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
								Expandir Razonamiento por Defecto
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Mantener abierto el contenedor de pensamiento (&lt;think&gt;) al recibir mensajes
							</div>
						</div>
						<label className="switch-control" aria-label="Expandir razonamiento">
							<input
								type="checkbox"
								checked={appSettings.expandReasoning}
								onChange={(e) => appSettings.updateSettings({ expandReasoning: e.target.checked })}
							/>
							<span className="switch-slider" />
						</label>
					</div>
				</div>

				{/* Card 2: Parámetros de Inferencia LLM */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
						Parámetros de Inferencia (llama.cpp)
					</h3>

					{/* Modelo LLM Activo */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "8px",
							paddingBottom: "16px",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<div>
								<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
									Modelo LLM Predeterminado
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									Modelo principal suministrado por llama-engine para generación e inferencia
								</div>
							</div>
							<span
								className="model-tag-badge"
								style={{
									background: "rgba(59, 130, 246, 0.1)",
									color: "var(--accent)",
									border: "1px solid rgba(59, 130, 246, 0.25)",
								}}
							>
								{appSettings.defaultModel || "qwen3.5-4b"}
							</span>
						</div>

						<select
							value={appSettings.defaultModel || "qwen3.5-4b"}
							onChange={(e) => {
								const newModel = e.target.value;
								appSettings.updateSettings({ defaultModel: newModel });
								addToast(`Modelo activo actualizado a ${newModel}`, "success");
							}}
							style={{
								width: "100%",
								padding: "8px 10px",
								background: "var(--bg)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-sm)",
								color: "var(--text)",
								fontSize: "12.5px",
								outline: "none",
								cursor: "pointer",
							}}
						>
							<option value="qwen3.5-4b">
								Qwen 3.5 4B (Recomendado - Inferencia local rápida & tools)
							</option>
							<option value="qwen3.5-9b">Qwen 3.5 9B (Razonamiento profundo & análisis)</option>
							<option value="qwen2.5-coder-7b">
								Qwen 2.5 Coder 7B (Especializado en programación)
							</option>
							<option value="gemma-4-e4b">Google Gemma 4 E4B (Visión y multimodal)</option>
							<option value="mistral-small-7b">Mistral Small 7B (Instrucciones complejas)</option>
							<option value="llama-3.2-3b">Meta Llama 3.2 3B (Ultra liviano)</option>
						</select>
					</div>

					<div className="settings-slider-row">
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
								Temperatura (Temperature)
							</span>
							<span className="settings-slider-val">{appSettings.temperature}</span>
						</div>
						<input
							type="range"
							min="0"
							max="2"
							step="0.05"
							value={appSettings.temperature}
							onChange={(e) =>
								appSettings.updateSettings({ temperature: parseFloat(e.target.value) })
							}
						/>
						<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
							Valores bajos (0.2) producen código preciso; valores altos (0.8+) respuestas más
							creativas.
						</span>
					</div>

					<div className="settings-slider-row">
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
								Top-P (Nucleus Sampling)
							</span>
							<span className="settings-slider-val">{appSettings.topP}</span>
						</div>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={appSettings.topP}
							onChange={(e) => appSettings.updateSettings({ topP: parseFloat(e.target.value) })}
						/>
					</div>

					<div className="settings-slider-row">
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>Top-K</span>
							<span className="settings-slider-val">{appSettings.topK}</span>
						</div>
						<input
							type="range"
							min="1"
							max="100"
							step="1"
							value={appSettings.topK}
							onChange={(e) => appSettings.updateSettings({ topK: parseInt(e.target.value, 10) })}
						/>
					</div>

					<div className="settings-slider-row" style={{ borderBottom: "none" }}>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
								Penalización de Repetición (Repeat Penalty)
							</span>
							<span className="settings-slider-val">{appSettings.repeatPenalty}</span>
						</div>
						<input
							type="range"
							min="1"
							max="2"
							step="0.05"
							value={appSettings.repeatPenalty}
							onChange={(e) =>
								appSettings.updateSettings({ repeatPenalty: parseFloat(e.target.value) })
							}
						/>
					</div>
				</div>

				{/* Card 3: Endpoints, Autenticación & Debug */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "14px",
					}}
				>
					<h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
						Endpoints, Autenticación & Debug
					</h3>

					<div>
						<label
							htmlFor="agent-api-url-input"
							style={{
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--muted)",
								display: "block",
								marginBottom: "6px",
							}}
						>
							URL del Servicio del Agente (engine-agent-api)
						</label>
						<input
							id="agent-api-url-input"
							type="text"
							className="sidebar-search-input"
							style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}
							value={appSettings.apiUrl}
							onChange={(e) => appSettings.updateSettings({ apiUrl: e.target.value })}
							placeholder="http://localhost:3060"
						/>
					</div>

					<div>
						<label
							htmlFor="api-key-input"
							style={{
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--muted)",
								display: "block",
								marginBottom: "6px",
							}}
						>
							Clave API de engine-agent-api (x-api-key)
						</label>
						<input
							id="api-key-input"
							type="password"
							className="sidebar-search-input"
							style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}
							value={appSettings.apiKey}
							onChange={(e) => appSettings.updateSettings({ apiKey: e.target.value })}
							placeholder="llama-engine-dev"
						/>
					</div>

					<div>
						<label
							htmlFor="engine-url-input"
							style={{
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--muted)",
								display: "block",
								marginBottom: "6px",
							}}
						>
							URL de Inferencia Llama Engine (OpenAI /v1)
						</label>
						<input
							id="engine-url-input"
							type="text"
							className="sidebar-search-input"
							style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}
							value={appSettings.engineUrl}
							onChange={(e) => appSettings.updateSettings({ engineUrl: e.target.value })}
							placeholder="http://localhost:3050"
						/>
					</div>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							paddingTop: "8px",
							borderTop: "1px solid var(--border)",
						}}
					>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
								Logs de Depuración (Debug Logs)
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Registrar eventos detallados de WebSocket y tool calls en consola
							</div>
						</div>
						<label className="switch-control" aria-label="Logs de depuración">
							<input
								type="checkbox"
								checked={appSettings.debugLogs}
								onChange={(e) => appSettings.updateSettings({ debugLogs: e.target.checked })}
							/>
							<span className="switch-slider" />
						</label>
					</div>
				</div>

				{/* Card 4: Respaldo y Gestión de Conversaciones */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
						Respaldo y Gestión de Conversaciones
					</h3>

					{/* Exportar */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
							paddingBottom: "14px",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
								Exportar Conversaciones
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Descarga todas las sesiones e historial de mensajes en un archivo JSON.
							</div>
						</div>
						<button
							type="button"
							className="btn-secondary"
							onClick={handleExportConversations}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								padding: "7px 12px",
								fontSize: "12px",
								flexShrink: 0,
							}}
						>
							<DownloadIcon size={14} />
							<span>Exportar JSON</span>
						</button>
					</div>

					{/* Importar */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
							paddingBottom: "14px",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
								Importar Conversaciones
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Restaura sesiones desde un respaldo JSON previamente exportado.
							</div>
						</div>
						<label
							className="btn-secondary"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								padding: "7px 12px",
								fontSize: "12px",
								cursor: "pointer",
								flexShrink: 0,
							}}
						>
							<UploadIcon size={14} />
							<span>Importar JSON</span>
							<input
								type="file"
								accept=".json,.jsonl"
								onChange={handleImportConversations}
								style={{ display: "none" }}
							/>
						</label>
					</div>

					{/* Eliminar todas */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
						}}
					>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--danger)" }}>
								Eliminar Todas las Conversaciones ({sessions.length})
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Borra permanentemente todas las sesiones de chat. Esta acción no se puede deshacer.
							</div>
						</div>
						<button
							type="button"
							className="hitl-btn-deny"
							onClick={handleDeleteAllConversations}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								padding: "7px 12px",
								fontSize: "12px",
								flexShrink: 0,
							}}
						>
							<TrashIcon size={14} />
							<span>Borrar Todo</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
