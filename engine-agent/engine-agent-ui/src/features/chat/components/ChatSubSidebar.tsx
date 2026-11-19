import { useEffect, useState } from "react";
import { fetchMemories, type Session } from "../../../api.ts";
import {
	BotIcon,
	BrainIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PinFilledIcon,
	PinIcon,
	PlusIcon,
	SearchIcon,
	SlidersIcon,
	TrashIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import { getAgentForSession, setAgentForSession } from "../../../lib/session-agents.ts";

const AGENT_OPTIONS = [
	{ id: "asistente", name: "Asistente General", color: "#3b82f6" },
	{ id: "coder", name: "Coder Especialista", color: "#a855f7" },
	{ id: "researcher", name: "Investigador Web", color: "#10b981" },
	{ id: "reviewer", name: "Revisor & QA", color: "#f59e0b" },
];

interface ChatSubSidebarProps {
	collapsed: boolean;
	onToggleCollapse: () => void;
	sessions: Session[];
	activeSessionId: string | null;
	onSelectSession: (id: string) => void;
	onNewSession: () => void;
	onDeleteSession: (id: string) => void;
	onTogglePinSession?: (id: string) => void;
	onOpenSystemPrompt: () => void;
	onOpenMemories: () => void;
	onAgentChange?: (agentId: string) => void;
}

export function ChatSubSidebar({
	collapsed,
	onToggleCollapse,
	sessions,
	activeSessionId,
	onSelectSession,
	onNewSession,
	onDeleteSession,
	onTogglePinSession,
	onOpenSystemPrompt,
	onOpenMemories,
	onAgentChange,
}: ChatSubSidebarProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [currentAgent, setCurrentAgent] = useState("asistente");
	const [memoriesCount, setMemoriesCount] = useState(0);

	useEffect(() => {
		const loadMemoriesCount = () => {
			fetchMemories()
				.then((mems) => setMemoriesCount(mems.length))
				.catch(() => {});
		};
		loadMemoriesCount();
		window.addEventListener("memories_updated", loadMemoriesCount);
		return () => window.removeEventListener("memories_updated", loadMemoriesCount);
	}, []);

	useEffect(() => {
		const syncAgent = () => {
			const next = activeSessionId
				? (getAgentForSession(activeSessionId) ?? "asistente")
				: "asistente";
			setCurrentAgent(next);
		};
		syncAgent();
		window.addEventListener("agent_session_changed", syncAgent);
		return () => window.removeEventListener("agent_session_changed", syncAgent);
	}, [activeSessionId]);

	const filteredSessions = sessions.filter((s) => {
		if (!searchQuery.trim()) return true;
		const name = s.name?.toLowerCase() || "";
		return name.includes(searchQuery.toLowerCase().trim());
	});

	const handleAgentSelect = (agentId: string) => {
		setCurrentAgent(agentId);
		if (activeSessionId) {
			setAgentForSession(activeSessionId, agentId);
			window.dispatchEvent(
				new CustomEvent("agent_session_changed", {
					detail: { sessionId: activeSessionId, agentId },
				}),
			);
			onAgentChange?.(agentId);
		}
	};

	if (collapsed) {
		return (
			<aside
				className="chat-sub-sidebar collapsed-rail"
				aria-label="Organizador de conversaciones colapsado"
				style={{
					width: "44px",
					flexShrink: 0,
					background: "var(--panel)",
					borderRight: "1px solid var(--border)",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					padding: "10px 4px",
					gap: "8px",
				}}
			>
				<button
					type="button"
					className="session-action-btn"
					onClick={onToggleCollapse}
					title="Mostrar Sesiones de Chat"
					aria-label="Mostrar Sesiones de Chat"
					style={{ width: "30px", height: "30px" }}
				>
					<ChevronRightIcon size={15} />
				</button>
				<button
					type="button"
					className="session-action-btn"
					onClick={onNewSession}
					title="Nueva conversación"
					aria-label="Nueva conversación"
					style={{ width: "30px", height: "30px" }}
				>
					<PlusIcon size={15} />
				</button>
				<div
					style={{ width: "20px", height: "1px", background: "var(--border)", margin: "2px 0" }}
				/>
				<button
					type="button"
					className="session-action-btn"
					onClick={onOpenMemories}
					title="Ver Memorias persistentes"
					aria-label="Ver Memorias persistentes"
					style={{ width: "30px", height: "30px" }}
				>
					<BrainIcon size={14} />
				</button>
				<button
					type="button"
					className="session-action-btn"
					onClick={onOpenSystemPrompt}
					title="Editar System Prompt del agente"
					aria-label="Editar System Prompt del agente"
					style={{ width: "30px", height: "30px" }}
				>
					<SlidersIcon size={14} />
				</button>
			</aside>
		);
	}

	return (
		<aside className="chat-sub-sidebar" aria-label="Organizador de conversaciones">
			{/* Sub-sidebar Header */}
			<div className="chat-sub-header">
				<span className="chat-sub-title">Sesiones de Chat</span>
				<div style={{ display: "flex", gap: "4px" }}>
					<button
						type="button"
						className="session-action-btn"
						onClick={onNewSession}
						title="Nueva conversación"
					>
						<PlusIcon size={14} />
					</button>
					<button
						type="button"
						className="session-action-btn"
						onClick={onToggleCollapse}
						title="Ocultar organizador"
					>
						<ChevronLeftIcon size={14} />
					</button>
				</div>
			</div>

			{/* Search Chat Input */}
			<div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-sm)",
						padding: "4px 8px",
					}}
				>
					<SearchIcon size={13} style={{ color: "var(--muted)" }} />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Filtrar chats..."
						style={{
							background: "transparent",
							border: "none",
							outline: "none",
							color: "var(--text)",
							fontSize: "12px",
							width: "100%",
						}}
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							style={{
								background: "transparent",
								border: "none",
								color: "var(--muted)",
								cursor: "pointer",
							}}
						>
							<XIcon size={11} />
						</button>
					)}
				</div>
			</div>

			{/* Agent Selector Card for current chat */}
			<div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: "6px",
					}}
				>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							color: "var(--muted)",
							textTransform: "uppercase",
						}}
					>
						Agente Activo
					</span>
					<div style={{ display: "flex", gap: "4px" }}>
						<button
							type="button"
							className="session-action-btn"
							onClick={onOpenMemories}
							title={`Ver Memorias persistentes (${memoriesCount})`}
							style={{ gap: "3px", padding: "3px 6px" }}
						>
							<BrainIcon size={12} />
							<span style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)" }}>
								{memoriesCount}
							</span>
						</button>
						<button
							type="button"
							className="session-action-btn"
							onClick={onOpenSystemPrompt}
							title="Editar System Prompt del agente"
						>
							<SlidersIcon size={12} />
						</button>
					</div>
				</div>

				<select
					value={currentAgent}
					onChange={(e) => handleAgentSelect(e.target.value)}
					style={{
						width: "100%",
						padding: "6px 8px",
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-sm)",
						color: "var(--text)",
						fontSize: "12px",
						cursor: "pointer",
						outline: "none",
					}}
				>
					{AGENT_OPTIONS.map((a) => (
						<option key={a.id} value={a.id}>
							{a.name}
						</option>
					))}
				</select>
			</div>

			{/* Sessions List */}
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "6px 8px",
					display: "flex",
					flexDirection: "column",
					gap: "2px",
				}}
			>
				{(() => {
					const pinnedSessions = filteredSessions.filter((s) => s.tags?.includes("pinned"));
					const recentSessions = filteredSessions.filter((s) => !s.tags?.includes("pinned"));

					const renderSessionItem = (s: Session, isPinned: boolean) => {
						const isActive = s.id === activeSessionId;
						const agentTag =
							getAgentForSession(s.id) || s.tags?.find((t) => t !== "pinned") || "asistente";
						const displayName = s.name || `Chat ${s.id.slice(0, 6)}`;

						return (
							<button
								type="button"
								key={s.id}
								className={`session-item ${isActive ? "active" : ""}`}
								onClick={() => onSelectSession(s.id)}
								style={{
									padding: "7px 9px",
									borderRadius: "var(--r-sm)",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									background: isActive
										? "rgba(59, 130, 246, 0.12)"
										: isPinned
											? "rgba(59, 130, 246, 0.04)"
											: "transparent",
									border: isActive
										? "1px solid rgba(59, 130, 246, 0.25)"
										: isPinned
											? "1px solid rgba(59, 130, 246, 0.12)"
											: "1px solid transparent",
									cursor: "pointer",
									width: "100%",
									textAlign: "left",
									marginBottom: "2px",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "7px",
										minWidth: 0,
										flex: 1,
									}}
									title={`Agente: ${agentTag}${isPinned ? " (Fijado)" : ""}`}
								>
									{isPinned ? (
										<PinFilledIcon size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
									) : (
										<BotIcon
											size={13}
											style={{ color: isActive ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}
										/>
									)}
									<span
										style={{
											fontSize: "12.5px",
											fontWeight: isActive || isPinned ? 600 : 400,
											color: isActive ? "var(--accent)" : "var(--text)",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{displayName}
									</span>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
									{onTogglePinSession && (
										<button
											type="button"
											className="session-action-btn"
											onClick={(e) => {
												e.stopPropagation();
												onTogglePinSession(s.id);
											}}
											title={isPinned ? "Desfijar chat" : "Fijar chat al inicio"}
											style={{
												color: isPinned ? "var(--accent)" : "var(--muted)",
												padding: "3px 4px",
											}}
										>
											{isPinned ? <PinFilledIcon size={12} /> : <PinIcon size={12} />}
										</button>
									)}
									<button
										type="button"
										className="session-action-btn danger-hover"
										onClick={(e) => {
											e.stopPropagation();
											onDeleteSession(s.id);
										}}
										title="Eliminar sesión"
										style={{ padding: "3px 4px" }}
									>
										<TrashIcon size={12} />
									</button>
								</div>
							</button>
						);
					};

					if (filteredSessions.length === 0) {
						return (
							<div
								style={{
									padding: "16px 8px",
									textAlign: "center",
									fontSize: "12px",
									color: "var(--muted)",
								}}
							>
								No se encontraron chats
							</div>
						);
					}

					return (
						<>
							{pinnedSessions.length > 0 && (
								<div style={{ marginBottom: "8px" }}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "5px",
											padding: "4px 6px 6px 6px",
											fontSize: "10.5px",
											fontWeight: 700,
											color: "var(--accent)",
											textTransform: "uppercase",
											letterSpacing: "0.5px",
										}}
									>
										<PinFilledIcon size={11} />
										<span>Fijados ({pinnedSessions.length})</span>
									</div>
									{pinnedSessions.map((s) => renderSessionItem(s, true))}
								</div>
							)}

							{recentSessions.length > 0 && (
								<div>
									{pinnedSessions.length > 0 && (
										<div
											style={{
												padding: "6px 6px 4px 6px",
												fontSize: "10.5px",
												fontWeight: 700,
												color: "var(--muted)",
												textTransform: "uppercase",
												letterSpacing: "0.5px",
												borderTop: "1px solid var(--border)",
												marginTop: "4px",
											}}
										>
											Recientes
										</div>
									)}
									{recentSessions.map((s) => renderSessionItem(s, false))}
								</div>
							)}
						</>
					);
				})()}
			</div>
		</aside>
	);
}
