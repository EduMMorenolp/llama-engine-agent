import { useCallback, useEffect, useRef, useState } from "react";
import { createMemory, fetchTools } from "../../../api.ts";
import {
	ForkIcon,
	LightbulbIcon,
	MicIcon,
	PlusIcon,
	SearchIcon,
	SendIcon,
	SlidersIcon,
	SparklesIcon,
	StopIcon,
	WrenchIcon,
} from "../../../components/ui/Icons.tsx";
import { useAppSettings } from "../../../lib/useAppSettings.ts";
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
		},
	) => void;
	onStop: () => void;
	disabled: boolean;
	model?: string;
	tokenCount?: number;
	draftText?: string;
	onDraftTextChange?: (text: string) => void;
}

const DEFAULT_TOOLS: ToolConfig[] = [
	{ name: "web_search", label: "Web Search & Weather", enabled: true },
	{ name: "web_fetch", label: "Web Fetch URL", enabled: true },
	{ name: "list_skills", label: "List Skills", enabled: true },
	{ name: "load_skill", label: "Load Skill", enabled: true },
	{ name: "create_skill", label: "Create Skill", enabled: true },
	{ name: "update_skill", label: "Update Skill", enabled: true },
	{ name: "delete_skill", label: "Delete Skill", enabled: true },
	{ name: "bash", label: "Bash Terminal", enabled: true },
	{ name: "read_file", label: "Read File", enabled: true },
	{ name: "write_file", label: "Write File", enabled: true },
	{ name: "edit_file", label: "Edit File", enabled: true },
	{ name: "glob_search", label: "Glob Search", enabled: true },
	{ name: "grep_search", label: "Grep Search", enabled: true },
	{ name: "memorize", label: "Memorize", enabled: true },
	{ name: "search_memories", label: "Search Memories", enabled: true },
];

interface SlashCommand {
	name: string;
	desc: string;
	usage: string;
	icon: React.ReactNode;
}

const SLASH_COMMANDS: SlashCommand[] = [
	{
		name: "web",
		desc: "Buscar información o clima en internet",
		usage: "/web <consulta>",
		icon: <SearchIcon size={14} />,
	},
	{
		name: "memo",
		desc: "Guardar una memoria persistente",
		usage: "/memo <texto a recordar>",
		icon: <LightbulbIcon size={14} />,
	},
	{
		name: "skill",
		desc: "Consultar o ejecutar una skill",
		usage: "/skill <nombre>",
		icon: <WrenchIcon size={14} />,
	},
	{ name: "clear", desc: "Comenzar un chat nuevo", usage: "/clear", icon: <PlusIcon size={14} /> },
	{
		name: "fork",
		desc: "Bifurcar la conversación activa",
		usage: "/fork",
		icon: <ForkIcon size={14} />,
	},
	{
		name: "theme",
		desc: "Alternar entre tema oscuro y claro",
		usage: "/theme",
		icon: <SparklesIcon size={14} />,
	},
];

