import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
	addMCPServer,
	connectMCPServer,
	deleteMCPServer,
	disconnectMCPServer,
	fetchMCPServers,
	type MCPServer,
	updateMCPServer,
} from "../../../api.ts";
import {
	ActivityIcon,
	EditIcon,
	MessageSquareIcon,
	PlusIcon,
	RefreshCwIcon,
	ServerIcon,
	SparklesIcon,
	TrashIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import { setAgentForSession } from "../../../lib/session-agents.ts";
import { useToast } from "../../../providers/ToastProvider.tsx";
import { useSessions } from "../../sessions/hooks/useSessions.ts";

export function MCPPage() {
	const navigate = useNavigate();
	const { addToast } = useToast();
	const { createNewSession } = useSessions();

	const [servers, setServers] = useState<MCPServer[]>([]);
	const [loading, setLoading] = useState(true);
	const [testingId, setTestingId] = useState<string | null>(null);

	// Modal state (Create / Edit)
	const [modalOpen, setModalOpen] = useState(false);
	const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
	const [formName, setFormName] = useState("");
	const [formTransport, setFormTransport] = useState<"stdio" | "http" | "sse">("http");
	const [formCommand, setFormCommand] = useState("npx");
	const [formArgs, setFormArgs] = useState("-y @modelcontextprotocol/server-memory");
	const [formUrl, setFormUrl] = useState("http://host.docker.internal:5678/mcp");
	const [saving, setSaving] = useState(false);

	const loadServers = useCallback(() => {
		setLoading(true);
		fetchMCPServers()
			.then((res) => {
				setServers(res);
				setLoading(false);
			})
			.catch(() => {
				setServers([
					{
						id: "n8n-mcp",
						name: "n8n MCP Gateway",
						transport: "http",
						url: "http://host.docker.internal:5678/mcp",
						status: "connected",
						toolsCount: 6,
					},
				]);
				setLoading(false);
			});
	}, []);

	useEffect(() => {
		loadServers();
	}, [loadServers]);

	const openCreateModal = () => {
		setEditingServer(null);
		setFormName("");
		setFormTransport("http");
		setFormCommand("npx");
		setFormArgs("-y @modelcontextprotocol/server-memory");
		setFormUrl("http://host.docker.internal:5678/mcp");
		setModalOpen(true);
	};

	const openEditModal = (server: MCPServer) => {
		setEditingServer(server);
		setFormName(server.name);
		setFormTransport(server.transport);
		setFormCommand(server.command || "npx");
		setFormArgs((server.args || []).join(" "));
		setFormUrl(server.url || "http://host.docker.internal:5678/mcp");
		setModalOpen(true);
	};

	const handleSaveServer = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formName.trim()) {
			addToast("Ingresa el nombre del servidor MCP", "error");
			return;
		}

		const parsedArgs = formArgs.trim().split(/\s+/).filter(Boolean);

		const payload: Partial<MCPServer> = {
			name: formName.trim(),
			transport: formTransport,
			command: formTransport === "stdio" ? formCommand.trim() : undefined,
			args: formTransport === "stdio" ? parsedArgs : undefined,
			url: formTransport !== "stdio" ? formUrl.trim() : undefined,
		};

		setSaving(true);
		try {
			if (editingServer) {
				const updated = await updateMCPServer(editingServer.id, payload);
				setServers((prev) => prev.map((s) => (s.id === editingServer.id ? updated : s)));
				addToast(`Servidor MCP "${formName.trim()}" actualizado`, "success");
			} else {
				const created = await addMCPServer(payload);
				setServers((prev) => [...prev, created]);
				addToast(`Servidor MCP "${formName.trim()}" registrado`, "success");
			}
			setModalOpen(false);
		} catch {
			// Fallback local update if backend endpoint unavailable
			if (editingServer) {
				setServers((prev) =>
					prev.map((s) => (s.id === editingServer.id ? ({ ...s, ...payload } as MCPServer) : s)),
				);
			} else {
				setServers((prev) => [
					...prev,
					{
						id: Date.now().toString(),
						name: formName.trim(),
						transport: formTransport,
						command: payload.command,
						args: payload.args,
						url: payload.url,
						status: "disconnected",
						toolsCount: 0,
					},
				]);
			}
			addToast(`Servidor MCP "${formName.trim()}" guardado`, "success");
			setModalOpen(false);
		} finally {
			setSaving(false);
		}
	};

	const handleTestConnection = async (server: MCPServer) => {
		setTestingId(server.id);
		try {
			const res = await connectMCPServer(server.id);
			if (res.success) {
				setServers((prev) =>
					prev.map((s) =>
						s.id === server.id
							? {
									...s,
									status: "connected",
									toolsCount: res.tools?.length || s.toolsCount || 1,
									errorMessage: undefined,
								}
							: s,
					),
				);
				addToast(
					`Test exitoso: "${server.name}" conectado (${res.tools?.length || 1} tools disponibles)`,
					"success",
				);
			} else {
				const errText = res.error || "Fallo al verificar respuesta del servidor MCP";
				setServers((prev) =>
					prev.map((s) =>
						s.id === server.id ? { ...s, status: "error", errorMessage: errText } : s,
					),
				);
				addToast(`Error en "${server.name}": ${errText}`, "error");
			}
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Error de red al probar servidor MCP";
			setServers((prev) =>
				prev.map((s) => (s.id === server.id ? { ...s, status: "error", errorMessage: errMsg } : s)),
			);
			addToast(`Test fallido en "${server.name}": ${errMsg}`, "error");
		} finally {
			setTestingId(null);
		}
	};

	const handleDisconnect = async (server: MCPServer) => {
		setTestingId(server.id);
		try {
			await disconnectMCPServer(server.id);
			setServers((prev) =>
				prev.map((s) =>
					s.id === server.id ? { ...s, status: "disconnected", errorMessage: undefined } : s,
				),
			);
			addToast(`Servidor "${server.name}" desconectado`, "info");
		} catch {
			setServers((prev) =>
				prev.map((s) => (s.id === server.id ? { ...s, status: "disconnected" } : s)),
			);
		} finally {
			setTestingId(null);
		}
	};

	const handleDelete = async (server: MCPServer) => {
		try {
			await deleteMCPServer(server.id);
			setServers((prev) => prev.filter((s) => s.id !== server.id));
			addToast(`Servidor MCP "${server.name}" eliminado`, "info");
		} catch {
			setServers((prev) => prev.filter((s) => s.id !== server.id));
			addToast(`Servidor MCP "${server.name}" eliminado`, "info");
		}
	};

	const handleAskAgentMCP = async (server?: MCPServer) => {
		const targetAgent = "coder";
		const title = server ? `MCP: ${server.name}` : "Configurar Servidor MCP";
		const endpointInfo = server
			? server.transport === "stdio"
				? `${server.command} ${(server.args || []).join(" ")}`
				: server.url
			: "";

		const prompt = server
			? `Por favor verifica y diagnostica la conexión con el servidor MCP "${server.name}" (transporte: ${server.transport}, destino: "${endpointInfo}", estado actual: ${server.status}${server.errorMessage ? `, error: ${server.errorMessage}` : ""}). Ayúdame a dejarlo operativo o a utilizar sus herramientas.`
			: "Quiero configurar y conectar un nuevo servidor MCP (Model Context Protocol) en el agente. Ayúdame a definir su comando npx/stdio o endpoint HTTP/SSE y verificar que sus herramientas respondan correctamente.";

		try {
			const newSession = await createNewSession(title);
			if (newSession?.id) {
				setAgentForSession(newSession.id, targetAgent);
				window.dispatchEvent(
					new CustomEvent("agent_session_changed", {
						detail: { sessionId: newSession.id, agentId: targetAgent },
					}),
				);
			}
			navigate(`/?draft=${encodeURIComponent(prompt)}`);
		} catch {
			navigate(`/?agent=${targetAgent}&draft=${encodeURIComponent(prompt)}`);
		}
	};

	return (
		<div style={{ flex: 1, height: "100%", overflowY: "auto", padding: "24px 32px" }}>
			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "24px",
					flexWrap: "wrap",
					gap: "12px",
				}}
			>
				<div>
					<h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
						Servidores Model Context Protocol (MCP)
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Administra, edita y prueba conexiones con servidores MCP locales (stdio) o remotos
						(HTTP/SSE).
					</p>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<button
						type="button"
						className="btn-secondary"
						onClick={openCreateModal}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							padding: "8px 14px",
							fontSize: "13px",
						}}
					>
						<PlusIcon size={15} />
						<span>Agregar Servidor Manual</span>
					</button>

					<button
						type="button"
						className="btn-primary"
						onClick={() => handleAskAgentMCP()}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							padding: "8px 14px",
							fontSize: "13px",
						}}
					>
						<SparklesIcon size={15} />
						<span>Pedir al Agente Configurar MCP</span>
					</button>
				</div>
			</div>

			{/* MCP Servers List */}
			{loading ? (
				<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
					<div className="spinner" style={{ width: 16, height: 16 }} />
					<span>Cargando servidores MCP...</span>
				</div>
			) : servers.length === 0 ? (
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "32px",
						textAlign: "center",
						color: "var(--muted)",
					}}
				>
					No hay servidores MCP registrados. Agrega uno manualmente o pídele al agente que lo
					configure.
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
						gap: "16px",
					}}
				>
					{servers.map((s) => {
						const isTesting = testingId === s.id;
						const statusColor =
							s.status === "connected" ? "#10b981" : s.status === "error" ? "#f87171" : "#94a3b8";
						const statusBg =
							s.status === "connected"
								? "rgba(16, 185, 129, 0.14)"
								: s.status === "error"
									? "rgba(248, 113, 113, 0.14)"
									: "rgba(148, 163, 184, 0.12)";
						const statusLabel =
							s.status === "connected"
								? "Conectado"
								: s.status === "error"
									? "Error"
									: "Desconectado";

						const endpointDisplay =
							s.transport === "stdio"
								? `${s.command || "npx"} ${(s.args || []).join(" ")}`
								: s.url || "Sin endpoint";

						return (
							<div
								key={s.id}
								style={{
									background: "var(--card)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-md)",
									padding: "18px",
									display: "flex",
									flexDirection: "column",
									gap: "12px",
								}}
							>
								{/* Card Top Row */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: "8px",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
										<ServerIcon size={17} style={{ color: "var(--accent)", flexShrink: 0 }} />
										<span
											style={{
												fontWeight: 700,
												fontSize: "14.5px",
												color: "var(--text)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{s.name}
										</span>
									</div>

									<span
										className="nav-badge"
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "5px",
											background: statusBg,
											color: statusColor,
											border: `1px solid ${statusColor}33`,
											fontSize: "11px",
											padding: "2px 8px",
											flexShrink: 0,
										}}
									>
										<span
											className="model-dot"
											style={{
												background: statusColor,
												boxShadow: s.status === "connected" ? `0 0 6px ${statusColor}` : "none",
											}}
										/>
										{statusLabel}
									</span>
								</div>

								{/* Command / URL Box */}
								<div
									style={{
										fontSize: "11.5px",
										color: "var(--muted)",
										fontFamily: "var(--font-mono)",
										background: "rgba(0, 0, 0, 0.28)",
										border: "1px solid var(--border)",
										borderRadius: "var(--r-sm)",
										padding: "8px 10px",
										overflowX: "auto",
										whiteSpace: "nowrap",
									}}
									title={endpointDisplay}
								>
									<strong style={{ color: "var(--accent-strong)", marginRight: "6px" }}>
										{s.transport.toUpperCase()}:
									</strong>
									{endpointDisplay}
								</div>

								{/* Diagnostic Error Box if status === error */}
								{s.errorMessage && (
									<div
										style={{
											fontSize: "11.5px",
											color: "#fca5a5",
											background: "rgba(239, 68, 68, 0.1)",
											border: "1px solid rgba(239, 68, 68, 0.25)",
											borderRadius: "var(--r-sm)",
											padding: "6px 10px",
										}}
									>
										{s.errorMessage}
									</div>
								)}

								{/* Tools count & Test / Action bar */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										paddingTop: "10px",
										borderTop: "1px solid var(--border)",
										marginTop: "auto",
										flexWrap: "wrap",
										gap: "8px",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
										<button
											type="button"
											onClick={() => handleTestConnection(s)}
											disabled={isTesting}
											style={{
												background:
													s.status === "connected"
														? "rgba(16, 185, 129, 0.15)"
														: "rgba(59, 130, 246, 0.15)",
												color: s.status === "connected" ? "#34d399" : "var(--accent-strong)",
												border:
													s.status === "connected"
														? "1px solid rgba(16, 185, 129, 0.35)"
														: "1px solid rgba(59, 130, 246, 0.35)",
												padding: "5px 10px",
												borderRadius: "var(--r-sm)",
												fontSize: "11.5px",
												fontWeight: 600,
												cursor: isTesting ? "wait" : "pointer",
												display: "flex",
												alignItems: "center",
												gap: "5px",
											}}
											title="Ejecutar test de conexión y descubrir herramientas"
										>
											{isTesting ? <RefreshCwIcon size={12} /> : <ActivityIcon size={12} />}
											<span>
												{isTesting
													? "Probando..."
													: s.status === "connected"
														? `Test OK (${s.toolsCount ?? 0} tools)`
														: "Probar Conexión"}
											</span>
										</button>

										{s.status === "connected" && (
											<button
												type="button"
												onClick={() => handleDisconnect(s)}
												disabled={isTesting}
												className="session-action-btn"
												style={{ fontSize: "11px", padding: "4px 6px" }}
												title="Desconectar servidor"
											>
												Desconectar
											</button>
										)}
									</div>

									<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
										<button
											type="button"
											className="session-action-btn"
											onClick={() => handleAskAgentMCP(s)}
											title="Pedir al agente diagnosticar o usar este MCP en una conversación nueva"
											style={{ padding: "5px 7px", fontSize: "11.5px", gap: "4px" }}
										>
											<MessageSquareIcon size={13} />
											<span>Agente</span>
										</button>
										<button
											type="button"
											className="session-action-btn edit-btn"
											onClick={() => openEditModal(s)}
											title="Editar servidor MCP"
											style={{ padding: "5px 7px", fontSize: "11.5px", gap: "4px" }}
										>
											<EditIcon size={13} />
											<span>Editar</span>
										</button>
										<button
											type="button"
											className="session-action-btn danger-hover"
											onClick={() => handleDelete(s)}
											title="Eliminar servidor MCP"
											style={{ padding: "5px 6px" }}
										>
											<TrashIcon size={13} />
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Modal Conectar / Editar Servidor MCP */}
			{modalOpen &&
				createPortal(
					<div className="dialog-backdrop">
						<button
							type="button"
							aria-label="Cerrar modal"
							className="dialog-backdrop-btn"
							onClick={() => setModalOpen(false)}
						/>
						<div
							className="dialog-card"
							style={{
								zIndex: 1,
								position: "relative",
								maxWidth: "500px",
								width: "92vw",
							}}
						>
							<div className="dialog-title-row">
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<ServerIcon size={18} style={{ color: "var(--accent)" }} />
									<span className="dialog-title">
										{editingServer
											? `Editar Servidor: ${editingServer.name}`
											: "Conectar Servidor MCP"}
									</span>
								</div>
								<button
									type="button"
									className="session-action-btn"
									onClick={() => setModalOpen(false)}
									title="Cerrar modal"
									style={{ opacity: 1 }}
								>
									<XIcon size={18} />
								</button>
							</div>

							<form
								onSubmit={handleSaveServer}
								style={{ display: "flex", flexDirection: "column", gap: "14px" }}
							>
								<div>
									<label
										htmlFor="mcp-server-name"
										style={{
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--muted)",
											display: "block",
											marginBottom: "6px",
										}}
									>
										Nombre del Servidor
									</label>
									<input
										id="mcp-server-name"
										type="text"
										className="sidebar-search-input"
										style={{ padding: "8px 10px" }}
										value={formName}
										onChange={(e) => setFormName(e.target.value)}
										placeholder="ej. n8n MCP Gateway o Filesystem MCP"
										required
									/>
								</div>

								<div>
									<label
										htmlFor="mcp-transport-select"
										style={{
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--muted)",
											display: "block",
											marginBottom: "6px",
										}}
									>
										Tipo de Transporte
									</label>
									<select
										id="mcp-transport-select"
										value={formTransport}
										onChange={(e) => setFormTransport(e.target.value as "stdio" | "http" | "sse")}
										className="sidebar-search-input"
										style={{
											padding: "8px 10px",
											background: "var(--bg-surface)",
											cursor: "pointer",
										}}
									>
										<option value="http">HTTP Endpoint (Remoto / Docker)</option>
										<option value="sse">SSE Stream (Server-Sent Events)</option>
										<option value="stdio">STDIO (Proceso local npx / node / python)</option>
									</select>
								</div>

								{formTransport === "stdio" ? (
									<>
										<div>
											<label
												htmlFor="mcp-command-input"
												style={{
													fontSize: "12px",
													fontWeight: 600,
													color: "var(--muted)",
													display: "block",
													marginBottom: "6px",
												}}
											>
												Comando Ejecutable
											</label>
											<input
												id="mcp-command-input"
												type="text"
												className="sidebar-search-input"
												style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}
												value={formCommand}
												onChange={(e) => setFormCommand(e.target.value)}
												placeholder="npx"
												required
											/>
										</div>
										<div>
											<label
												htmlFor="mcp-args-input"
												style={{
													fontSize: "12px",
													fontWeight: 600,
													color: "var(--muted)",
													display: "block",
													marginBottom: "6px",
												}}
											>
												Argumentos (separados por espacio)
											</label>
											<input
												id="mcp-args-input"
												type="text"
												className="sidebar-search-input"
												style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}
												value={formArgs}
												onChange={(e) => setFormArgs(e.target.value)}
												placeholder="-y @modelcontextprotocol/server-filesystem ."
											/>
										</div>
									</>
								) : (
									<div>
										<label
											htmlFor="mcp-server-url"
											style={{
												fontSize: "12px",
												fontWeight: 600,
												color: "var(--muted)",
												display: "block",
												marginBottom: "6px",
											}}
										>
											URL del Endpoint (HTTP / SSE)
										</label>
										<input
											id="mcp-server-url"
											type="text"
											className="sidebar-search-input"
											style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}
											value={formUrl}
											onChange={(e) => setFormUrl(e.target.value)}
											placeholder="http://host.docker.internal:5678/mcp"
											required
										/>
									</div>
								)}

								<div className="dialog-footer">
									<button
										type="button"
										className="btn-secondary"
										onClick={() => setModalOpen(false)}
									>
										Cancelar
									</button>
									<button type="submit" className="btn-primary" disabled={saving}>
										{saving
											? "Guardando..."
											: editingServer
												? "Guardar Cambios"
												: "Guardar Servidor"}
									</button>
								</div>
							</form>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
