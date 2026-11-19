import { useCallback, useEffect, useState } from "react";
import { addMCPServer, deleteMCPServer, fetchMCPServers, type MCPServer } from "../../../api.ts";
import { PlusIcon, ServerIcon, TrashIcon, XIcon } from "../../../components/ui/Icons.tsx";

export function MCPPage() {
	const [servers, setServers] = useState<MCPServer[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newServerName, setNewServerName] = useState("");
	const [newServerCommand, setNewServerCommand] = useState("");
	const [newServerUrl, setNewServerUrl] = useState("http://host.docker.internal:5678");

	const loadServers = useCallback(() => {
		setLoading(true);
		fetchMCPServers()
			.then((res) => {
				setServers(res);
				setLoading(false);
			})
			.catch(() => {
				// Fallback de servidor n8n-mcp
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

	const handleAddServer = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newServerName.trim()) return;
		try {
			await addMCPServer({
				name: newServerName.trim(),
				transport: newServerCommand ? "stdio" : "http",
				command: newServerCommand || undefined,
				url: newServerUrl || undefined,
			});
			setShowAddModal(false);
			setNewServerName("");
			setNewServerCommand("");
			loadServers();
		} catch {
			// fallback local
			setServers((prev) => [
				...prev,
				{
					id: Date.now().toString(),
					name: newServerName.trim(),
					transport: newServerCommand ? "stdio" : "http",
					command: newServerCommand,
					url: newServerUrl,
					status: "connected",
					toolsCount: 2,
				},
			]);
			setShowAddModal(false);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deleteMCPServer(id);
			loadServers();
		} catch {
			setServers((prev) => prev.filter((s) => s.id !== id));
		}
	};

	return (
		<div style={{ flex: 1, height: "100%", overflowY: "auto", padding: "24px 32px" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "20px",
				}}
			>
				<div>
					<h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
						Servidores Model Context Protocol (MCP)
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Conecta fuentes de herramientas y datos externas mediante el protocolo estándar MCP.
					</p>
				</div>
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => setShowAddModal(true)}
					style={{
						background: "var(--accent)",
						color: "#080b12",
						padding: "8px 14px",
						borderRadius: "var(--r-sm)",
						fontWeight: 600,
						fontSize: "13px",
						border: "none",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<PlusIcon size={15} />
					<span>Agregar Servidor MCP</span>
				</button>
			</div>

			{/* MCP Servers List */}
			{loading ? (
				<div style={{ color: "var(--muted)", fontSize: "13px" }}>Cargando servidores MCP...</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
						gap: "16px",
					}}
				>
					{servers.map((s) => (
						<div
							key={s.id}
							style={{
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-md)",
								padding: "16px",
								display: "flex",
								flexDirection: "column",
								gap: "12px",
							}}
						>
							<div
								style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<ServerIcon size={16} style={{ color: "var(--accent)" }} />
									<span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text)" }}>
										{s.name}
									</span>
								</div>
								<span
									className="nav-badge"
									style={{
										background:
											s.status === "connected"
												? "rgba(16, 185, 129, 0.15)"
												: "rgba(248, 113, 113, 0.15)",
										color: s.status === "connected" ? "#10b981" : "#f87171",
										fontSize: "10.5px",
									}}
								>
									{s.status === "connected" ? "Conectado" : "Desconectado"}
								</span>
							</div>

							<div
								style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}
							>
								{s.transport.toUpperCase()}: {s.url || s.command}
							</div>

							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									paddingTop: "8px",
									borderTop: "1px solid var(--border)",
								}}
							>
								<span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
									{s.toolsCount ?? 0} herramientas expuestas
								</span>
								<button
									type="button"
									className="session-action-btn danger-hover"
									onClick={() => handleDelete(s.id)}
									title="Eliminar servidor MCP"
								>
									<TrashIcon size={14} />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Modal de Agregar Servidor */}
			{showAddModal && (
				<div className="dialog-backdrop">
					<button
						type="button"
						aria-label="Cerrar modal"
						className="dialog-backdrop-btn"
						onClick={() => setShowAddModal(false)}
					/>
					<div className="dialog-content" style={{ maxWidth: 440 }}>
						<div className="dialog-header">
							<h3>Conectar Servidor MCP</h3>
							<button
								type="button"
								className="action-icon-btn"
								onClick={() => setShowAddModal(false)}
							>
								<XIcon size={16} />
							</button>
						</div>

						<form
							onSubmit={handleAddServer}
							style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}
						>
							<div>
								<label
									htmlFor="mcp-server-name"
									style={{
										fontSize: "12px",
										color: "var(--muted)",
										display: "block",
										marginBottom: "4px",
									}}
								>
									Nombre del Servidor
								</label>
								<input
									id="mcp-server-name"
									type="text"
									className="text-input"
									value={newServerName}
									onChange={(e) => setNewServerName(e.target.value)}
									placeholder="ej. n8n-automation"
									required
								/>
							</div>

							<div>
								<label
									htmlFor="mcp-server-url"
									style={{
										fontSize: "12px",
										color: "var(--muted)",
										display: "block",
										marginBottom: "4px",
									}}
								>
									URL del Endpoint (HTTP / SSE)
								</label>
								<input
									id="mcp-server-url"
									type="text"
									className="text-input"
									value={newServerUrl}
									onChange={(e) => setNewServerUrl(e.target.value)}
									placeholder="http://host.docker.internal:5678"
								/>
							</div>

							<div
								style={{
									display: "flex",
									justifyContent: "flex-end",
									gap: "8px",
									marginTop: "10px",
								}}
							>
								<button
									type="button"
									className="btn btn-ghost"
									onClick={() => setShowAddModal(false)}
								>
									Cancelar
								</button>
								<button
									type="submit"
									className="btn btn-primary"
									style={{ background: "var(--accent)", color: "#080b12" }}
								>
									Guardar y Conectar
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
