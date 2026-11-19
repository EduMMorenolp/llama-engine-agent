import { useEffect, useState } from "react";
import {
	type ActividadAgenda,
	fetchDashboardFromN8N,
	fetchMemories,
	type HabitoConfig,
	type MemoryItem,
} from "../../../api.ts";
import {
	BrainIcon,
	CalendarIcon,
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
	const [agendaItems, setAgendaItems] = useState<ActividadAgenda[]>([
		{
			id: "1",
			hora: "09:00",
			actividad: "Revisar logs de Docker y Whisper",
			completada: true,
			recordado: true,
		},
		{
			id: "2",
			hora: "14:30",
			actividad: "Sincronización de skills con Qwen 4B",
			completada: false,
			recordado: false,
		},
		{
			id: "3",
			hora: "18:00",
			actividad: "Backup de base de datos Postgres",
			completada: false,
			recordado: false,
		},
	]);
	const [habits, setHabits] = useState<HabitoConfig[]>([
		{
			id: "h1",
			slug: "agua",
			nombre: "Tomar 2L de agua",
			hora: "08:00",
			pregunta_prompt: "",
			activa: true,
		},
		{
			id: "h2",
			slug: "ejercicio",
			nombre: "30 min de ejercicio o caminata",
			hora: "19:00",
			pregunta_prompt: "",
			activa: true,
		},
		{
			id: "h3",
			slug: "lectura",
			nombre: "Leer 15 páginas técnicas",
			hora: "21:30",
			pregunta_prompt: "",
			activa: true,
		},
	]);

	useEffect(() => {
		if (open) {
			fetchMemories()
				.then((mems) => setMemories(mems.slice(0, 8)))
				.catch(() => {});

			fetchDashboardFromN8N()
				.then((data) => {
					if (data.agenda_hoy && data.agenda_hoy.length > 0) {
						setAgendaItems(data.agenda_hoy);
					}
					if (data.habitos && data.habitos.length > 0) {
						setHabits(data.habitos);
					}
				})
				.catch(() => {
					// Fallback a agenda local de muestra
				});
		}
	}, [open]);

	const toggleAgendaItem = (id: string) => {
		setAgendaItems((prev) =>
			prev.map((item) => (item.id === id ? { ...item, completada: !item.completada } : item)),
		);
	};

	const toggleHabitItem = (id: string) => {
		setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, activa: !h.activa } : h)));
	};

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

			{/* Bloque 3: Resumen de Agenda y Hábitos del Día */}
			<div className="inspector-block">
				<div className="inspector-block-header">
					<span className="inspector-block-title">
						<CalendarIcon size={14} style={{ color: "#10b981" }} />
						Agenda & Hábitos de Hoy
					</span>
					<span className="nav-badge" style={{ fontSize: "10px" }}>
						Postgres
					</span>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							color: "var(--muted)",
							textTransform: "uppercase",
						}}
					>
						Agenda
					</span>
					{agendaItems.map((item) => (
						<label
							key={item.id}
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "8px",
								fontSize: "12px",
								cursor: "pointer",
								color: item.completada ? "var(--muted)" : "var(--text)",
								textDecoration: item.completada ? "line-through" : "none",
							}}
						>
							<input
								type="checkbox"
								checked={item.completada}
								onChange={() => toggleAgendaItem(item.id)}
								style={{ accentColor: "var(--accent)", marginTop: "2px" }}
							/>
							<div>
								<span style={{ fontWeight: 600, marginRight: "4px" }}>{item.hora}</span>
								<span>{item.actividad}</span>
							</div>
						</label>
					))}

					<div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />

					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							color: "var(--muted)",
							textTransform: "uppercase",
						}}
					>
						Hábitos Diarios
					</span>
					{habits.map((h) => (
						<label
							key={h.id}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								fontSize: "12px",
								cursor: "pointer",
								color: h.activa ? "var(--text)" : "var(--muted)",
							}}
						>
							<input
								type="checkbox"
								checked={h.activa}
								onChange={() => toggleHabitItem(h.id)}
								style={{ accentColor: "#10b981" }}
							/>
							<span>{h.nombre}</span>
						</label>
					))}
				</div>
			</div>
		</aside>
	);
}
