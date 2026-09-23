import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTools, type AgentDefinition } from "../../../api.ts";
import {
	MicIcon,
	PlusIcon,
	SendIcon,
	SlidersIcon,
	StopIcon,
	WrenchIcon,
	SparklesIcon,
	CheckIcon,
} from "../../../components/ui/Icons.tsx";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.ts";
import { AttachMenu } from "./AttachMenu.tsx";
import { type FileAttachment, FileUpload, useFileUpload } from "./FileUpload.tsx";
import { MCPServersModal } from "./MCPServersModal.tsx";
import {
	DEFAULT_MODEL_SETTINGS,
	type ModelSettings,
	ModelSettingsModal,
} from "./ModelSettingsModal.tsx";
import { SystemPromptModal } from "./SystemPromptModal.tsx";
import { type ToolConfig, ToolSelector } from "./ToolSelector.tsx";

interface ComposerProps {
	onSend: (
		text: string,
		attachments: FileAttachment[],
		options?: {
			systemPrompt?: string;
			enabledTools?: string[];
			modelSettings?: ModelSettings;
			agent?: string;
		},
	) => void;
	onStop: () => void;
	disabled: boolean;
	model?: string;
	tokenCount?: number;
	agent?: string;
	agents?: AgentDefinition[];
	onAgentChange?: (agent: string | undefined) => void;
}

const DEFAULT_TOOLS: ToolConfig[] = [
	{ name: "bash", label: "Bash Terminal", enabled: true },
	{ name: "read_file", label: "Read File", enabled: true },
	{ name: "write_file", label: "Write File", enabled: true },
	{ name: "edit_file", label: "Edit File", enabled: true },
	{ name: "glob_search", label: "Glob Search", enabled: true },
	{ name: "grep_search", label: "Grep Search", enabled: true },
	{ name: "memorize", label: "Memorize", enabled: true },
	{ name: "search_memories", label: "Search Memories", enabled: true },
];

