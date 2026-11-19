import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { ModelInfo, Session } from "../../api.ts";
import { getAgentForSession } from "../../lib/session-agents.ts";
import { useAppSettings } from "../../lib/useAppSettings.ts";
import {
	CommandIcon,
	MoonIcon,
	PanelRightIcon,
	PinFilledIcon,
	PlusIcon,
	SparklesIcon,
	SunIcon,
	XIcon,
} from "../ui/Icons.tsx";

const SECTION_LABELS: Record<string, string> = {
	"": "Chats",
	agents: "Agentes & Personalidades",
	skills: "Catálogo de Skills",
	tools: "Herramientas Agénticas",
	mcp: "Servidores MCP",
	memories: "Gestor de Memorias",
	settings: "Configuración del Sistema",
};

const AGENT_COLORS: Record<string, string> = {
	asistente: "#3b82f6",
	coder: "#a855f7",
	researcher: "#10b981",
	reviewer: "#f59e0b",
};

interface TopbarProps {
	sessions: Session[];
	activeSessionId: string | null;
	onSelectSession: (id: string) => void;
	onCloseSession: (id: string) => void;
	onNewSession: () => void;
	models?: ModelInfo[];
	selectedModel: string;
	onSelectModel?: (modelId: string) => void;
	contextPercent?: number;
	totalChars?: number;
	inspectorOpen: boolean;
	onToggleInspector: () => void;
	onOpenPalette: () => void;
	onCompactContext?: () => void;
}