export function Composer({
	onSend,
	onStop,
	disabled,
	model = "qwen3.5",
	tokenCount = 0,
	draftText,
	onDraftTextChange,
}: ComposerProps) {
	const appSettings = useAppSettings();
	const [text, setText] = useState(draftText || "");
	const [showAttachMenu, setShowAttachMenu] = useState(false);
	const [showToolSelector, setShowToolSelector] = useState(false);
	const [showSystemPrompt, setShowSystemPrompt] = useState(false);
	const [showMCPServers, setShowMCPServers] = useState(false);
	const [showModelSettings, setShowModelSettings] = useState(false);
	const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
	const [modelSettings, setModelSettings] = useState<ModelSettings>({
		...DEFAULT_MODEL_SETTINGS,
		temperature: appSettings.temperature,
		topP: appSettings.topP,
	});

	const isSlashQuery = text.startsWith("/") && !text.includes(" ");
	const filteredSlashCommands = isSlashQuery
		? SLASH_COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith(text.slice(1).toLowerCase()))
		: [];
	const showSlashMenu = isSlashQuery && filteredSlashCommands.length > 0;

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset slash selection when text changes
	useEffect(() => {
		setSlashSelectedIndex(0);
	}, [text]);

	useEffect(() => {
		if (draftText !== undefined) {
			setText(draftText);
			if (draftText) {
				textareaRef.current?.focus();
			}
		}
	}, [draftText]);
	const [systemPrompt, setSystemPrompt] = useState(
		`Sos un asistente de IA inteligente, empático y servicial.

## Comportamiento
- Respondés con claridad, precisión y un tono profesional pero cercano.
- Preferís respuestas concisas; solo extendés cuando el usuario pide detalle.
- Si no sabés algo, lo decís honestamente en lugar de inventar.

## Herramientas
Tenés acceso a herramientas de búsqueda web, skills, shell, archivos y memoria. Usalas proactivamente cuando resuelvan mejor la tarea:
- **web_search / web_fetch**: Buscá información en tiempo real en internet (clima actual y pronóstico, noticias, documentación, URLs) cuando el usuario consulte datos actuales o externos.
- **list_skills / load_skill / create_skill / update_skill / delete_skill**: Listá las skills disponibles con list_skills (o load_skill), cargá sus instrucciones con load_skill o creá nuevas skills con create_skill.
- **bash**: Ejecutá comandos para verificar, compilar, testear o diagnosticar. Siempre mostrá el resultado relevante.
- **read_file / write_file / edit_file**: Leé y modificá archivos directamente en lugar de solo sugerir cambios.
- **glob_search / grep_search**: Buscá en el código antes de asumir sobre la estructura o contenido del proyecto.
- **memorize / search_memories**: Guardá datos relevantes nuevos del usuario (nombre, preferencias, contexto del proyecto) cuando te los comparta. No llames herramientas en saludos simples o preguntas generales que puedas responder directamente.

## Formato
- Usá markdown para código, listas y estructura.
- En respuestas técnicas, incluí el archivo y línea de referencia cuando sea posible.
- Si modificás archivos, explicá brevemente qué cambiaste y por qué.`,
	);
	const [tools, setTools] = useState(DEFAULT_TOOLS);
	const [attachments, setAttachments] = useState<FileAttachment[]>([]);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const { processFiles } = useFileUpload();
	const {
		listening,
		transcript,
		isSupported,
		start: startListening,
		stop: stopListening,
		reset: resetTranscript,
	} = useSpeechRecognition();
	const textBeforeListeningRef = useRef("");

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

	// Sync speech transcript into textarea (preserves existing draft)
	useEffect(() => {
		if (listening && transcript) {
			const prefix = textBeforeListeningRef.current ? `${textBeforeListeningRef.current} ` : "";
			const newText = prefix + transcript;
			setText(newText);
			onDraftTextChange?.(newText);
		}
	}, [listening, transcript, onDraftTextChange]);

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

	const handleSend = useCallback(() => {
		const trimmed = text.trim();
		if (!trimmed && attachments.length === 0) return;
		if (disabled) return;
		if (listening) {
			stopListening();
			resetTranscript();
		}
		let finalMsg = trimmed;
		let toolsToSend = tools.filter((t) => t.enabled).map((t) => t.name);

		if (trimmed.startsWith("/web ")) {
			finalMsg = `[Búsqueda Web Solicitada]: ${trimmed.slice(5).trim()}`;
			if (!toolsToSend.includes("web_search")) {
				toolsToSend = [...toolsToSend, "web_search", "web_fetch"];
			}
		} else if (trimmed.startsWith("/memo ")) {
			const noteContent = trimmed.slice(6).trim();
			createMemory(`nota_${Date.now()}`, noteContent, ["nota", "manual"]).catch(() => {});
			finalMsg = `Memorizá esta nota personal para futuras consultas: "${noteContent}"`;
		} else if (trimmed.startsWith("/skill ")) {
			finalMsg = `Activá y ejecutá la skill "${trimmed.slice(7).trim()}"`;
			if (!toolsToSend.includes("load_skill")) {
				toolsToSend = [...toolsToSend, "load_skill", "list_skills"];
			}
		}

		onSend(finalMsg, attachments, {
			systemPrompt,
			enabledTools: toolsToSend,
			modelSettings,
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
	]);

	const handleSelectSlashCommand = useCallback(
		(cmd: SlashCommand) => {
			if (cmd.name === "theme") {
				appSettings.updateSettings({ theme: appSettings.theme === "dark" ? "light" : "dark" });
				setText("");
				onDraftTextChange?.("");
			} else if (cmd.name === "clear") {
				window.dispatchEvent(new CustomEvent("trigger_new_chat"));
				setText("");
				onDraftTextChange?.("");
			} else if (cmd.name === "fork") {
				window.dispatchEvent(new CustomEvent("trigger_fork_chat"));
				setText("");
				onDraftTextChange?.("");
			} else {
				const nextText = `/${cmd.name} `;
				setText(nextText);
				onDraftTextChange?.(nextText);
				textareaRef.current?.focus();
			}
		},
		[appSettings, onDraftTextChange],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (showSlashMenu) {
				if (e.key === "ArrowDown") {
					e.preventDefault();
					setSlashSelectedIndex((prev) => (prev + 1) % filteredSlashCommands.length);
					return;
				}
				if (e.key === "ArrowUp") {
					e.preventDefault();
					setSlashSelectedIndex(
						(prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length,
					);
					return;
				}
				if (e.key === "Enter" || e.key === "Tab") {
					e.preventDefault();
					const selected = filteredSlashCommands[slashSelectedIndex];
					if (selected) {
						handleSelectSlashCommand(selected);
					}
					return;
				}
				if (e.key === "Escape") {
					e.preventDefault();
					setText("");
					return;
				}
			}

			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[
			showSlashMenu,
			filteredSlashCommands,
			slashSelectedIndex,
			handleSelectSlashCommand,
			handleSend,
		],
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
			textBeforeListeningRef.current = text.trim();
			resetTranscript();
			startListening();
		}
	}, [listening, startListening, stopListening, resetTranscript, text]);

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

				{/* Slash Commands Popover */}
				{showSlashMenu && (
					<div
						className="popover-menu slash-commands-popover"
						style={{
							position: "absolute",
							bottom: "calc(100% + 8px)",
							left: "12px",
							right: "12px",
							maxHeight: "220px",
							overflowY: "auto",
							zIndex: 50,
							boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.4)",
						}}
					>
						<div className="popover-header" style={{ padding: "6px 12px", fontSize: "11px" }}>
							<span>Comandos rápidos disponibles (Enter o Tab para autocompletar)</span>
						</div>
						{filteredSlashCommands.map((cmd, idx) => {
							const isSelected = idx === slashSelectedIndex;
							return (
								<button
									key={cmd.name}
									type="button"
									className={`popover-item ${isSelected ? "active" : ""}`}
									onClick={() => handleSelectSlashCommand(cmd)}
									onMouseEnter={() => setSlashSelectedIndex(idx)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										padding: "8px 12px",
										background: isSelected ? "var(--bg-surface-active)" : "transparent",
									}}
								>
									<span style={{ color: "var(--accent)", flexShrink: 0 }}>{cmd.icon}</span>
									<div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
												/{cmd.name}
											</span>
											<span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
												{cmd.usage}
											</span>
										</div>
										<div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{cmd.desc}</div>
									</div>
								</button>
							);
						})}
					</div>
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
						onChange={(e) => {
							setText(e.target.value);
							onDraftTextChange?.(e.target.value);
						}}
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