export function Composer({
	onSend,
	onStop,
	disabled,
	model = "qwen3.5",
	tokenCount = 0,
	agent,
	agents: agentsProp,
	onAgentChange,
}: ComposerProps) {
	const [text, setText] = useState("");
	const [showAttachMenu, setShowAttachMenu] = useState(false);
	const [showToolSelector, setShowToolSelector] = useState(false);
	const [showSystemPrompt, setShowSystemPrompt] = useState(false);
	const [showMCPServers, setShowMCPServers] = useState(false);
	const [showModelSettings, setShowModelSettings] = useState(false);
	const [showAgentMenu, setShowAgentMenu] = useState(false);
	const [modelSettings, setModelSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
	const [systemPrompt, setSystemPrompt] = useState(
		`Sos un asistente de IA inteligente, empático y servicial.

## Comportamiento
- Respondés con claridad, precisión y un tono profesional pero cercano.
- Preferís respuestas concisas; solo extendés cuando el usuario pide detalle.
- Si no sabés algo, lo decís honestamente en lugar de inventar.

## Herramientas
Tenés acceso a herramientas de shell, archivos y memoria. Usalas proactivamente cuando resuelvan mejor la tarea:
- **bash**: Ejecutá comandos para verificar, compilar, testear o diagnosticar. Siempre mostrá el resultado relevante.
- **read_file / write_file / edit_file**: Leé y modificá archivos directamente en lugar de solo sugerir cambios.
- **glob_search / grep_search**: Buscá en el código antes de asumir sobre la estructura o contenido del proyecto.
- **memorize / search_memories**: Guardá datos relevantes del usuario (nombre, preferencias, contexto del proyecto) y consultalos al inicio de cada conversación.

## Formato
- Usá markdown para código, listas y estructura.
- En respuestas técnicas, incluí el archivo y línea de referencia cuando sea posible.
- Si modificás archivos, explicá brevemente qué cambiaste y por qué.`,
	);
	const [tools, setTools] = useState(DEFAULT_TOOLS);
	const [attachments, setAttachments] = useState<FileAttachment[]>([]);
	const [selectedAgent, setSelectedAgent] = useState(agent);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const agentMenuRef = useRef<HTMLDivElement>(null);
	const { processFiles } = useFileUpload();
	const {
		listening,
		transcript,
		isSupported,
		start: startListening,
		stop: stopListening,
		reset: resetTranscript,
	} = useSpeechRecognition();

	// Merge external agents prop with state
	const agents = agentsProp ?? [];

	// Sync external agent prop
	useEffect(() => {
		if (agent !== undefined) {
			setSelectedAgent(agent);
		}
	}, [agent]);

	// Fetch dynamic tools from agent backend API
	useEffect(() => {
		fetchTools()
			.then((serverTools) => {
				if (serverTools && serverTools.length > 0) {
					setTools(
						serverTools.map((st) => ({
							name: st.name,
							label: st.description || st.name,
							enabled: st.enabled ?? true,
						})),
					);
				}
			})
			.catch(() => {
				// Fallback to default tools
			});
	}, []);

	// Sync speech transcript into textarea
	useEffect(() => {
		if (listening && transcript) {
			setText(transcript);
		}
	}, [listening, transcript]);

	// Auto-resize textarea according to scrollHeight and text content
	useEffect(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			const nextHeight = Math.min(textarea.scrollHeight, 200);
			textarea.style.height = `${Math.max(nextHeight, 24)}px`;
			if (text.length >= 0) {
				// text tracked
			}
		}
	}, [text]);

	// Close agent menu on outside click
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
				setShowAgentMenu(false);
			}
		}
		if (showAgentMenu) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [showAgentMenu]);

	const handleSend = useCallback(() => {
		const trimmed = text.trim();
		if (!trimmed && attachments.length === 0) return;
		if (disabled) return;
		if (listening) {
			stopListening();
			resetTranscript();
		}
		const enabledTools = tools.filter((t) => t.enabled).map((t) => t.name);
		onSend(trimmed, attachments, {
			systemPrompt,
			enabledTools,
			modelSettings,
			agent: selectedAgent,
		});
		setText("");
		setAttachments([]);
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, [
		text,
		attachments,
		disabled,
		onSend,
		systemPrompt,
		tools,
		modelSettings,
		listening,
		stopListening,
		resetTranscript,
		selectedAgent,
	]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	const handleFiles = useCallback(
		async (fileList: FileList) => {
			const newAttachments = await processFiles(fileList);
			setAttachments((prev) => [...prev, ...newAttachments]);
		},
		[processFiles],
	);

	const handleToggleTool = useCallback((name: string) => {
		setTools((prev) => prev.map((t) => (t.name === name ? { ...t, enabled: !t.enabled } : t)));
	}, []);

	const handleAddFiles = useCallback(() => {
		setShowAttachMenu(false);
		const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
		input?.click();
	}, []);

	const handleMicToggle = useCallback(() => {
		if (listening) {
			stopListening();
		} else {
			startListening();
		}
	}, [listening, startListening, stopListening]);

	const handleSystemMessage = useCallback(() => {
		setShowAttachMenu(false);
		setShowSystemPrompt(true);
	}, []);

	const handleMCPServers = useCallback(() => {
		setShowAttachMenu(false);
		setShowMCPServers(true);
	}, []);

	const activeToolsCount = tools.filter((t) => t.enabled).length;

	return (
		<div className="composer-outer">
			<div className="composer-box">
				{showSystemPrompt && (
					<SystemPromptModal
						prompt={systemPrompt}
						onSave={setSystemPrompt}
						onClose={() => setShowSystemPrompt(false)}
					/>
				)}

				{showMCPServers && <MCPServersModal onClose={() => setShowMCPServers(false)} />}

				{showModelSettings && (
					<ModelSettingsModal
						settings={modelSettings}
						modelName={model}
						onSave={(newSettings) => setModelSettings(newSettings)}
						onClose={() => setShowModelSettings(false)}
					/>
				)}

				{showToolSelector && (
					<ToolSelector
						tools={tools}
						onToggle={handleToggleTool}
						onClose={() => setShowToolSelector(false)}
					/>
				)}

				{showAttachMenu && (
					<AttachMenu
						onAddFiles={handleAddFiles}
						onSystemMessage={handleSystemMessage}
						onMCPServers={handleMCPServers}
						onClose={() => setShowAttachMenu(false)}
					/>
				)}

				<FileUpload
					attachments={attachments}
					onAdd={handleFiles}
					onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
				/>

				<div className="composer-input-row">
					<textarea
						ref={textareaRef}
						className={`composer-textarea ${listening ? "listening" : ""}`}
						placeholder={
							listening
								? "Escuchando... hablá ahora"
								: "Escribe un mensaje o usa las herramientas del agente..."
						}
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={disabled}
						rows={1}
					/>
				</div>

				<div className="composer-bottom-row">
					<div className="composer-bottom-left">
						<button
							type="button"
							className="composer-btn-icon"
							onClick={() => {
								setShowToolSelector(false);
								setShowAttachMenu(!showAttachMenu);
							}}
							title="Adjuntar y opciones"
						>
							<PlusIcon size={18} />
						</button>

						{isSupported && (
							<button
								type="button"
								className={`composer-btn-icon ${listening ? "recording" : ""}`}
								onClick={handleMicToggle}
								disabled={disabled}
								title={listening ? "Detener grabación" : "Grabar audio"}
							>
								<MicIcon size={16} />
							</button>
						)}

						{/* Agent Selector */}
						<div
							style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative" }}
							ref={agentMenuRef}
						>
							<button
								type="button"
								className="composer-btn-icon"
								onClick={() => {
									setShowAttachMenu(false);
									setShowAgentMenu(!showAgentMenu);
								}}
								title="Seleccionar agente"
								style={{
									position: "relative",
									color: selectedAgent ? "var(--accent)" : "inherit",
								}}
							>
								<SparklesIcon size={16} />
							</button>
							{showAgentMenu && agents.length > 0 && (
								<div
									className="popover-menu"
									style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: "4px" }}
								>
									{agents.map((a) => (
										<div
											key={a.name}
											className={`popover-item ${selectedAgent === a.name ? "active-model-item" : ""}`}
											onClick={() => {
												setSelectedAgent(a.name);
												setShowAgentMenu(false);
												onAgentChange?.(a.name);
											}}
										>
											<span style={{ fontWeight: 600 }}>{a.name}</span>
											{selectedAgent === a.name && (
												<CheckIcon size={14} style={{ color: "var(--accent)" }} />
											)}
										</div>
									))}
									<div
										className={`popover-item ${!selectedAgent ? "active-model-item" : ""}`}
										onClick={() => {
											setSelectedAgent(undefined);
											setShowAgentMenu(false);
											onAgentChange?.(undefined);
										}}
									>
										<span>Default</span>
										{!selectedAgent && <CheckIcon size={14} style={{ color: "var(--accent)" }} />}
									</div>
								</div>
							)}
						</div>

						<button
							type="button"
							className="composer-btn-icon"
							onClick={() => {
								setShowAttachMenu(false);
								setShowToolSelector(!showToolSelector);
							}}
							title="Configuración de herramientas"
							style={{
								position: "relative",
								color: activeToolsCount > 0 ? "var(--accent)" : "inherit",
							}}
						>
							<WrenchIcon size={16} />
						</button>

						<button
							type="button"
							className="composer-btn-icon"
							onClick={() => {
								setShowAttachMenu(false);
								setShowToolSelector(false);
								setShowModelSettings(true);
							}}
							title="Parámetros del modelo y razonamiento"
							style={{
								position: "relative",
								color: modelSettings.enableReasoning ? "var(--ai-spark)" : "inherit",
							}}
						>
							<SlidersIcon size={16} />
						</button>
					</div>

					<div className="composer-bottom-right">
						<span
							style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}
						>
							{model}
						</span>
						{tokenCount > 0 && <span className="token-badge">{tokenCount} tokens</span>}

						<button
							type="button"
							className={`send-action-btn ${disabled ? "stop" : ""}`}
							onClick={disabled ? onStop : handleSend}
							disabled={!disabled && !text.trim() && attachments.length === 0}
							title={disabled ? "Detener respuesta" : "Enviar mensaje (Enter)"}
						>
							{disabled ? <StopIcon size={14} /> : <SendIcon size={16} />}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