export function Topbar({
	sessions,
	activeSessionId,
	onSelectSession,
	onCloseSession,
	onNewSession,
	models: _models,
	selectedModel,
	onSelectModel: _onSelectModel,
	contextPercent = 15,
	totalChars = 4500,
	inspectorOpen,
	onToggleInspector,
	onOpenPalette,
	onCompactContext,
}: TopbarProps) {
	const location = useLocation();
	const appSettings = useAppSettings();
	const [showContextPopover, setShowContextPopover] = useState(false);
	const [, setAgentRefreshTick] = useState(0);
	const contextMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleAgentChange = () => setAgentRefreshTick((t) => t + 1);
		window.addEventListener("agent_session_changed", handleAgentChange);
		return () => window.removeEventListener("agent_session_changed", handleAgentChange);
	}, []);

	const pathSegment = location.pathname.split("/").filter(Boolean)[0] || "";
	const currentTitle = SECTION_LABELS[pathSegment] ?? "Chats";
	const isChatView = location.pathname === "/" || location.pathname.startsWith("/chat");

	// Estimated token division
	const estTotalTokens = Math.max(120, Math.round(totalChars / 4));
	const systemTokens = 1450;
	const toolsTokens = 2100;
	const historyTokens = Math.max(0, estTotalTokens - 3550);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
				setShowContextPopover(false);
			}
		}
		if (showContextPopover) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [showContextPopover]);

	return (
		<header className="topbar">
			{/* Breadcrumbs */}
			<nav className="breadcrumbs" aria-label="Ruta de navegación">
				<Link to="/" className="breadcrumb-root">
					engine-agent
				</Link>
				<span className="breadcrumb-sep" aria-hidden="true">
					/
				</span>
				<span className="breadcrumb-current" aria-current="page">
					{currentTitle}
				</span>
			</nav>

			{/* Multi-chat Tabs (Visible in Chat View) */}
			{isChatView && sessions.length > 0 && (
				<div className="chat-tabs-bar" style={{ flex: 1, margin: "0 14px", minWidth: 0 }}>
					{(() => {
						const sortedSessions = [...sessions].sort((a, b) => {
							const aPinned = a.tags?.includes("pinned") ? 1 : 0;
							const bPinned = b.tags?.includes("pinned") ? 1 : 0;
							if (aPinned !== bPinned) return bPinned - aPinned;
							return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
						});

						return sortedSessions.slice(0, 4).map((s) => {
							const isPinned = s.tags?.includes("pinned");
							const agentTag =
								getAgentForSession(s.id) || s.tags?.find((t) => t !== "pinned") || "asistente";
							const dotColor = AGENT_COLORS[agentTag] || "#3b82f6";
							const isActive = s.id === activeSessionId;
							const displayName = s.name || `Chat ${s.id.slice(0, 6)}`;

							return (
								<div
									key={s.id}
									className={`chat-tab-chip ${isActive ? "active" : ""}`}
									onClick={() => onSelectSession(s.id)}
									onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectSession(s.id)}
									role="tab"
									tabIndex={0}
								>
									{isPinned ? (
										<span
											title="Chat Fijado"
											style={{ display: "inline-flex", alignItems: "center" }}
										>
											<PinFilledIcon size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
										</span>
									) : (
										<span
											className="model-dot"
											style={{
												background: dotColor,
												boxShadow: isActive ? `0 0 8px ${dotColor}` : undefined,
												flexShrink: 0,
											}}
											title={`Agente: ${agentTag}`}
										/>
									)}
									<span
										className="chat-tab-title"
										style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}
									>
										{displayName}
									</span>
									<button
										type="button"
										className="chat-tab-close"
										onClick={(e) => {
											e.stopPropagation();
											onCloseSession(s.id);
										}}
										title="Cerrar pestaña"
									>
										<XIcon size={11} />
									</button>
								</div>
							);
						});
					})()}
					<button
						type="button"
						className="chat-tab-chip new-tab"
						onClick={onNewSession}
						title="Nueva conversación"
						style={{
							padding: "4px 8px",
							cursor: "pointer",
							background: "transparent",
							border: "1px dashed var(--border)",
						}}
					>
						<PlusIcon size={12} />
					</button>
				</div>
			)}

			{/* Topbar Right Controls */}
			<div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
				{/* Model Status Badge (Configurable in Settings) */}
				<Link
					to="/settings"
					className="model-badge-selector static"
					title={`Modelo activo: ${selectedModel} (Clic para configurar en Ajustes)`}
					style={{
						textDecoration: "none",
						display: "flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<span className="model-dot" style={{ background: "#3b82f6" }} />
					<span>{selectedModel}</span>
				</Link>

				{/* Context Breakdown Button & Popover */}
				<div ref={contextMenuRef} style={{ position: "relative" }}>
					<button
						type="button"
						className="model-tag-badge"
						style={{
							background:
								contextPercent >= 85 ? "rgba(248, 113, 113, 0.15)" : "rgba(59, 130, 246, 0.1)",
							color: contextPercent >= 85 ? "var(--danger)" : "var(--accent)",
							border: "1px solid rgba(59, 130, 246, 0.25)",
							cursor: "pointer",
							padding: "4px 8px",
						}}
						onClick={() => setShowContextPopover((prev) => !prev)}
						title="Ver desglose y gestión de ventana de contexto"
					>
						Contexto {contextPercent}%
					</button>

					{showContextPopover && (
						<div className="context-breakdown-popover">
							<div
								style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
							>
								<span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text)" }}>
									Uso de Ventana de Contexto
								</span>
								<span style={{ fontSize: "11px", color: "var(--muted)" }}>
									{estTotalTokens.toLocaleString()} / 32,768 tok
								</span>
							</div>

							<div className="context-bar-segmented">
								<div className="context-seg-system" style={{ width: "25%" }} />
								<div className="context-seg-tools" style={{ width: "35%" }} />
								<div
									className="context-seg-history"
									style={{ width: `${Math.min(40, contextPercent)}%` }}
								/>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								<div className="context-item-row">
									<span>
										<span className="context-dot" style={{ background: "#8b5cf6" }} />
										System Prompt & Agente
									</span>
									<span style={{ fontFamily: "var(--font-mono)" }}>
										~{systemTokens.toLocaleString()} tok
									</span>
								</div>
								<div className="context-item-row">
									<span>
										<span className="context-dot" style={{ background: "#3b82f6" }} />
										Tools & Skills Schema
									</span>
									<span style={{ fontFamily: "var(--font-mono)" }}>
										~{toolsTokens.toLocaleString()} tok
									</span>
								</div>
								<div className="context-item-row">
									<span>
										<span className="context-dot" style={{ background: "#10b981" }} />
										Historial Conversacional
									</span>
									<span style={{ fontFamily: "var(--font-mono)" }}>
										~{historyTokens.toLocaleString()} tok
									</span>
								</div>
							</div>

							<button
								type="button"
								className="btn-compact"
								onClick={() => {
									setShowContextPopover(false);
									onCompactContext?.();
								}}
								title="Compactar y resumir contexto manteniendo información clave"
							>
								<SparklesIcon size={14} />
								<span>Compactar Contexto</span>
							</button>
						</div>
					)}
				</div>

				{/* Command Palette Trigger */}
				<button
					type="button"
					className="action-icon-btn"
					onClick={onOpenPalette}
					title="Paleta de comandos (Ctrl+K)"
				>
					<CommandIcon size={16} />
				</button>

				{/* Theme Toggle */}
				<button
					type="button"
					className="action-icon-btn"
					onClick={appSettings.toggleTheme}
					title={`Cambiar a tema ${appSettings.theme === "dark" ? "claro" : "oscuro"}`}
				>
					{appSettings.theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
				</button>

				{/* Right Inspector Toggle Button (in Chat view) */}
				{isChatView && (
					<button
						type="button"
						className={`action-icon-btn ${inspectorOpen ? "active" : ""}`}
						onClick={onToggleInspector}
						title={inspectorOpen ? "Ocultar panel inspector" : "Mostrar panel inspector"}
						style={{
							color: inspectorOpen ? "var(--accent)" : "var(--muted)",
							background: inspectorOpen ? "rgba(59, 130, 246, 0.15)" : undefined,
						}}
					>
						<PanelRightIcon size={16} />
					</button>
				)}
			</div>
		</header>
	);
}
