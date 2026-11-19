import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchTools, type Tool, updateTool } from "../../../api.ts";
import {
	CheckIcon,
	CopyIcon,
	SearchIcon,
	SlidersIcon,
	SparklesIcon,
	WrenchIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import { useToast } from "../../../providers/ToastProvider.tsx";
import { useSessions } from "../../sessions/hooks/useSessions.ts";

export function ToolsPage() {
	const navigate = useNavigate();
	const { addToast } = useToast();
	const { createNewSession } = useSessions();

	const [tools, setTools] = useState<Tool[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

	// Edit mode state
	const [isEditing, setIsEditing] = useState(false);
	const [editDescription, setEditDescription] = useState("");
	const [saving, setSaving] = useState(false);
	const [copied, setCopied] = useState(false);

	const loadTools = () => {
		setLoading(true);
		fetchTools()
			.then((res) => {
				setTools(res);
				// Exclude MCP tools to keep native separation
				const native = res.filter((t) => !t.name.startsWith("mcp_"));
				if (native.length > 0 && !selectedTool) {
					setSelectedTool(native[0]);
				} else if (selectedTool) {
					const updated = native.find((t) => t.name === selectedTool.name);
					if (updated) setSelectedTool(updated);
				}
				setLoading(false);
			})
			.catch(() => {
				setLoading(false);
			});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: initial mount only
	useEffect(() => {
		loadTools();
	}, []);

	// Filter strictly native tools (MCP belongs in /mcp)
	const nativeTools = tools.filter((t) => !t.name.startsWith("mcp_"));

	const filteredTools = nativeTools.filter((t) => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase().trim();
		return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
	});

	const handleSelectTool = (tool: Tool) => {
		setSelectedTool(tool);
		setIsEditing(false);
		setEditDescription(tool.description);
	};

	const handleToggleEnabled = async () => {
		if (!selectedTool) return;
		const nextState = !selectedTool.enabled;
		try {
			await updateTool(selectedTool.name, { enabled: nextState });
			const updated = { ...selectedTool, enabled: nextState };
			setSelectedTool(updated);
			setTools((prev) => prev.map((t) => (t.name === selectedTool.name ? updated : t)));
			addToast(
				`Herramienta "${selectedTool.name}" ${nextState ? "activada" : "deshabilitada"}`,
				"success",
			);
		} catch (err) {
			addToast(
				`Error al actualizar herramienta: ${err instanceof Error ? err.message : "Error del servidor"}`,
				"error",
			);
		}
	};

	const handleStartEdit = () => {
		if (!selectedTool) return;
		setEditDescription(selectedTool.description);
		setIsEditing(true);
	};

	const handleSaveEdit = async () => {
		if (!selectedTool) return;
		const trimmed = editDescription.trim();
		if (!trimmed) {
			addToast("La descripción no puede estar vacía", "error");
			return;
		}

		setSaving(true);
		try {
			await updateTool(selectedTool.name, { description: trimmed });
			const updated = { ...selectedTool, description: trimmed };
			setSelectedTool(updated);
			setTools((prev) => prev.map((t) => (t.name === selectedTool.name ? updated : t)));
			setIsEditing(false);
			addToast(`Descripción de "${selectedTool.name}" actualizada`, "success");
		} catch (err) {
			addToast(
				`Error al actualizar herramienta: ${err instanceof Error ? err.message : "Error del servidor"}`,
				"error",
			);
		} finally {
			setSaving(false);
		}
	};

	const handleCopySchema = () => {
		if (!selectedTool) return;
		const schemaObj = selectedTool.spec || {
			type: "function",
			function: {
				name: selectedTool.name,
				description: selectedTool.description,
				parameters: selectedTool.parameters || { type: "object", properties: {} },
			},
		};
		navigator.clipboard.writeText(JSON.stringify(schemaObj, null, 2));
		setCopied(true);
		addToast("Esquema JSON copiado al portapapeles", "info");
		setTimeout(() => setCopied(false), 2000);
	};

	const handleAskAgentAboutTool = async () => {
		if (!selectedTool) return;
		const prompt = `Hola, quiero consultar y analizar la herramienta nativa "${selectedTool.name}". 
Su descripción actual es: "${selectedTool.description}".
¿En qué escenarios el agente decide invocarla y cómo se pueden optimizar sus parámetros de ejecución?`;
		try {
			await createNewSession(`Herramienta: ${selectedTool.name}`);
			navigate(`/?draft=${encodeURIComponent(prompt)}`);
		} catch {
			navigate(`/?draft=${encodeURIComponent(prompt)}`);
		}
	};

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
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
							Herramientas Agénticas
						</h2>
						<span
							className="nav-badge"
							style={{
								fontSize: "11px",
								background: "rgba(59, 130, 246, 0.15)",
								color: "var(--accent)",
							}}
						>
							{nativeTools.length} nativas
						</span>
					</div>

					<p
						style={{
							fontSize: "12px",
							color: "var(--muted)",
							marginTop: "4px",
							marginBottom: "8px",
						}}
					>
						Herramientas del bucle ReAct del agente (sin mezclar con servidores MCP).
					</p>

					{/* Shortcut banner to MCP */}
					<div
						style={{
							padding: "6px 10px",
							borderRadius: "var(--r-sm)",
							background: "rgba(59, 130, 246, 0.06)",
							border: "1px solid rgba(59, 130, 246, 0.15)",
							fontSize: "11.5px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: "10px",
						}}
					>
						<span style={{ color: "var(--muted)" }}>¿Buscas herramientas MCP?</span>
						<Link
							to="/mcp"
							style={{
								color: "var(--accent)",
								fontWeight: 600,
								textDecoration: "none",
								fontSize: "11.5px",
							}}
						>
							Ver Servidores MCP →
						</Link>
					</div>

					{/* Filter input */}
					<div
						style={{
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
							placeholder="Filtrar tools nativas..."
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
								<XIcon size={12} />
							</button>
						)}
					</div>
				</div>

				{/* Tools List items */}
				<div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
					{loading ? (
						<div style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}>
							Cargando tools nativas...
						</div>
					) : filteredTools.length === 0 ? (
						<div
							style={{
								padding: "16px",
								color: "var(--muted)",
								fontSize: "12.5px",
								textAlign: "center",
							}}
						>
							No se encontraron herramientas con ese filtro
						</div>
					) : (
						filteredTools.map((t) => {
							const isSelected = selectedTool?.name === t.name;
							return (
								<button
									type="button"
									key={t.name}
									onClick={() => handleSelectTool(t)}
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
												fontFamily: "var(--font-mono)",
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

			{/* Right Column: Tool Detail, Actions & Schema */}
			<div style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
				{selectedTool ? (
					<div style={{ maxWidth: "780px", display: "flex", flexDirection: "column", gap: "20px" }}>
						{/* Detail Header */}
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
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									flexWrap: "wrap",
									gap: "10px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
									<div
										style={{
											width: "36px",
											height: "36px",
											borderRadius: "var(--r-sm)",
											background: "rgba(59, 130, 246, 0.15)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--accent)",
										}}
									>
										<WrenchIcon size={20} />
									</div>
									<div>
										<h1
											style={{
												fontSize: "18px",
												fontWeight: 700,
												color: "var(--text)",
												margin: 0,
												fontFamily: "var(--font-mono)",
											}}
										>
											{selectedTool.name}
										</h1>
										<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
											Herramienta nativa del sistema
										</span>
									</div>
								</div>

								{/* Controls: Enable/Disable Switch + Actions */}
								<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											background: "rgba(255, 255, 255, 0.03)",
											padding: "6px 10px",
											borderRadius: "var(--r-sm)",
											border: "1px solid var(--border)",
										}}
									>
										<label
											className="switch-control"
											aria-label={`Alternar estado de ${selectedTool.name}`}
										>
											<input
												type="checkbox"
												checked={selectedTool.enabled}
												onChange={handleToggleEnabled}
											/>
											<span className="switch-slider" />
										</label>
										<span
											style={{
												fontSize: "12px",
												fontWeight: 600,
												color: selectedTool.enabled ? "#10b981" : "var(--muted)",
											}}
										>
											{selectedTool.enabled ? "Activa" : "Deshabilitada"}
										</span>
									</div>

									<button
										type="button"
										className="btn-secondary"
										onClick={handleAskAgentAboutTool}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "6px",
											padding: "6px 12px",
											fontSize: "12px",
										}}
										title="Consultar al agente en una nueva conversación sobre esta herramienta"
									>
										<SparklesIcon size={13} />
										<span>Asistir en Chat</span>
									</button>
								</div>
							</div>

							{/* Description & Editor */}
							<div>
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
										Descripción de Comportamiento (Prompt de la Tool)
									</span>
									{!isEditing && (
										<button
											type="button"
											onClick={handleStartEdit}
											style={{
												background: "transparent",
												border: "none",
												color: "var(--accent)",
												fontSize: "11.5px",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												gap: "4px",
											}}
										>
											<SlidersIcon size={12} />
											<span>Modificar Descripción</span>
										</button>
									)}
								</div>

								{isEditing ? (
									<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
										<textarea
											rows={3}
											value={editDescription}
											onChange={(e) => setEditDescription(e.target.value)}
											style={{
												width: "100%",
												padding: "8px 10px",
												background: "var(--bg)",
												border: "1px solid var(--accent)",
												borderRadius: "var(--r-sm)",
												color: "var(--text)",
												fontSize: "13px",
												lineHeight: "1.5",
												outline: "none",
												resize: "vertical",
											}}
										/>
										<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
											<button
												type="button"
												className="btn-secondary"
												onClick={() => setIsEditing(false)}
												style={{ padding: "5px 12px", fontSize: "12px" }}
											>
												Cancelar
											</button>
											<button
												type="button"
												disabled={saving}
												onClick={handleSaveEdit}
												style={{
													background: "var(--accent)",
													color: "#080b12",
													border: "none",
													padding: "5px 14px",
													borderRadius: "var(--r-sm)",
													fontSize: "12px",
													fontWeight: 600,
													cursor: saving ? "not-allowed" : "pointer",
												}}
											>
												{saving ? "Guardando..." : "Guardar Cambios"}
											</button>
										</div>
									</div>
								) : (
									<p
										style={{
											fontSize: "13.5px",
											color: "var(--text)",
											margin: 0,
											lineHeight: "1.5",
											background: "rgba(255, 255, 255, 0.02)",
											padding: "10px 12px",
											borderRadius: "var(--r-sm)",
											border: "1px solid var(--border)",
										}}
									>
										{selectedTool.description}
									</p>
								)}
							</div>
						</div>

						{/* Schema Details */}
						<div
							style={{
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-md)",
								padding: "18px",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: "10px",
								}}
							>
								<div>
									<span
										style={{
											fontSize: "12px",
											fontWeight: 700,
											color: "var(--text)",
											textTransform: "uppercase",
										}}
									>
										Esquema Formal JSON-RPC (Function Calling)
									</span>
									<p style={{ fontSize: "11.5px", color: "var(--muted)", margin: "2px 0 0 0" }}>
										Estructura exacta de llamada y parámetros enviada al modelo LLM.
									</p>
								</div>

								<button
									type="button"
									className="btn-secondary"
									onClick={handleCopySchema}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "6px",
										padding: "5px 10px",
										fontSize: "11.5px",
									}}
								>
									{copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
									<span>{copied ? "Copiado" : "Copiar JSON"}</span>
								</button>
							</div>

							<pre
								style={{
									marginTop: "8px",
									background: "rgba(0, 0, 0, 0.45)",
									padding: "14px",
									borderRadius: "var(--r-sm)",
									fontFamily: "var(--font-mono)",
									fontSize: "12px",
									color: "#e2e8f0",
									overflowX: "auto",
									lineHeight: "1.5",
									border: "1px solid var(--border)",
								}}
							>
								{JSON.stringify(
									selectedTool.spec || {
										type: "function",
										function: {
											name: selectedTool.name,
											description: selectedTool.description,
											parameters: selectedTool.parameters || {
												type: "object",
												properties: {},
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
					<div
						style={{
							height: "100%",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--muted)",
							gap: "10px",
						}}
					>
						<WrenchIcon size={32} style={{ color: "var(--border)" }} />
						<span style={{ fontSize: "13px" }}>
							Selecciona una herramienta nativa para inspeccionar y configurar sus especificaciones.
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
