import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { fetchAvailableModels, type Message, type ModelInfo } from "../../../api.ts";
import logoImg from "../../../assets/logo.jpg";
import {
	ArrowDownIcon,
	FileCodeIcon,
	SearchIcon,
	SparklesIcon,
	TerminalIcon,
} from "../../../components/ui/Icons.tsx";
import {
	getNotificationPermission,
	notifyAgentFinished,
	requestNotificationPermission,
} from "../../../lib/notifications.ts";
import { getAgentForSession, setAgentForSession } from "../../../lib/session-agents.ts";
import { useAppSettings } from "../../../lib/useAppSettings.ts";
import { useToast } from "../../../providers/ToastProvider.tsx";
import { useSessions } from "../../sessions/hooks/useSessions.ts";
import { useChat } from "../hooks/useChat.ts";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.ts";
import { type ArtifactData, ArtifactPanel } from "./ArtifactPanel.tsx";
import { ChatInspector } from "./ChatInspector.tsx";
import { ChatSubSidebar } from "./ChatSubSidebar.tsx";
import { CommandPaletteModal } from "./CommandPaletteModal.tsx";
import { Composer } from "./Composer.tsx";
import type { FileAttachment } from "./FileUpload.tsx";
import { MemoriesModal } from "./MemoriesModal.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { ModelInfoModal } from "./ModelInfoModal.tsx";
import type { ModelSettings } from "./ModelSettingsModal.tsx";
import { SystemPromptModal } from "./SystemPromptModal.tsx";
import { VoiceOrb } from "./VoiceOrb.tsx";

interface LayoutContextType {
	inspectorOpen?: boolean;
	toggleInspector?: () => void;
	subSidebarOpen?: boolean;
	toggleSubSidebar?: () => void;
	selectedModel?: string;
	models?: ModelInfo[];
}

const FALLBACK_MODELS: ModelInfo[] = [
	{
		id: "qwen3.5-9b",
		name: "Qwen 3.5 9B",
		desc: "Texto · 4.7 GB GGUF",
		badge: "Activo",
		loaded: true,
	},
	{
		id: "qwen3.5-4b",
		name: "Qwen 3.5 4B",
		desc: "Multimodal (visión) · 2.6 GB GGUF",
		badge: "Visión",
		vision: true,
	},
	{
		id: "gemma-4-e4b",
		name: "Gemma 4 E4B",
		desc: "Multimodal (visión) · 4.8 GB GGUF",
		badge: "Visión",
		vision: true,
	},
	{
		id: "mistral-small-7b",
		name: "Mistral Small 7B",
		desc: "Texto · 4.1 GB GGUF",
		badge: "Texto",
	},
	{
		id: "phi-4-mini",
		name: "Phi 4 Mini",
		desc: "Texto · 2.3 GB GGUF",
		badge: "Compacto",
	},
];

