import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	type AgentDefinition,
	createAgent,
	createSession,
	deleteAgent,
	deleteSkill,
	fetchAgents,
	fetchSkills,
	type Skill,
} from "../../../api.ts";
import {
	CodeIcon,
	DownloadIcon,
	SparklesIcon,
	TrashIcon,
	UploadIcon,
	WrenchIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import { DEFAULT_APP_SETTINGS, loadSettings, saveSettings } from "../../../lib/settings.ts";
import { useToast } from "../../../providers/ToastProvider.tsx";
import { useSessions } from "../../sessions/hooks/useSessions.ts";

interface SettingsModalProps {
	onClose: () => void;
}

type TabType = "chat" | "agents" | "skills";

export function SettingsModal({ onClose }: SettingsModalProps) {
	const { addToast } = useToast();
	const { sessions, removeSession, loadSessions } = useSessions();
	const [activeTab, setActiveTab] = useState<TabType>("chat");

	const initial = loadSettings();
	const [autoScroll, setAutoScroll] = useState(initial.autoScroll);
	const [streamResponses, setStreamResponses] = useState(initial.streamResponses);
	const [showMetrics, setShowMetrics] = useState(initial.showMetrics);
	const [expandReasoning, setExpandReasoning] = useState(initial.expandReasoning);
	const [temperature, setTemperature] = useState(initial.temperature);
	const [topP, setTopP] = useState(initial.topP);
	const [topK, setTopK] = useState(initial.topK);
	const [repeatPenalty, setRepeatPenalty] = useState(initial.repeatPenalty);
	const [apiUrl, setApiUrl] = useState(initial.apiUrl);
	const [engineUrl, setEngineUrl] = useState(initial.engineUrl);
	const [debugLogs, setDebugLogs] = useState(initial.debugLogs);
	const [agents, setAgents] = useState<AgentDefinition[]>([]);
	const [skills, setSkills] = useState<Skill[]>([]);
	const [newAgentName, setNewAgentName] = useState("");
	const [newAgentPrompt, setNewAgentPrompt] = useState("");

	const handleSave = () => {
		saveSettings({
			autoScroll,
			streamResponses,
			showMetrics,
			expandReasoning,
			temperature,
			topP,
			topK,
			repeatPenalty,
			apiUrl,
			engineUrl,
			debugLogs,
		});
		addToast("Configuración guardada correctamente", "success");
		onClose();
	};

	const handleReset = () => {
		setAutoScroll(DEFAULT_APP_SETTINGS.autoScroll);
		setStreamResponses(DEFAULT_APP_SETTINGS.streamResponses);
		setShowMetrics(DEFAULT_APP_SETTINGS.showMetrics);
		setExpandReasoning(DEFAULT_APP_SETTINGS.expandReasoning);
		setTemperature(DEFAULT_APP_SETTINGS.temperature);
		setTopP(DEFAULT_APP_SETTINGS.topP);
		setTopK(DEFAULT_APP_SETTINGS.topK);
		setRepeatPenalty(DEFAULT_APP_SETTINGS.repeatPenalty);
		setApiUrl(DEFAULT_APP_SETTINGS.apiUrl);
		setEngineUrl(DEFAULT_APP_SETTINGS.engineUrl);
		setDebugLogs(DEFAULT_APP_SETTINGS.debugLogs);
		saveSettings(DEFAULT_APP_SETTINGS);
		addToast("Valores restaurados por defecto", "info");
	};

	useEffect(() => {
		fetchAgents()
			.then((res) => {
				if (res && res.length > 0) setAgents(res);
			})
			.catch(() => {});
		fetchSkills()
			.then((res) => {
				if (res && res.length > 0) setSkills(res);
			})
			.catch(() => {});
	}, []);

	const handleExportConversations = () => {
		try {
			const exportData = JSON.stringify(sessions, null, 2);
			const blob = new Blob([exportData], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `llama-engine-conversations-${new Date().toISOString().slice(0, 10)}.json`;
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

	const handleDeleteAll = async () => {
		if (
			window.confirm(
				"¿Estás seguro de eliminar todas las conversaciones? Esta acción es permanente y no se puede deshacer.",
			)
		) {
			for (const s of sessions) {
				await removeSession(s.id);
			}
			addToast("Todas las conversaciones han sido eliminadas", "info");
			loadSessions();
		}
	};

	const handleCreateAgentSubmit = async () => {
		const name = newAgentName.trim();
		if (!name) return;
		try {
			const agent = await createAgent({
				name,
				corePrompt: newAgentPrompt,
				description: newAgentPrompt.slice(0, 60) || name,
				tools: [],
				model: "",
				maxIterations: 10,
				enabled: true,
			});
			if (agent) {
				setAgents((prev) => [...prev, agent]);
				setNewAgentName("");
				setNewAgentPrompt("");
				addToast(`Agente "${name}" creado exitosamente`, "success");
			}
		} catch (_err: unknown) {
			addToast("Error al crear el agente", "error");
		}
	};

	const handleDeleteAgent = async (agentName: string) => {
		try {
			await deleteAgent(agentName);
			setAgents((prev) => prev.filter((a) => a.name !== agentName));
			addToast(`Agente "${agentName}" eliminado`, "info");
		} catch {
			addToast("Error al eliminar agente", "error");
		}
	};

	const handleDeleteSkill = async (skillName: string) => {
		try {
			await deleteSkill(skillName);
			setSkills((prev) => prev.filter((s) => s.name !== skillName));
			addToast(`Habilidad "${skillName}" eliminada`, "info");
		} catch {
			addToast("Error al eliminar habilidad", "error");
		}
	};

	const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
		{ id: "chat", label: "Chat", icon: <WrenchIcon size={16} /> },
		{ id: "agents", label: "Agentes", icon: <SparklesIcon size={16} /> },
		{ id: "skills", label: "Habilidades", icon: <CodeIcon size={16} /> },
	];

	return createPortal(
		<div className="dialog-backdrop">
			<button
				type="button"
				className="dialog-backdrop-btn"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>
			<div
				className="dialog-card settings-dialog"
				style={{
					zIndex: 1,
					position: "relative",
					maxWidth: "760px",
					width: "90vw",
					height: "560px",
					padding: 0,
					display: "flex",
					flexDirection: "row",
					overflow: "hidden",
				}}
			>
				<div className="settings-sidebar">
					<div className="settings-sidebar-header">
						<SparklesIcon size={18} style={{ color: "var(--accent)" }} />
						<span>Settings</span>
					</div>
					<div className="settings-nav-list">
						{navItems.map((item) => (
							<button
								key={item.id}
								type="button"
								className={`settings-nav-item ${activeTab === item.id ? "active" : ""}`}
								onClick={() => setActiveTab(item.id)}
							>
								<span className="settings-nav-icon">{item.icon}</span>
								<span>{item.label}</span>
							</button>
						))}
					</div>
				</div>
				<div className="settings-content-area">
					<div className="settings-content-header">
						<span style={{ fontWeight: 600, fontSize: "16px" }}>
							{activeTab === "chat" ? "Chat" : "Agentes"}
						</span>
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
					<div className="settings-content-body">
						{activeTab === "chat" && (
							<>
								<div className="settings-section-container">
									<div className="settings-group">
										<div className="settings-group-title">General Preferences</div>
										<div className="settings-toggle-row">
											<div>
												<div className="settings-item-title">Auto-scroll to latest message</div>
												<div className="settings-item-desc">
													Automatically scroll down as new tokens and tool logs are generated.
												</div>
											</div>
											<input
												type="checkbox"
												checked={autoScroll}
												onChange={(e) => setAutoScroll(e.target.checked)}
												className="toggle-checkbox"
											/>
										</div>
										<div className="settings-toggle-row">
											<div>
												<div className="settings-item-title">Stream responses in real-time</div>
												<div className="settings-item-desc">
													Render markdown progressively over WebSocket connection.
												</div>
											</div>
											<input
												type="checkbox"
												checked={streamResponses}
												onChange={(e) => setStreamResponses(e.target.checked)}
												className="toggle-checkbox"
											/>
										</div>
									</div>
								</div>
								<div className="settings-section-container">
									<div className="settings-group">
										<div className="settings-group-title">Display & Performance</div>
										<div className="settings-toggle-row">
											<div>
												<div className="settings-item-title">Show token metrics & speed</div>
												<div className="settings-item-desc">
													Display token counts, inference duration (seconds), and generation speed
													(tokens/s).
												</div>
											</div>
											<input
												type="checkbox"
												checked={showMetrics}
												onChange={(e) => setShowMetrics(e.target.checked)}
												className="toggle-checkbox"
											/>
										</div>
										<div className="settings-toggle-row">
											<div>
												<div className="settings-item-title">Expand Reasoning by default</div>
												<div className="settings-item-desc">
													Keep model thinking process container open upon receiving messages.
												</div>
											</div>
											<input
												type="checkbox"
												checked={expandReasoning}
												onChange={(e) => setExpandReasoning(e.target.checked)}
												className="toggle-checkbox"
											/>
										</div>
									</div>
								</div>
								<div className="settings-section-container">
									<div className="settings-group">
										<div className="settings-group-title">Inference Parameters</div>
										<div className="settings-slider-row">
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<span className="settings-item-title">Temperature</span>
												<span className="settings-slider-val">{temperature}</span>
											</div>
											<input
												type="range"
												min="0"
												max="2"
												step="0.05"
												value={temperature}
												onChange={(e) => setTemperature(parseFloat(e.target.value))}
											/>
										</div>
										<div className="settings-slider-row">
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<span className="settings-item-title">Top-P</span>
												<span className="settings-slider-val">{topP}</span>
											</div>
											<input
												type="range"
												min="0"
												max="1"
												step="0.05"
												value={topP}
												onChange={(e) => setTopP(parseFloat(e.target.value))}
											/>
										</div>
										<div className="settings-slider-row">
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<span className="settings-item-title">Repeat Penalty</span>
												<span className="settings-slider-val">{repeatPenalty}</span>
											</div>
											<input
												type="range"
												min="1"
												max="2"
												step="0.05"
												value={repeatPenalty}
												onChange={(e) => setRepeatPenalty(parseFloat(e.target.value))}
											/>
										</div>
									</div>
								</div>
								<div className="settings-section-container">
									<div className="settings-group">
										<div className="settings-group-title">Agent Engine Settings</div>
										<div className="settings-item-desc" style={{ marginBottom: "12px" }}>
											Configura la autonomía, memoria vectorial SQLite y ejecución de herramientas
											locales.
										</div>
										<div className="settings-toggle-row">
											<div>
												<div className="settings-item-title">
													Herramientas Autónomas Habilitadas
												</div>
												<div className="settings-item-desc">
													Permitir al agente ejecutar lecturas, búsquedas de código y memoria.
												</div>
											</div>
											<input type="checkbox" defaultChecked className="toggle-checkbox" />
										</div>
									</div>
								</div>
								<div className="settings-section-container">
									<div className="settings-group">
										<div className="settings-group-title">Endpoints & Debug</div>
										<div className="settings-input-block">
											<span className="settings-item-title">Agent Service URL</span>
											<input
												type="text"
												className="sidebar-search-input"
												value={apiUrl}
												onChange={(e) => setApiUrl(e.target.value)}
											/>
										</div>
										<div className="settings-input-block">
											<span className="settings-item-title">Llama Engine API URL</span>
											<input
												type="text"
												className="sidebar-search-input"
												value={engineUrl}
												onChange={(e) => setEngineUrl(e.target.value)}
											/>
										</div>
									</div>
								</div>
								<div className="settings-section-container">
									<div className="settings-group">
										<div className="settings-group-title">Conversations</div>
										<div className="settings-row">
											<div>
												<div className="settings-item-title">Export</div>
												<div className="settings-item-desc">
													Download your conversations as a JSON file. This includes all messages,
													attachments, and conversation history.
												</div>
											</div>
											<button
												type="button"
												className="settings-action-btn"
												onClick={handleExportConversations}
											>
												<DownloadIcon size={15} />
												<span>Export conversations</span>
											</button>
										</div>
										<div className="settings-row">
											<div>
												<div className="settings-item-title">Import</div>
												<div className="settings-item-desc">
													Import one or more conversations from a previously exported JSON file.
													This will merge with your existing conversations.
												</div>
											</div>
											<label className="settings-action-btn" style={{ cursor: "pointer" }}>
												<UploadIcon size={15} />
												<span>Import conversations</span>
												<input
													type="file"
													accept=".json,.jsonl"
													onChange={handleImportConversations}
													style={{ display: "none" }}
												/>
											</label>
										</div>
										<div className="settings-row danger-row">
											<div>
												<div className="settings-item-title" style={{ color: "var(--danger)" }}>
													Delete All
												</div>
												<div className="settings-item-desc">
													Permanently delete all conversations and their messages. This action
													cannot be undone. Consider exporting your conversations first if you want
													to keep a backup.
												</div>
											</div>
											<button
												type="button"
												className="settings-danger-btn"
												onClick={handleDeleteAll}
											>
												<TrashIcon size={15} />
												<span>Delete all conversations</span>
											</button>
										</div>
									</div>
								</div>
							</>
						)}
						{activeTab === "agents" && (
							<div className="settings-section-container">
								<div className="settings-group">
									<div className="settings-group-title">Agentes</div>
									<div className="settings-item-desc" style={{ marginBottom: "12px" }}>
										Gestiona agentes especializados que pueden ejecutar tareas con prompts y
										herramientas configuradas específicamente.
									</div>
									{agents.map((a) => (
										<div key={a.name} className="settings-row">
											<div>
												<div className="settings-item-title">{a.name}</div>
												<div className="settings-item-desc">{a.description}</div>
											</div>
											<button
												type="button"
												className="session-action-btn"
												title="Eliminar agente"
												onClick={() => handleDeleteAgent(a.name)}
											>
												<TrashIcon size={14} />
											</button>
										</div>
									))}
									<div className="settings-input-block" style={{ marginTop: "12px" }}>
										<span className="settings-item-title">Nuevo Agente</span>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "8px",
												marginTop: "4px",
											}}
										>
											<input
												type="text"
												className="sidebar-search-input"
												placeholder="Nombre del agente"
												value={newAgentName}
												onChange={(e) => setNewAgentName(e.target.value)}
											/>
											<textarea
												className="sidebar-search-input"
												placeholder="System prompt / instrucciones del agente"
												value={newAgentPrompt}
												onChange={(e) => setNewAgentPrompt(e.target.value)}
												rows={2}
												style={{ resize: "vertical", height: "auto" }}
											/>
											<button
												type="button"
												className="btn-primary"
												style={{ alignSelf: "flex-end" }}
												disabled={!newAgentName.trim()}
												onClick={handleCreateAgentSubmit}
											>
												Crear Agente
											</button>
										</div>
									</div>
								</div>
							</div>
						)}
						{activeTab === "skills" && (
							<div className="settings-section-container">
								<div className="settings-group">
									<div className="settings-group-title">Habilidades (Skills)</div>
									<div className="settings-item-desc" style={{ marginBottom: "12px" }}>
										Habilidades modulares ejecutables por los agentes para tareas complejas o
										repetitivas.
									</div>
									{skills.length === 0 ? (
										<div className="sidebar-empty">No hay habilidades registradas</div>
									) : (
										skills.map((s) => (
											<div key={s.name} className="settings-row">
												<div>
													<div className="settings-item-title">{s.name}</div>
													<div className="settings-item-desc">{s.description}</div>
													{s.tags && s.tags.length > 0 && (
														<div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
															{s.tags.map((t) => (
																<span key={t} className="stat-pill" style={{ fontSize: "10px" }}>
																	{t}
																</span>
															))}
														</div>
													)}
												</div>
												<button
													type="button"
													className="session-action-btn"
													title="Eliminar habilidad"
													onClick={() => handleDeleteSkill(s.name)}
												>
													<TrashIcon size={14} />
												</button>
											</div>
										))
									)}
								</div>
							</div>
						)}
					</div>
					<div className="settings-content-footer">
						<button type="button" className="btn-secondary" onClick={handleReset}>
							Reset to default
						</button>
						<button type="button" className="btn-primary" onClick={handleSave}>
							Save settings
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
