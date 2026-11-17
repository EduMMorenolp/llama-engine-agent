import { useEffect, useMemo, useRef, useState } from "react";
import {
	type AgentDefinition,
	createAgent,
	fetchAgents,
	fetchHealth,
	type Message,
	searchMessages,
} from "../../../api.ts";
import logoImg from "../../../assets/logo.jpg";
import {
	CheckIcon,
	EditIcon,
	MessageSquareIcon,
	PlusIcon,
	SearchIcon,
	SettingsIcon,
	SidebarIcon,
	SparklesIcon,
	StarIcon,
	TagIcon,
	TrashIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import {
	findSessionIdForAgent,
	removeAgentForSession,
	setAgentForSession,
} from "../../../lib/session-agents.ts";
import { SettingsModal } from "../../chat/components/SettingsModal.tsx";
import { useSessions } from "../hooks/useSessions.ts";
import { AgentEditModal } from "./AgentEditModal.tsx";
import { FavoritesModal } from "./FavoritesModal.tsx";

interface SessionListProps {
	onToggleSidebar?: () => void;
	isSidebarOpen?: boolean;
}

export function SessionList({ onToggleSidebar }: SessionListProps) {
	const {
		sessions,
		activeSessionId,
		createNewSession,
		selectSession,
		removeSession,
		renameSession,
		tagSession,
	} = useSessions();

	const [searchQuery, setSearchQuery] = useState("");
	const [activeTag, setActiveTag] = useState<string | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [showFavorites, setShowFavorites] = useState(false);
	const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");
	const [tagInputSessionId, setTagInputSessionId] = useState<string | null>(null);
	const [newTagText, setNewTagText] = useState("");
	const [sidebarTab, setSidebarTab] = useState<"chat" | "agents">("chat");
	const [agents, setAgents] = useState<AgentDefinition[]>([]);
	const [newAgentName, setNewAgentName] = useState("");
	const [connectionState, setConnectionState] = useState<"connected" | "disconnected">("connected");
	const [editingAgent, setEditingAgent] = useState<AgentDefinition | null>(null);
	const [searchMessageResults, setSearchMessageResults] = useState<
		Array<{
			message: Message;
			session: { id: string; name: string | null };
			snippet: string;
		}>
	>([]);
	const editInputRef = useRef<HTMLInputElement>(null);
	const tagInputRef = useRef<HTMLInputElement>(null);

	// Debounced message search
	useEffect(() => {
		if (searchQuery.trim().length < 3) {
			setSearchMessageResults([]);
			return;
		}
		const timer = setTimeout(() => {
			searchMessages(searchQuery.trim())
				.then((results) => setSearchMessageResults(results || []))
				.catch(() => setSearchMessageResults([]));
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Extract unique tags across all sessions
	const allTags = useMemo(() => {
		const set = new Set<string>();
		for (const s of sessions) {
			if (Array.isArray(s.tags)) {
				for (const t of s.tags) {
					if (t?.trim()) set.add(t.trim());
				}
			}
		}
		return Array.from(set);
	}, [sessions]);

	// Check health periodically for connection status
	useEffect(() => {
		const check = () => {
			fetchHealth()
				.then((res) => {
					setConnectionState(res?.status === "ok" ? "connected" : "disconnected");
				})
				.catch(() => setConnectionState("disconnected"));
		};
		check();
		const interval = setInterval(check, 15000);
		return () => clearInterval(interval);
	}, []);

	// Load agents when switching to agents tab
	useEffect(() => {
		if (sidebarTab === "agents") {
			fetchAgents()
				.then(setAgents)
				.catch(() => {});
		}
	}, [sidebarTab]);

	// Global shortcut for new chat: Ctrl+K or Cmd+K
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				createNewSession();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [createNewSession]);

	const handleStartEdit = (s: { id: string; name: string | null }, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		setEditingSessionId(s.id);
		setEditingName(s.name || `Chat ${s.id.slice(0, 6)}`);
		setTimeout(() => {
			editInputRef.current?.focus();
			editInputRef.current?.select();
		}, 20);
	};

	const handleSaveEdit = async (sessionId: string) => {
		if (editingName.trim()) {
			await renameSession(sessionId, editingName.trim());
		}
		setEditingSessionId(null);
	};

	const handleCancelEdit = () => {
		setEditingSessionId(null);
	};

	const handleAddTag = async (sessionId: string, currentTags: string[] = []) => {
		const tag = newTagText.trim().toLowerCase();
		if (tag && !currentTags.includes(tag) && currentTags.length < 10) {
			await tagSession(sessionId, [...currentTags, tag]);
		}
		setNewTagText("");
		setTagInputSessionId(null);
	};

	const handleRemoveTag = async (
		sessionId: string,
		tagToRemove: string,
		currentTags: string[] = [],
	) => {
		await tagSession(
			sessionId,
			currentTags.filter((t) => t !== tagToRemove),
		);
	};

	const handleCreateAgent = async () => {
		const rawName = newAgentName.trim();
		if (!rawName) return;
		const slug = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
		try {
			const agent = await createAgent({
				name: slug || rawName,
				description: `Agente especializado ${rawName}`,
				corePrompt: `Sos un agente especializado llamado ${rawName}.`,
				tools: [],
				enabled: true,
			});
			if (agent) {
				setAgents((prev) => [...prev, agent]);
				setNewAgentName("");
				setEditingAgent(agent);
			}
		} catch (err) {
			console.error("[SessionList] Error creating agent:", err);
		}
	};

	const handleSelectAgent = async (agentName: string) => {
		let sessionId = findSessionIdForAgent(agentName);
		if (sessionId && !sessions.some((s) => s.id === sessionId)) {
			removeAgentForSession(sessionId);
			sessionId = null;
		}
		if (!sessionId) {
			const byName = sessions.find((s) => s.name === agentName);
			if (byName) {
				sessionId = byName.id;
			}
		}
		if (!sessionId) {
			const session = await createNewSession(agentName);
			sessionId = session.id;
		}
		if (sessionId) {
			setAgentForSession(sessionId, agentName);
			await selectSession(sessionId);
			setSidebarTab("chat");
		}
	};

	const filteredSessions = useMemo(() => {
		return sessions.filter((s) => {
			if (activeTag && !s.tags?.includes(activeTag)) {
				return false;
			}
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				return (s.name ?? s.id).toLowerCase().includes(query);
			}
			return true;
		});
	}, [sessions, searchQuery, activeTag]);

	return (
		<div className="sidebar-content">
			<div className="sidebar-header">
				<div className="sidebar-brand">
					<div className="sidebar-brand-icon">
						<img src={logoImg} alt="Llama Engine" className="sidebar-brand-img" />
					</div>
					<div className="sidebar-brand-text">
						<span className="sidebar-brand-name">Llama Engine</span>
						<span className="sidebar-brand-badge">Agent Studio</span>
					</div>
				</div>
				{onToggleSidebar && (
					<button
						type="button"
						className="session-action-btn"
						onClick={onToggleSidebar}
						title="Ocultar barra lateral"
						style={{ opacity: 1, padding: "6px" }}
					>
						<SidebarIcon size={16} />
					</button>
				)}
			</div>

			{/* Sidebar Tabs */}
			<div className="sidebar-tabs">
				<button
					type="button"
					className={`sidebar-tab ${sidebarTab === "chat" ? "active" : ""}`}
					onClick={() => setSidebarTab("chat")}
				>
					<MessageSquareIcon size={14} />
					<span>Chat</span>
				</button>
				<button
					type="button"
					className={`sidebar-tab ${sidebarTab === "agents" ? "active" : ""}`}
					onClick={() => setSidebarTab("agents")}
				>
					<SparklesIcon size={14} />
					<span>Agentes</span>
				</button>
				<button
					type="button"
					className="sidebar-tab"
					onClick={() => setShowFavorites(true)}
					title="Ver mensajes guardados"
				>
					<StarIcon size={14} />
					<span>Guardados</span>
				</button>
			</div>

			{sidebarTab === "chat" ? (
				<>
					<div className="sidebar-actions">
						<button
							type="button"
							className="new-chat-btn"
							onClick={() => createNewSession()}
							title="Iniciar nueva conversación"
						>
							<div className="new-chat-btn-left">
								<PlusIcon size={16} />
								<span>Nueva conversación</span>
							</div>
							<span className="new-chat-shortcut">Ctrl K</span>
						</button>

						<div className="sidebar-search-wrapper">
							<span className="sidebar-search-icon">
								<SearchIcon size={14} />
							</span>
							<input
								type="text"
								className="sidebar-search-input"
								placeholder="Buscar en sesiones y mensajes..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>

						{allTags.length > 0 && (
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "4px",
									padding: "4px 2px 0 2px",
								}}
							>
								<button
									type="button"
									className={`model-tag-badge ${activeTag === null ? "active" : ""}`}
									onClick={() => setActiveTag(null)}
									style={{
										cursor: "pointer",
										fontSize: "11px",
										padding: "2px 6px",
										background: activeTag === null ? "var(--accent-glow)" : undefined,
										color: activeTag === null ? "var(--accent)" : undefined,
									}}
								>
									Todos
								</button>
								{allTags.map((tag) => (
									<button
										key={tag}
										type="button"
										className={`model-tag-badge ${activeTag === tag ? "active" : ""}`}
										onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
										style={{
											cursor: "pointer",
											fontSize: "11px",
											padding: "2px 6px",
											background: activeTag === tag ? "var(--accent-glow)" : undefined,
											color: activeTag === tag ? "var(--accent)" : undefined,
										}}
									>
										#{tag}
									</button>
								))}
							</div>
						)}
					</div>

					<div className="sidebar-sessions-container">
						<div className="sidebar-section-title">Conversaciones Recientes</div>

						{filteredSessions.length === 0 ? (
							<div className="sidebar-empty">
								{searchQuery || activeTag
									? "No se encontraron coincidencias"
									: "Sin conversaciones aún"}
							</div>
						) : (
							filteredSessions.map((session) => {
								const isEditing = editingSessionId === session.id;
								const isAddingTag = tagInputSessionId === session.id;
								const displayName = session.name || `Chat ${session.id.slice(0, 6)}`;
								const sessionTags = session.tags || [];

								return (
									<div
										key={session.id}
										className={`session-item ${session.id === activeSessionId ? "active" : ""}`}
										style={{ flexDirection: "column", alignItems: "stretch", gap: "4px" }}
									>
										{isEditing ? (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "6px",
													width: "100%",
												}}
											>
												<span className="session-item-icon">
													<MessageSquareIcon size={15} />
												</span>
												<input
													ref={editInputRef}
													type="text"
													className="session-rename-input"
													value={editingName}
													onChange={(e) => setEditingName(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															handleSaveEdit(session.id);
														} else if (e.key === "Escape") {
															e.preventDefault();
															handleCancelEdit();
														}
													}}
													onClick={(e) => e.stopPropagation()}
												/>
												<button
													type="button"
													className="session-action-btn confirm-btn"
													title="Guardar nombre (Enter)"
													onClick={(e) => {
														e.stopPropagation();
														handleSaveEdit(session.id);
													}}
												>
													<CheckIcon size={13} />
												</button>
												<button
													type="button"
													className="session-action-btn cancel-btn"
													title="Cancelar (Esc)"
													onClick={(e) => {
														e.stopPropagation();
														handleCancelEdit();
													}}
												>
													<XIcon size={13} />
												</button>
											</div>
										) : (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													width: "100%",
												}}
											>
												<button
													type="button"
													className="session-item-main"
													onClick={() => selectSession(session.id)}
													onDoubleClick={() => !isEditing && handleStartEdit(session)}
													style={{
														background: "none",
														border: "none",
														color: "inherit",
														cursor: "pointer",
														textAlign: "left",
														flex: 1,
														padding: 0,
														overflow: "hidden",
													}}
												>
													<span className="session-item-icon">
														<MessageSquareIcon size={15} />
													</span>
													<span className="session-name" title={displayName}>
														{displayName}
													</span>
												</button>

												<div className="session-item-actions">
													<button
														type="button"
														className="session-action-btn"
														title="Agregar tag a la sesión"
														onClick={(e) => {
															e.stopPropagation();
															setTagInputSessionId(isAddingTag ? null : session.id);
															setNewTagText("");
															setTimeout(() => tagInputRef.current?.focus(), 30);
														}}
													>
														<TagIcon size={13} />
													</button>
													<button
														type="button"
														className="session-action-btn edit-btn"
														title="Renombrar chat"
														onClick={(e) => handleStartEdit(session, e)}
													>
														<EditIcon size={13} />
													</button>
													<button
														type="button"
														className="session-action-btn"
														title="Eliminar conversación"
														onClick={(e) => {
															e.stopPropagation();
															removeSession(session.id);
														}}
													>
														<TrashIcon size={14} />
													</button>
												</div>
											</div>
										)}

										{/* Tags row & Inline Tag Input */}
										{(sessionTags.length > 0 || isAddingTag) && (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													alignItems: "center",
													gap: "4px",
													paddingLeft: "26px",
													marginTop: "2px",
												}}
											>
												{sessionTags.map((tag) => (
													<span
														key={tag}
														className="model-tag-badge"
														style={{
															fontSize: "10px",
															padding: "1px 5px",
															display: "inline-flex",
															alignItems: "center",
															gap: "3px",
														}}
													>
														<span>#{tag}</span>
														<button
															type="button"
															style={{
																background: "none",
																border: "none",
																color: "inherit",
																cursor: "pointer",
																padding: 0,
																display: "inline-flex",
																opacity: 0.6,
															}}
															onClick={(e) => {
																e.stopPropagation();
																handleRemoveTag(session.id, tag, sessionTags);
															}}
															title={`Eliminar tag "${tag}"`}
														>
															<XIcon size={10} />
														</button>
													</span>
												))}

												{isAddingTag && (
													<span
														style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}
													>
														<input
															ref={tagInputRef}
															type="text"
															value={newTagText}
															onChange={(e) => setNewTagText(e.target.value)}
															placeholder="nuevo tag..."
															style={{
																fontSize: "11px",
																padding: "1px 4px",
																background: "var(--bg-app)",
																border: "1px solid var(--accent)",
																borderRadius: "var(--r-sm)",
																color: "var(--text-primary)",
																width: "70px",
															}}
															onKeyDown={(e) => {
																if (e.key === "Enter") {
																	e.preventDefault();
																	handleAddTag(session.id, sessionTags);
																} else if (e.key === "Escape") {
																	e.preventDefault();
																	setTagInputSessionId(null);
																}
															}}
															onBlur={() => handleAddTag(session.id, sessionTags)}
														/>
													</span>
												)}
											</div>
										)}
									</div>
								);
							})
						)}

						{/* Full-text message search results */}
						{searchMessageResults.length > 0 && (
							<div style={{ marginTop: "16px" }}>
								<div className="sidebar-section-title">
									Mensajes Encontrados ({searchMessageResults.length})
								</div>
								{searchMessageResults.map((res) => (
									<button
										type="button"
										key={res.message.id}
										className="session-item"
										onClick={() => selectSession(res.session.id)}
										style={{
											flexDirection: "column",
											alignItems: "flex-start",
											gap: "4px",
											padding: "8px 10px",
											cursor: "pointer",
											marginBottom: "4px",
											textAlign: "left",
											width: "100%",
											background: "none",
											border: "none",
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												width: "100%",
											}}
										>
											<span
												style={{
													fontSize: "12px",
													fontWeight: 600,
													color: "var(--accent)",
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
												}}
											>
												{res.session.name || `Chat ${res.session.id.slice(0, 6)}`}
											</span>
											<span
												className="model-tag-badge"
												style={{ fontSize: "9px", padding: "0 4px" }}
											>
												{res.message.role}
											</span>
										</div>
										<span
											style={{
												fontSize: "11px",
												color: "var(--text-secondary)",
												lineHeight: 1.3,
												wordBreak: "break-word",
											}}
										>
											{res.snippet}
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				</>
			) : (
				<div className="sidebar-sessions-container">
					<div className="sidebar-section-title">Agentes</div>

					{agents.length === 0 ? (
						<div className="sidebar-empty">Sin agentes aún</div>
					) : (
						agents.map((agent) => {
							const mappedId = findSessionIdForAgent(agent.name);
							const isActive = mappedId !== null && mappedId === activeSessionId;
							return (
								<div key={agent.name} className={`session-item ${isActive ? "active" : ""}`}>
									<button
										type="button"
										className="session-item-main"
										onClick={() => handleSelectAgent(agent.name)}
										style={{
											background: "none",
											border: "none",
											color: "inherit",
											cursor: "pointer",
											textAlign: "left",
											width: "100%",
											padding: 0,
										}}
									>
										<span className="session-item-icon">
											<SparklesIcon size={15} />
										</span>
										<span className="session-name" title={agent.name}>
											{agent.name}
										</span>
									</button>

									<div className="session-item-actions">
										<button
											type="button"
											className="session-action-btn"
											title={`Configurar agente "${agent.name}"`}
											onClick={(e) => {
												e.stopPropagation();
												setEditingAgent(agent);
											}}
										>
											<SettingsIcon size={13} />
										</button>
									</div>
								</div>
							);
						})
					)}

					<div className="sidebar-new-agent">
						<input
							type="text"
							className="sidebar-search-input"
							placeholder="Nombre del agente"
							value={newAgentName}
							onChange={(e) => setNewAgentName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleCreateAgent();
								}
							}}
						/>
						<button
							type="button"
							className="new-chat-btn"
							disabled={!newAgentName.trim()}
							onClick={handleCreateAgent}
							title="Crear agente"
						>
							<div className="new-chat-btn-left">
								<PlusIcon size={16} />
								<span>Crear agente</span>
							</div>
						</button>
					</div>
				</div>
			)}

			<div className="sidebar-footer">
				<div className="sidebar-footer-status">
					<div
						className={`connection-dot ${connectionState === "connected" ? "connected" : "disconnected"}`}
					/>
					<span>{connectionState === "connected" ? "Engine Online" : "Desconectado"}</span>
				</div>
				<button
					type="button"
					className="session-action-btn"
					onClick={() => setShowSettings(true)}
					title="Configuración"
					style={{ opacity: 1, padding: "6px" }}
				>
					<SettingsIcon size={16} />
				</button>
			</div>

			{showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

			{showFavorites && (
				<FavoritesModal
					onClose={() => setShowFavorites(false)}
					onSelectSession={(id) => selectSession(id)}
				/>
			)}

			{editingAgent && (
				<AgentEditModal
					agent={editingAgent}
					onClose={() => setEditingAgent(null)}
					onSaved={(updated) => {
						setAgents((prev) => prev.map((a) => (a.name === updated.name ? updated : a)));
					}}
					onDeleted={(name) => {
						setAgents((prev) => prev.filter((a) => a.name !== name));
					}}
				/>
			)}
		</div>
	);
}
