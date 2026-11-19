import { useEffect, useState } from "react";
import { type ActividadAgenda, fetchDashboardFromN8N, type HabitoConfig } from "../../../api.ts";
import { CalendarIcon, CheckSquareIcon } from "../../../components/ui/Icons.tsx";

export function AgendaPage() {
	const [agendaItems, setAgendaItems] = useState<ActividadAgenda[]>([
		{
			id: "1",
			hora: "08:30",
			actividad: "Planificación del día y revisión de correos",
			completada: true,
			recordado: true,
		},
		{
			id: "2",
			hora: "11:00",
			actividad: "Verificar sincronización de n8n con PostgreSQL",
			completada: true,
			recordado: true,
		},
		{
			id: "3",
			hora: "15:00",
			actividad: "Entrenamiento y benchmarking de Qwen 3.5 en local",
			completada: false,
			recordado: false,
		},
		{
			id: "4",
			hora: "19:30",
			actividad: "Revisión de pull requests y commit de changelog",
			completada: false,
			recordado: false,
		},
	]);

	const [habits, setHabits] = useState<HabitoConfig[]>([
		{
			id: "h1",
			slug: "agua",
			nombre: "Tomar 2 Litros de Agua",
			hora: "08:00",
			pregunta_prompt: "",
			activa: true,
		},
		{
			id: "h2",
			slug: "ejercicio",
			nombre: "Caminata o Ejercicio Físico (30 min)",
			hora: "18:00",
			pregunta_prompt: "",
			activa: true,
		},
		{
			id: "h3",
			slug: "lectura",
			nombre: "Lectura Técnica / Papers de IA (20 min)",
			hora: "21:30",
			pregunta_prompt: "",
			activa: true,
		},
		{
			id: "h4",
			slug: "postura",
			nombre: "Pausas Activas y Estiramiento",
			hora: "14:00",
			pregunta_prompt: "",
			activa: true,
		},
	]);

	useEffect(() => {
		fetchDashboardFromN8N()
			.then((data) => {
				if (data.agenda_hoy && data.agenda_hoy.length > 0) setAgendaItems(data.agenda_hoy);
				if (data.habitos && data.habitos.length > 0) setHabits(data.habitos);
			})
			.catch(() => {});
	}, []);

	const toggleAgenda = (id: string) => {
		setAgendaItems((prev) =>
			prev.map((a) => (a.id === id ? { ...a, completada: !a.completada } : a)),
		);
	};

	const toggleHabit = (id: string) => {
		setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, activa: !h.activa } : h)));
	};

	return (
		<div style={{ flex: 1, height: "100%", overflowY: "auto", padding: "24px 32px" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "24px",
				}}
			>
				<div>
					<h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
						Agenda & Hábitos Diarios
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Sincronización proactiva con PostgreSQL 16 y bot de Telegram a través de n8n.
					</p>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
					gap: "24px",
				}}
			>
				{/* Agenda Block */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "14px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<CalendarIcon size={18} style={{ color: "var(--accent)" }} />
							<span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text)" }}>
								Eventos y Tareas de Hoy
							</span>
						</div>
						<span className="nav-badge" style={{ fontSize: "10.5px" }}>
							{agendaItems.filter((i) => i.completada).length}/{agendaItems.length} completados
						</span>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						{agendaItems.map((item) => (
							<label
								key={item.id}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "12px",
									padding: "10px 12px",
									background: "var(--card-strong)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-sm)",
									cursor: "pointer",
									color: item.completada ? "var(--muted)" : "var(--text)",
									textDecoration: item.completada ? "line-through" : "none",
								}}
							>
								<input
									type="checkbox"
									checked={item.completada}
									onChange={() => toggleAgenda(item.id)}
									style={{ accentColor: "var(--accent)", width: "16px", height: "16px" }}
								/>
								<div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
									<span
										style={{
											fontFamily: "var(--font-mono)",
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--accent)",
										}}
									>
										{item.hora}
									</span>
									<span style={{ fontSize: "13px" }}>{item.actividad}</span>
								</div>
							</label>
						))}
					</div>
				</div>

				{/* Hábitos Block */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "14px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<CheckSquareIcon size={18} style={{ color: "#10b981" }} />
							<span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text)" }}>
								Rastreador de Hábitos
							</span>
						</div>
						<span className="nav-badge" style={{ fontSize: "10.5px" }}>
							Diario
						</span>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						{habits.map((h) => (
							<label
								key={h.id}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "12px",
									padding: "10px 12px",
									background: "var(--card-strong)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-sm)",
									cursor: "pointer",
								}}
							>
								<input
									type="checkbox"
									checked={h.activa}
									onChange={() => toggleHabit(h.id)}
									style={{ accentColor: "#10b981", width: "16px", height: "16px" }}
								/>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										flex: 1,
									}}
								>
									<span
										style={{ fontSize: "13px", color: h.activa ? "var(--text)" : "var(--muted)" }}
									>
										{h.nombre}
									</span>
									<span
										style={{
											fontFamily: "var(--font-mono)",
											fontSize: "11px",
											color: "var(--muted)",
										}}
									>
										{h.hora}
									</span>
								</div>
							</label>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
