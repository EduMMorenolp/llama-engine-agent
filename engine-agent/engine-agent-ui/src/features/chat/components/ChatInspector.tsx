import { useEffect, useState } from "react";
import { fetchMemories, type MemoryItem } from "../../../api.ts";
import {
	BrainIcon,
	PlusIcon,
	ServerIcon,
	WrenchIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";

interface ChatInspectorProps {
	open: boolean;
	onClose: () => void;
	enabledTools: string[];
	onToggleTool: (toolName: string) => void;
	onOpenMemoriesModal: () => void;
}

export function ChatInspector({
	open,
	onClose,
	enabledTools,
	onToggleTool,
	onOpenMemoriesModal,
}: ChatInspectorProps) {
	const [memories, setMemories] = useState<MemoryItem[]>([]);

	useEffect(() => {
		const load = () => {
			fetchMemories()
				.then((mems) => setMemories(mems))
				.catch(() => {});
		};
		if (open) {
			load();
		}
		window.addEventListener("memories_updated", load);
		return () => window.removeEventListener("memories_updated", load);
	}, [open]);

	if (!open) {
		return null;
	}

	return (
		<aside className="chat-inspector" aria-label="Inspector de capacidades del agente">
			{/* Inspector Top Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					paddingBottom: "4px",
				}}
			>
				<span
					style={{
						fontSize: "12.5px",
						fontWeight: 700,
						color: "var(--text)",
						letterSpacing: "0.4px",
						textTransform: "uppercase",
					}}
				>
					Inspector Agéntico
				</span>
				<button
					type="button"
					className="session-action-btn"
					onClick={onClose}
					title="Cerrar panel inspector"
				>
					<XIcon size={14} />
				</button>
			</div>

			{/* Bloque 1: Toggles de Skills & MCP */}
			<div className="inspector-block">
				<div className="inspector-block-header">
					<span className="inspector-block-title">
						<WrenchIcon size={14} style={{ color: "var(--accent)" }} />
						Skills & MCP Activos
					</span>
					<span className="nav-badge" style={{ fontSize: "10px" }}>
						Live
					</span>
				</div>

				<div style={{ display: "flex", flexDirection: "column" }}>
					<div className="inspector-toggle-row">
						<div>
							<div style={{ fontWeight: 600, color: "var(--text)" }}>Búsqueda Web</div>
							<div style={{ fontSize: "10.5px", color: "var(--muted)" }}>web_search, web_fetch</div>
						</div>
						<label className="switch-control" aria-label="Alternar búsqueda web">
							<input
								type="checkbox"
								checked={enabledTools.includes("web_search")}
								onChange={() => onToggleTool("web_search")}
							/>
							<span className="switch-slider" />
						</label>
					</div>

					<div className="inspector-toggle-row">
						<div>
							<div style={{ fontWeight: 600, color: "var(--text)" }}>Terminal Bash</div>
							<div style={{ fontSize: "10.5px", color: "var(--muted)" }}>execute_bash, cli</div>
						</div>
						<label className="switch-control" aria-label="Alternar terminal bash">
							<input
								type="checkbox"
								checked={enabledTools.includes("execute_bash")}
								onChange={() => onToggleTool("execute_bash")}
							/>
							<span className="switch-slider" />
						</label>
					</div>

					<div className="inspector-toggle-row">
						<div>
							<div style={{ fontWeight: 600, color: "var(--text)" }}>Operaciones de Archivos</div>
							<div style={{ fontSize: "10.5px", color: "var(--muted)" }}>read_file, write_file</div>
						</div>
						<label className="switch-control" aria-label="Alternar operaciones de archivos">
							<input
								type="checkbox"
								checked={enabledTools.includes("read_file")}
								onChange={() => onToggleTool("read_file")}
							/>
							<span className="switch-slider" />
						</label>
					</div>

					<div className="inspector-toggle-row">
						<div>
							<div
								style={{
									fontWeight: 600,
									color: "var(--text)",
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								<ServerIcon size={11} style={{ color: "#10b981" }} />
								Servidor n8n-mcp
							</div>
							<div style={{ fontSize: "10.5px", color: "var(--muted)" }}>Conectado :5678</div>
						</div>
						<label className="switch-control" aria-label="Alternar servidor MCP">
							<input
								type="checkbox"
								checked={enabledTools.includes("mcp")}
								onChange={() => onToggleTool("mcp")}
							/>
							<span className="switch-slider" />
						</label>
					</div>
				</div>
			</div>

			{/* Bloque 2: Chips de Memorias Persistentes */}
			<div className="inspector-block">
				<div className="inspector-block-header">
					<span className="inspector-block-title">
						<BrainIcon size={14} style={{ color: "#a855f7" }} />
						Memorias Persistentes
						<span className="nav-badge" style={{ fontSize: "10px", marginLeft: "4px" }}>
							{memories.length}
						</span>
					</span>
					<button
						type="button"
						className="session-action-btn"
						onClick={onOpenMemoriesModal}
						title="Gestionar memorias completas"
					>
						<PlusIcon size={13} />
					</button>
				</div>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
					{memories.length > 0 ? (
						memories.map((m) => (
							<span
								key={m.key}
								className="nav-badge"
								style={{
									background: "rgba(168, 85, 247, 0.12)",
									color: "#c084fc",
									border: "1px solid rgba(168, 85, 247, 0.25)",
									padding: "3px 8px",
									fontSize: "11px",
									cursor: "default",
									maxWidth: "100%",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
								title={`${m.key}: ${m.content}`}
							>
								{m.key}
							</span>
						))
					) : (
						<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
							No hay memorias activas para esta sesión.
						</span>
					)}
				</div>
			</div>
		</aside>
	);
}
