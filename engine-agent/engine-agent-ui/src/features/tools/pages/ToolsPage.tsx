import { useEffect, useState } from "react";
import { fetchTools, type Tool } from "../../../api.ts";
import { SearchIcon, WrenchIcon } from "../../../components/ui/Icons.tsx";

export function ToolsPage() {
	const [tools, setTools] = useState<Tool[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

	useEffect(() => {
		fetchTools()
			.then((res) => {
				setTools(res);
				if (res.length > 0) setSelectedTool(res[0]);
				setLoading(false);
			})
			.catch(() => {
				setLoading(false);
			});
	}, []);

	const filteredTools = tools.filter((t) => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase().trim();
		return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
	});

	return (
		<div style={{ flex: 1, height: "100%", display: "flex", overflow: "hidden" }}>
			{/* Left Column: Tools List */}
			<div
				style={{
					width: "360px",
					borderRight: "1px solid var(--border)",
					display: "flex",
					flexDirection: "column",
					background: "var(--panel)",
				}}
			>
				<div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
					<h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
						Herramientas Agénticas
					</h2>
					<p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
						18 herramientas registradas en el bucle ReAct del agente.
					</p>

					<div
						style={{
							marginTop: "12px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							background: "var(--card)",
							border: "1px solid var(--border)",
							borderRadius: "var(--r-sm)",
							padding: "6px 10px",
						}}
					>
						<SearchIcon size={14} style={{ color: "var(--muted)" }} />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Filtrar tools..."
							style={{
								background: "transparent",
								border: "none",
								outline: "none",
								color: "var(--text)",
								fontSize: "12px",
								width: "100%",
							}}
						/>
					</div>
				</div>

				<div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
					{loading ? (
						<div style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}>
							Cargando tools...
						</div>
					) : (
						filteredTools.map((t) => {
							const isSelected = selectedTool?.name === t.name;
							return (
								<button
									type="button"
									key={t.name}
									onClick={() => setSelectedTool(t)}
									style={{
										padding: "10px 12px",
										borderRadius: "var(--r-sm)",
										background: isSelected ? "rgba(59, 130, 246, 0.12)" : "transparent",
										border: isSelected
											? "1px solid rgba(59, 130, 246, 0.25)"
											: "1px solid transparent",
										cursor: "pointer",
										marginBottom: "4px",
										width: "100%",
										textAlign: "left",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<span
											style={{
												fontWeight: 600,
												fontSize: "13px",
												color: isSelected ? "var(--accent)" : "var(--text)",
											}}
										>
											{t.name}
										</span>
										<span
											className="nav-badge"
											style={{
												background: t.enabled
													? "rgba(16, 185, 129, 0.15)"
													: "rgba(255, 255, 255, 0.05)",
												color: t.enabled ? "#10b981" : "var(--muted)",
												fontSize: "10px",
											}}
										>
											{t.enabled ? "Activa" : "Inactiva"}
										</span>
									</div>
									<p
										style={{
											fontSize: "11.5px",
											color: "var(--muted)",
											margin: "4px 0 0 0",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{t.description}
									</p>
								</button>
							);
						})
					)}
				</div>
			</div>

			{/* Right Column: Tool Detail & Tester */}
			<div style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
				{selectedTool ? (
					<div style={{ maxWidth: "720px", display: "flex", flexDirection: "column", gap: "20px" }}>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<div>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<WrenchIcon size={20} style={{ color: "var(--accent)" }} />
									<h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
										{selectedTool.name}
									</h1>
								</div>
								<p style={{ fontSize: "13.5px", color: "var(--muted)", marginTop: "6px" }}>
									{selectedTool.description}
								</p>
							</div>
						</div>

						{/* Schema Details */}
						<div
							style={{
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-md)",
								padding: "16px",
							}}
						>
							<span
								style={{
									fontSize: "12px",
									fontWeight: 700,
									color: "var(--text)",
									textTransform: "uppercase",
								}}
							>
								Esquema de Ejecución & Parámetros
							</span>
							<pre
								style={{
									marginTop: "10px",
									background: "rgba(0, 0, 0, 0.4)",
									padding: "12px",
									borderRadius: "var(--r-sm)",
									fontFamily: "var(--font-mono)",
									fontSize: "12px",
									color: "#e2e8f0",
									overflowX: "auto",
								}}
							>
								{JSON.stringify(
									{
										type: "function",
										function: {
											name: selectedTool.name,
											description: selectedTool.description,
											parameters: {
												type: "object",
												properties: {
													input: {
														type: "string",
														description: "Parámetros de ejecución para la tool",
													},
												},
											},
										},
									},
									null,
									2,
								)}
							</pre>
						</div>
					</div>
				) : (
					<div style={{ color: "var(--muted)" }}>
						Selecciona una herramienta para inspeccionar sus especificaciones.
					</div>
				)}
			</div>
		</div>
	);
}
