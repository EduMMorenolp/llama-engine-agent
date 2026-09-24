import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchAvailableModels, type Message, type ModelInfo } from "../../../api.ts";
import logoImg from "../../../assets/logo.jpg";
import {
	ArrowDownIcon,
	CheckIcon,
	ChevronDownIcon,
	DownloadIcon,
	FileCodeIcon,
	InfoIcon,
	PlusIcon,
	SearchIcon,
	SidebarIcon,
	SparklesIcon,
	TerminalIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import { getAgentForSession } from "../../../lib/session-agents.ts";
import { useAppSettings } from "../../../lib/useAppSettings.ts";
import { useToast } from "../../../providers/ToastProvider.tsx";
import { useSessions } from "../../sessions/hooks/useSessions.ts";
import { useChat } from "../hooks/useChat.ts";
import { Composer } from "./Composer.tsx";
import type { FileAttachment } from "./FileUpload.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { ModelInfoModal } from "./ModelInfoModal.tsx";
import { SettingsModal } from "./SettingsModal.tsx";

interface LayoutContextType {
	sidebarOpen: boolean;
	toggleSidebar: () => void;
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
		renameSession,
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
	const modelMenuRef = useRef<HTMLDivElement>(null);
	const { sidebarOpen, toggleSidebar } = useOutletContext<LayoutContextType>() ?? {
		sidebarOpen: true,
		toggleSidebar: () => {},
	};

	const appSettings = useAppSettings();
	const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
	const [selectedModel, setSelectedModel] = useState("qwen3.5-9b");
	const [showModelMenu, setShowModelMenu] = useState(false);
	const [showExportMenu, setShowExportMenu] = useState(false);
	const [selectedModelInfo, setSelectedModelInfo] = useState<ModelInfo | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [tabEditingSessionId, setTabEditingSessionId] = useState<string | null>(null);
	const [tabEditingName, setTabEditingName] = useState("");
	const [showScrollBottom, setShowScrollBottom] = useState(false);
	const [draftText, setDraftText] = useState("");

	const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
	const MAX_CONTEXT_CHARS = 60000;
	const contextPercent = Math.min(100, Math.round((totalChars / MAX_CONTEXT_CHARS) * 100));
	const isHighContext = contextPercent >= 85;

	const prevSessionIdRef = useRef<string | null>(null);
	const prevMessagesCountRef = useRef<number>(0);
	const exportMenuRef = useRef<HTMLDivElement>(null);

	const handleExport = (format: "markdown" | "json") => {
		setShowExportMenu(false);
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

	// Close menus when clicking outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
				setShowModelMenu(false);
			}
			if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
				setShowExportMenu(false);
			}
		}
		if (showModelMenu || showExportMenu) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [showModelMenu, showExportMenu]);

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
		options?: { systemPrompt?: string; enabledTools?: string[]; modelSettings?: any },
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
				if (a.preview && a.preview.startsWith("data:image")) {
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

		sendMessage(
			sessionId,
			fullMessage,
			{
				agent: getAgentForSession(sessionId) ?? undefined,
				model: selectedModel,
				systemPrompt: options?.systemPrompt,
				enabledTools: options?.enabledTools,
				modelSettings: options?.modelSettings,
			},
			(msg) => addMessage(msg),
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
		} catch (err: unknown) {
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
					handleSend(prevUserMsg.content ?? "", []);
				}
			}
		}
	};

	const handleStarterClick = (promptText: string) => {
		handleSend(promptText, []);
	};

	const activeModelObj = models.find((m) => m.id === selectedModel) || models[0];

	if (sessionsLoading && messages.length === 0 && !streaming) {
		return (
			<div className="view-loading">
				<div className="spinner" />
				<span>Iniciando sesión...</span>
			</div>
		);
	}

	return (
		<div className="main" style={{ width: "100%", height: "100%", position: "relative" }}>
			{/* Chat Top Navbar with Tabs & Controls */}
			<header className="chat-navbar">
				<div className="chat-navbar-left" ref={modelMenuRef} style={{ position: "relative" }}>
					{!sidebarOpen && (
						<button
							type="button"
							className="toggle-sidebar-btn"
							onClick={toggleSidebar}
							title="Mostrar barra lateral"
						>
							<SidebarIcon size={17} />
						</button>
					)}

					{/* Model Dropdown Button */}
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<button
							type="button"
							className="model-badge-selector"
							onClick={() => setShowModelMenu((prev) => !prev)}
							title="Seleccionar modelo de IA"
						>
							<span className="model-dot" />
							<span>{selectedModel}</span>
							<ChevronDownIcon
								size={14}
								style={{
									color: "var(--text-muted)",
									transform: showModelMenu ? "rotate(180deg)" : "none",
									transition: "transform 0.2s ease",
								}}
							/>
						</button>

						<button
							type="button"
							className="action-icon-btn"
							onClick={() => setSelectedModelInfo(activeModelObj)}
							title="Información del modelo activo"
						>
							<InfoIcon size={15} style={{ color: "var(--text-secondary)" }} />
						</button>
					</div>

					{/* Multi-chat Tabs */}
					<div className="chat-tabs-bar">
						{sessions.slice(0, 4).map((s) => {
							const isEditingTab = tabEditingSessionId === s.id;
							const displayName = s.name || `Chat ${s.id.slice(0, 6)}`;

							return (
								<div
									key={s.id}
									className={`chat-tab-chip ${s.id === activeSessionId ? "active" : ""}`}
									role="tab"
									tabIndex={0}
									onClick={() => !isEditingTab && selectSession(s.id)}
									onKeyDown={(e) => {
										if ((e.key === "Enter" || e.key === " ") && !isEditingTab) {
											selectSession(s.id);
										}
									}}
									onDoubleClick={(e) => {
										e.stopPropagation();
										setTabEditingSessionId(s.id);
										setTabEditingName(displayName);
									}}
									title={isEditingTab ? undefined : "Doble clic para renombrar"}
								>
									{isEditingTab ? (
										<input
											ref={(el) => el?.focus()}
											type="text"
											className="chat-tab-rename-input"
											value={tabEditingName}
											onChange={(e) => setTabEditingName(e.target.value)}
											onClick={(e) => e.stopPropagation()}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													if (tabEditingName.trim()) {
														renameSession(s.id, tabEditingName.trim());
													}
													setTabEditingSessionId(null);
												} else if (e.key === "Escape") {
													e.preventDefault();
													setTabEditingSessionId(null);
												}
											}}
											onBlur={() => {
												if (tabEditingName.trim()) {
													renameSession(s.id, tabEditingName.trim());
												}
												setTabEditingSessionId(null);
											}}
										/>
									) : (
										<span>{displayName}</span>
									)}
									<button
										type="button"
										className="chat-tab-close"
										onClick={(e) => {
											e.stopPropagation();
											removeSession(s.id);
										}}
										title="Cerrar pestaña"
									>
										<XIcon size={12} />
									</button>
								</div>
							);
						})}
						<button
							type="button"
							className="chat-tab-chip new-tab"
							onClick={() => createNewSession()}
							title="Nueva pestaña"
						>
							<PlusIcon size={13} />
						</button>
					</div>

					{/* Model Dropdown Menu */}
					{showModelMenu && (
						<div className="popover-menu model-dropdown-popover">
							<div className="popover-header">
								<span>Modelos GGUF (llama.cpp)</span>
							</div>
							{models.map((m) => (
								<button
									type="button"
									key={m.id}
									className={`popover-item ${m.id === selectedModel ? "active-model-item" : ""}`}
									onClick={() => {
										setSelectedModel(m.id);
										setShowModelMenu(false);
									}}
								>
									<div
										style={{ display: "flex", flexDirection: "column", flex: 1, textAlign: "left" }}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
												{m.name}
											</span>
											{m.badge && (
												<span
													className="model-tag-badge"
													style={{
														background: m.loaded ? "rgba(16, 185, 129, 0.2)" : undefined,
														color: m.loaded ? "#10b981" : undefined,
													}}
												>
													{m.badge}
												</span>
											)}
										</div>
										<span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.desc}</span>
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
										<button
											type="button"
											className="session-action-btn"
											onClick={(e) => {
												e.stopPropagation();
												setShowModelMenu(false);
												setSelectedModelInfo(m);
											}}
											title={`Ver información de ${m.name}`}
										>
											<InfoIcon size={13} />
										</button>
										{m.id === selectedModel && (
											<CheckIcon size={15} style={{ color: "var(--accent)" }} />
										)}
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Right Controls: Export session, Context Badge & Actions */}
				<div
					className="chat-navbar-right"
					ref={exportMenuRef}
					style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}
				>
					{messages.length > 0 && (
						<span
							className="model-tag-badge"
							style={{
								background: isHighContext ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.06)",
								color: isHighContext ? "#ef4444" : "var(--text-secondary)",
								border: isHighContext ? "1px solid rgba(239, 68, 68, 0.3)" : undefined,
								fontSize: "11px",
								fontWeight: 500,
							}}
							title={`Uso de ventana de contexto: ${totalChars.toLocaleString()} / 60,000 caracteres (${contextPercent}%)`}
						>
							Contexto {contextPercent}%
						</span>
					)}

					<button
						type="button"
						className="action-icon-btn"
						onClick={() => setShowExportMenu((prev) => !prev)}
						title="Exportar conversación (Markdown / JSON)"
					>
						<DownloadIcon size={16} style={{ color: "var(--text-secondary)" }} />
					</button>

					{showExportMenu && (
						<div
							className="popover-menu"
							style={{ right: 0, top: "calc(100% + 6px)", minWidth: 160 }}
						>
							<div className="popover-header">
								<span>Exportar Chat</span>
							</div>
							<button
								type="button"
								className="popover-item"
								onClick={() => handleExport("markdown")}
							>
								<FileCodeIcon size={15} />
								<span>Markdown (.md)</span>
							</button>
							<button type="button" className="popover-item" onClick={() => handleExport("json")}>
								<SparklesIcon size={15} />
								<span>JSON (.json)</span>
							</button>
						</div>
					)}
				</div>
			</header>

			{/* Message Stream */}
			<div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
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
							{messages.map((msg) => (
								<MessageBubble
									key={msg.id}
									message={msg}
									modelName={selectedModel}
									onFork={handleFork}
									onDelete={handleDeleteMsg}
									onEdit={handleEditMsg}
									onReload={handleReloadMsg}
									onFavorite={toggleFavoriteMessage}
								/>
							))}

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

			{/* Model Information Modal */}
			{selectedModelInfo && (
				<ModelInfoModal model={selectedModelInfo} onClose={() => setSelectedModelInfo(null)} />
			)}

			{/* Settings Modal */}
			{showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
		</div>
	);
}