const STARTER_PROMPTS = [
	{
		icon: <FileCodeIcon size={18} />,
		title: "Analizar arquitectura",
		desc: "Revisar la estructura del proyecto y proponer mejoras modulares",
		prompt:
			"Analiza la arquitectura de este proyecto y sugiere mejoras de rendimiento, escalabilidad y patrones de diseño limpios.",
	},
	{
		icon: <TerminalIcon size={18} />,
		title: "Automatización & Bash",
		desc: "Generar scripts de desarrollo o pipelines locales",
		prompt:
			"Escribe un script automatizado para compilar, probar y verificar el estado del proyecto.",
	},
	{
		icon: <SearchIcon size={18} />,
		title: "Búsqueda & Depuración",
		desc: "Investigar errores y proponer soluciones robustas",
		prompt:
			"Ayúdame a diagnosticar posibles errores de concurrencia y optimizaciones de memoria en el sistema.",
	},
	{
		icon: <SparklesIcon size={18} />,
		title: "Diseño & Experiencia UX",
		desc: "Idear interfaces modernas y accesibles",
		prompt:
			"Diseña una interfaz moderna con micro-interacciones, tema oscuro y estética vanguardista.",
	},
];

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatView() {
	const { addToast } = useToast();
	const {
		sessions,
		activeSessionId,
		messages,
		addMessage,
		createNewSession,
		selectSession,
		removeSession,
		togglePinSession,
		forkSession,
		deleteMessage,
		toggleFavoriteMessage,
		refreshSessions,
		loading: sessionsLoading,
		hasMore,
		loadingMore,
		loadMoreMessages,
	} = useSessions();
	const { streaming, currentContent, toolCalls, sendMessage, stopStreaming } = useChat();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const outletContext = useOutletContext<LayoutContextType>() ?? {};
	const subSidebarOpen = outletContext.subSidebarOpen ?? true;
	const toggleSubSidebar = outletContext.toggleSubSidebar ?? (() => {});
	const inspectorOpen = outletContext.inspectorOpen ?? false;
	const toggleInspector = outletContext.toggleInspector ?? (() => {});

	const appSettings = useAppSettings();
	const [, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
	const [localSelectedModel, setSelectedModel] = useState("qwen3.5-4b");
	const selectedModel = outletContext.selectedModel || localSelectedModel;
	const [enabledTools, setEnabledTools] = useState<string[]>([
		"web_search",
		"web_fetch",
		"execute_bash",
		"bash",
		"read_file",
		"write_file",
		"edit_file",
		"glob_search",
		"grep_search",
		"list_skills",
		"load_skill",
		"create_skill",
		"update_skill",
		"delete_skill",
		"memorize",
		"search_memories",
		"update_memory",
		"reflect",
		"mcp",
	]);

	const handleToggleTool = (toolName: string) => {
		setEnabledTools((prev) =>
			prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName],
		);
	};

	useEffect(() => {
		const draftParam = searchParams.get("draft");
		const agentParam = searchParams.get("agent");
		if (draftParam) {
			setDraftText(draftParam);
		}
		if (agentParam && activeSessionId) {
			setAgentForSession(activeSessionId, agentParam);
			window.dispatchEvent(
				new CustomEvent("agent_session_changed", {
					detail: { sessionId: activeSessionId, agentId: agentParam },
				}),
			);
		}
		if (draftParam || (agentParam && activeSessionId)) {
			setSearchParams({}, { replace: true });
		}
	}, [searchParams, activeSessionId, setSearchParams]);
	const { speak, stop: stopSpeaking, speaking, currentSpeakingId } = useSpeechSynthesis();
	const [selectedArtifact, setSelectedArtifact] = useState<ArtifactData | null>(null);
	const [messageVariants, setMessageVariants] = useState<Record<string, string[]>>({});
	const [activeVariantIndices, setActiveVariantIndices] = useState<Record<string, number>>({});
	const [selectedModelInfo, setSelectedModelInfo] = useState<ModelInfo | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [customSystemPrompt, setCustomSystemPrompt] = useState("");
	const [showMemories, setShowMemories] = useState(false);
	const [showCommandPalette, setShowCommandPalette] = useState(false);
	const [showScrollBottom, setShowScrollBottom] = useState(false);
	const [draftText, setDraftText] = useState("");

	const prevSessionIdRef = useRef<string | null>(null);
	const prevMessagesCountRef = useRef<number>(0);
	const handleSendRef = useRef<(text: string, attachments: FileAttachment[]) => Promise<void>>(() =>
		Promise.resolve(),
	);
	const handleExportRef = useRef<(format: "markdown" | "json") => void>(() => {});

	const handleExport = (format: "markdown" | "json") => {
		if (messages.length === 0) {
			addToast("No hay mensajes para exportar", "info");
			return;
		}
		let blob: Blob;
		let filename: string;
		const activeSession = sessions.find((s) => s.id === activeSessionId);
		const sessionTitle = activeSession?.name || `chat-${activeSessionId?.slice(0, 8) || "session"}`;

		if (format === "markdown") {
			const mdContent = messages
				.map((m) => {
					const roleName =
						m.role === "user"
							? "### 👤 Usuario"
							: m.role === "assistant"
								? "### 🤖 Asistente"
								: `### ⚙️ Herramienta (${m.role})`;
					return `${roleName}\n\n${m.content || ""}\n`;
				})
				.join("\n---\n\n");
			blob = new Blob([`# ${sessionTitle}\n\n${mdContent}`], {
				type: "text/markdown;charset=utf-8",
			});
			filename = `${sessionTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
		} else {
			const jsonContent = JSON.stringify({ session: activeSession, messages }, null, 2);
			blob = new Blob([jsonContent], { type: "application/json;charset=utf-8" });
			filename = `${sessionTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
		}

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		addToast(`Sesión exportada como ${format.toUpperCase()}`, "success");
	};
	handleExportRef.current = handleExport;

	// Load models from llama.cpp / engine-api
	useEffect(() => {
		fetchAvailableModels()
			.then((res) => {
				if (res?.models && res.models.length > 0) {
					setModels(res.models);
					const defaultActive = res.models.find((m) => m.loaded) || res.models[0];
					if (defaultActive) {
						setSelectedModel(defaultActive.id);
					}
				}
			})
			.catch(() => {
				// Fallback to static model list
			});
	}, []);

	// Custom slash events & export events
	useEffect(() => {
		const handleNewChatEvent = () => createNewSession();
		const handleForkChatEvent = () => {
			if (activeSessionId) {
				forkSession("");
			}
		};
		const handleCompactContextEvent = () => {
			handleSendRef.current(
				"/compact Por favor resume y compacta la conversación anterior extrayendo los hechos, acuerdos y conclusiones principales.",
				[],
			);
		};
		const handleExportChatEvent = () => {
			handleExportRef.current("markdown");
		};

		window.addEventListener("trigger_new_chat", handleNewChatEvent);
		window.addEventListener("trigger_fork_chat", handleForkChatEvent);
		window.addEventListener("trigger_compact_context", handleCompactContextEvent);
		window.addEventListener("trigger_export_chat", handleExportChatEvent);

		return () => {
			window.removeEventListener("trigger_new_chat", handleNewChatEvent);
			window.removeEventListener("trigger_fork_chat", handleForkChatEvent);
			window.removeEventListener("trigger_compact_context", handleCompactContextEvent);
			window.removeEventListener("trigger_export_chat", handleExportChatEvent);
		};
	}, [createNewSession, activeSessionId, forkSession]);

	const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTo({
				top: messagesContainerRef.current.scrollHeight,
				behavior,
			});
		}
	}, []);

	// Position at the bottom when changing chat sessions
	useEffect(() => {
		if (activeSessionId !== prevSessionIdRef.current) {
			prevSessionIdRef.current = activeSessionId;
			prevMessagesCountRef.current = 0;
			requestAnimationFrame(() => {
				scrollToBottom("auto");
			});
		}
	}, [activeSessionId, scrollToBottom]);

	// Position at the bottom when messages initially load for a chat
	useEffect(() => {
		if (prevMessagesCountRef.current === 0 && messages.length > 0) {
			requestAnimationFrame(() => {
				scrollToBottom("auto");
			});
		}
		prevMessagesCountRef.current = messages.length;
	}, [messages, scrollToBottom]);

	// Auto-scroll when streaming if the user hasn't scrolled up and autoScroll is enabled
	// biome-ignore lint/correctness/useExhaustiveDependencies: auto-scroll on stream text chunks
	useEffect(() => {
		if (streaming && !showScrollBottom && appSettings.autoScroll) {
			scrollToBottom("smooth");
		}
	}, [
		streaming,
		currentContent,
		toolCalls,
		showScrollBottom,
		scrollToBottom,
		appSettings.autoScroll,
	]);

	const handleScroll = useCallback(() => {
		const container = messagesContainerRef.current;
		if (!container) return;

		// Show scroll button if user is scrolled up away from bottom (> 120px)
		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;
		setShowScrollBottom(distanceFromBottom > 120);

		if (container.scrollTop < 100 && hasMore && !loadingMore) {
			const prevScrollHeight = container.scrollHeight;
			loadMoreMessages().then(() => {
				requestAnimationFrame(() => {
					const newScrollHeight = container.scrollHeight;
					container.scrollTop = newScrollHeight - prevScrollHeight;
				});
			});
		}
	}, [hasMore, loadingMore, loadMoreMessages]);

	const handleSend = async (
		text: string,
		attachments: FileAttachment[],
		options?: {
			systemPrompt?: string;
			enabledTools?: string[];
			modelSettings?: ModelSettings;
		},
	) => {
		setDraftText("");
		let sessionId = activeSessionId;
		if (!sessionId) {
			const session = await createNewSession(undefined, selectedModel);
			sessionId = session.id;
		}

		// If there are attachments, build full message for the LLM & UI
		let fullMessage = text.trim();
		if (attachments && attachments.length > 0) {
			const attachmentsParts = attachments.map((a) => {
				if (a.preview?.startsWith("data:image")) {
					return `![${a.name}](${a.preview})`;
				}
				if (a.content) {
					const ext = a.name.split(".").pop() || "";
					return `📎 **${a.name}** (${formatFileSize(a.size)})\n\`\`\`${ext}\n${a.content}\n\`\`\``;
				}
				return `📎 **${a.name}** (${formatFileSize(a.size)})`;
			});

			const attachmentsSummary = attachmentsParts.join("\n\n");
			fullMessage = fullMessage ? `${attachmentsSummary}\n\n${fullMessage}` : attachmentsSummary;
		}

		// Display full message with attachments in UI
		addMessage({
			id: crypto.randomUUID?.() ?? Date.now().toString(),
			sessionId,
			role: "user",
			content: fullMessage,
			toolCalls: null,
			toolCallId: null,
			createdAt: Date.now(),
		});

		requestAnimationFrame(() => {
			scrollToBottom("smooth");
		});

		if (appSettings.browserNotifications && getNotificationPermission() === "default") {
			requestNotificationPermission().catch(() => {});
		}

		sendMessage(
			sessionId,
			fullMessage,
			{
				agent: getAgentForSession(sessionId) ?? undefined,
				model: selectedModel,
				systemPrompt: options?.systemPrompt || customSystemPrompt || undefined,
				enabledTools: options?.enabledTools || enabledTools,
				modelSettings: options?.modelSettings || {
					temperature: appSettings.temperature,
					topP: appSettings.topP,
					topK: appSettings.topK,
					repeatPenalty: appSettings.repeatPenalty,
					enableReasoning: appSettings.expandReasoning,
					maxTokens: 4096,
					presencePenalty: 0.0,
					frequencyPenalty: 0.0,
				},
			},
			(msg) => {
				addMessage(msg);
				if (
					appSettings.browserNotifications &&
					msg.role === "assistant" &&
					msg.content &&
					!msg.content.startsWith("⚠️ **Aviso**:")
				) {
					const activeSession = sessions.find((s) => s.id === sessionId);
					notifyAgentFinished({
						agentName: msg._subAgent || getAgentForSession(sessionId) || undefined,
						sessionTitle: activeSession?.name ?? undefined,
						content: msg.content ?? undefined,
						onClick: () => {
							selectSession(sessionId);
						},
					});
				}
			},
			() => {
				refreshSessions();
			},
			(err) => {
				console.error("[chat] error:", err);
				addToast("error", err);
			},
		);
	};

	const handleFork = async (messageId: string) => {
		try {
			await forkSession(messageId);
			addToast("success", "Conversación bifurcada con éxito");
		} catch (_err: unknown) {
			addToast("error", "Error al bifurcar conversación");
		}
	};

	const handleDeleteMsg = (messageId: string) => {
		deleteMessage(messageId);
		addToast("info", "Mensaje eliminado");
	};

	const handleEditMsg = (msg: Message) => {
		setDraftText(msg.content ?? "");
	};

	const handleReloadMsg = (msg: Message) => {
		if (msg.role === "user") {
			handleSend(msg.content ?? "", []);
		} else {
			// Find previous user message
			const idx = messages.findIndex((m) => m.id === msg.id);
			if (idx > 0) {
				const prevUserMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
				if (prevUserMsg) {
					setMessageVariants((prev) => {
						const existing = prev[msg.id] || [msg.content ?? ""];
						return {
							...prev,
							[msg.id]: existing,
						};
					});
					handleSend(prevUserMsg.content ?? "", []);
				}
			}
		}
	};

	const handleStarterClick = (promptText: string) => {
		handleSend(promptText, []);
	};

	handleSendRef.current = handleSend;

	if (sessionsLoading && messages.length === 0 && !streaming) {
		return (
			<div className="view-loading">
				<div className="spinner" />
				<span>Iniciando sesión...</span>
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				position: "relative",
			}}
		>
			{/* Sub-Sidebar para organizar este chat */}
			<ChatSubSidebar
				collapsed={!subSidebarOpen}
				onToggleCollapse={toggleSubSidebar}
				sessions={sessions}
				activeSessionId={activeSessionId}
				onSelectSession={selectSession}
				onNewSession={() => createNewSession()}
				onDeleteSession={removeSession}
				onTogglePinSession={togglePinSession}
				onOpenSystemPrompt={() => setShowSettings(true)}
				onOpenMemories={() => setShowMemories(true)}
			/>

			{/* Main Chat Work Area (Messages + Composer + Artifact Panel) */}
			<div
				style={{
					display: "flex",
					flex: 1,
					minWidth: 0,
					height: "100%",
					position: "relative",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				{/* Chat Body: Messages & Artifacts Split View */}
				<div
					className="chat-body-layout"
					style={{
						display: "flex",
						flex: 1,
						minHeight: 0,
						position: "relative",
						overflow: "hidden",
						width: "100%",
					}}
				>
					{/* Message Stream */}
					<div
						className="messages-container"
						ref={messagesContainerRef}
						onScroll={handleScroll}
						style={{ flex: 1, minWidth: 0 }}
					>
						<div className="messages-inner">
							{loadingMore && (
								<div className="load-more-indicator">
									<div className="spinner" style={{ width: 16, height: 16 }} />
									<span>Cargando más mensajes...</span>
								</div>
							)}
							{messages.length === 0 && !streaming ? (
								<div className="empty-hero">
									<div className="hero-avatar-glow">
										<img src={logoImg} alt="Llama Engine" className="hero-avatar-img" />
									</div>
									<h1 className="hero-title">¿En qué puedo ayudarte hoy?</h1>
									<p className="hero-subtitle">
										Agente potenciado por LLM y herramientas avanzadas de ejecución de comandos,
										análisis de archivos y razonamiento en tiempo real.
									</p>

									<div className="starter-cards-grid">
										{STARTER_PROMPTS.map((starter) => (
											<button
												key={starter.title}
												type="button"
												className="starter-card"
												onClick={() => handleStarterClick(starter.prompt)}
											>
												<div className="starter-card-title">
													{starter.icon}
													<span>{starter.title}</span>
												</div>
												<div className="starter-card-desc">{starter.desc}</div>
											</button>
										))}
									</div>
								</div>
							) : (
								<>
									{(() => {
										const toolResultsMap: Record<string, string> = {};
										for (const m of messages) {
											if (m.role === "tool" && m.toolCallId && m.content) {
												toolResultsMap[m.toolCallId] = m.content;
											}
										}
										return messages.map((msg) => (
											<MessageBubble
												key={msg.id}
												message={msg}
												toolResults={toolResultsMap}
												modelName={selectedModel}
												onFork={handleFork}
												onDelete={handleDeleteMsg}
												onEdit={handleEditMsg}
												onReload={handleReloadMsg}
												onFavorite={(m) => toggleFavoriteMessage(m.id)}
												onOpenArtifact={(art) => setSelectedArtifact(art)}
												onSpeak={(txt) => {
													if (currentSpeakingId === msg.id && speaking) {
														stopSpeaking();
													} else {
														speak(txt, msg.id);
													}
												}}
												isSpeakingThis={currentSpeakingId === msg.id && speaking}
												variants={messageVariants[msg.id]}
												activeVariantIndex={activeVariantIndices[msg.id] ?? 0}
												onVariantChange={(idx) =>
													setActiveVariantIndices((prev) => ({ ...prev, [msg.id]: idx }))
												}
											/>
										));
									})()}

									{streaming && (currentContent || toolCalls.length > 0) && (
										<MessageBubble
											message={{
												id: "streaming",
												sessionId: activeSessionId ?? "",
												role: "assistant",
												content: currentContent,
												toolCalls: null,
												toolCallId: null,
												createdAt: Date.now(),
											}}
											toolCalls={toolCalls}
											modelName={selectedModel}
											isStreaming
										/>
									)}
								</>
							)}
							<div ref={messagesEndRef} />
						</div>
					</div>

					{/* Canvas / Artifacts Split Panel (Claude / Bolt style) */}
					{selectedArtifact && (
						<ArtifactPanel artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />
					)}
				</div>

				{/* Floating Input Composer */}
				<Composer
					onSend={handleSend}
					onStop={stopStreaming}
					disabled={streaming}
					model={selectedModel}
					draftText={draftText}
					onDraftTextChange={setDraftText}
				/>

				{/* Floating Scroll to Bottom Button */}
				{showScrollBottom && (
					<button
						type="button"
						className="scroll-to-bottom-btn"
						onClick={() => scrollToBottom("smooth")}
						title="Desplazarse al final del chat"
						aria-label="Desplazarse al final del chat"
					>
						<ArrowDownIcon size={18} />
					</button>
				)}
			</div>

			{/* Right Inspector Panel (3 live blocks: Toggles Skills & MCP, Memories, Agenda & Habits) */}
			<ChatInspector
				open={inspectorOpen}
				onClose={toggleInspector}
				enabledTools={enabledTools}
				onToggleTool={handleToggleTool}
				onOpenMemoriesModal={() => setShowMemories(true)}
			/>

			{/* Model Information Modal */}
			{selectedModelInfo && (
				<ModelInfoModal model={selectedModelInfo} onClose={() => setSelectedModelInfo(null)} />
			)}

			{/* System Prompt Modal for Active Session */}
			{showSettings && (
				<SystemPromptModal
					prompt={customSystemPrompt}
					onSave={(newPrompt) => {
						setCustomSystemPrompt(newPrompt);
						addToast("System Prompt actualizado para la sesión activa", "success");
					}}
					onClose={() => setShowSettings(false)}
				/>
			)}

			{/* Memories Modal */}
			{showMemories && <MemoriesModal onClose={() => setShowMemories(false)} />}

			{/* Voice Orb active when text-to-speech is speaking */}
			{speaking && <VoiceOrb mode="speaking" onStop={stopSpeaking} />}

			{/* Command Palette Modal (Ctrl+K) */}
			{showCommandPalette && (
				<CommandPaletteModal
					onClose={() => setShowCommandPalette(false)}
					onOpenMemories={() => setShowMemories(true)}
					onOpenSettings={() => setShowSettings(true)}
					onExportChat={() => handleExport("markdown")}
				/>
			)}
		</div>
	);
}
