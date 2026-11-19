import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMemory, deleteMemory, fetchMemories, type MemoryItem } from "../../../api.ts";
import {
	BrainIcon,
	MessageSquareIcon,
	PlusIcon,
	SearchIcon,
	TrashIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";

export function MemoriesPage() {
	const navigate = useNavigate();
	const [memories, setMemories] = useState<MemoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [showAddModal, setShowAddModal] = useState(false);
	const [newKey, setNewKey] = useState("");
	const [newContent, setNewContent] = useState("");
	const [newTags, setNewTags] = useState("");

	const loadMemories = useCallback(() => {
		setLoading(true);
		fetchMemories(searchQuery)
			.then((res) => {
				setMemories(res);
				setLoading(false);
			})
			.catch(() => {
				setLoading(false);
			});
	}, [searchQuery]);

	useEffect(() => {
		loadMemories();
	}, [loadMemories]);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newKey.trim() || !newContent.trim()) return;
		const tagsArr = newTags
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		try {
			await createMemory(newKey.trim(), newContent.trim(), tagsArr);
			setShowAddModal(false);
			setNewKey("");
			setNewContent("");
			setNewTags("");
			loadMemories();
		} catch {
			// ignore
		}
	};

	const handleDelete = async (key: string) => {
		try {
			await deleteMemory(key);
			loadMemories();
		} catch {
			setMemories((prev) => prev.filter((m) => m.key !== key));
		}
	};

	const handleAskAgentToRemember = () => {
		navigate(
			"/?draft=" +
				encodeURIComponent(
					"Por favor analiza mis conversaciones recientes y consolida los hechos más importantes en memorias persistentes.",
				),
		);
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
						Base de Conocimiento & Memorias
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Hechos, preferencias y contexto persistente inyectado en el prompt de inferencia del
						LLM.
					</p>
				</div>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						type="button"
						className="btn btn-ghost"
						onClick={handleAskAgentToRemember}
						style={{
							border: "1px solid var(--border)",
							padding: "8px 14px",
							borderRadius: "var(--r-sm)",
							fontSize: "13px",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<MessageSquareIcon size={14} />
						<span>Consolidar con Agente</span>
					</button>
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
						<span>Nueva Memoria</span>
					</button>
				</div>
			</div>

			{/* Search Filter */}
			<div style={{ marginBottom: "20px", maxWidth: "420px" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-sm)",
						padding: "6px 12px",
					}}
				>
					<SearchIcon size={15} style={{ color: "var(--muted)" }} />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Buscar memorias..."
						style={{
							background: "transparent",
							border: "none",
							outline: "none",
							color: "var(--text)",
							fontSize: "13px",
							width: "100%",
						}}
					/>
				</div>
			</div>

			{/* Grid of Memories */}
			{loading ? (
				<div style={{ color: "var(--muted)", fontSize: "13px" }}>
					Cargando memorias persistentes...
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
						gap: "16px",
					}}
				>
					{memories.map((m) => (
						<div
							key={m.key}
							style={{
								background: "var(--card)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-md)",
								padding: "16px",
								display: "flex",
								flexDirection: "column",
								gap: "10px",
							}}
						>
							<div
								style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
									<BrainIcon size={16} style={{ color: "#a855f7", flexShrink: 0 }} />
									<span
										style={{
											fontWeight: 700,
											fontSize: "13.5px",
											color: "var(--text)",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{m.key}
									</span>
								</div>
								<button
									type="button"
									className="session-action-btn danger-hover"
									onClick={() => handleDelete(m.key)}
									title="Eliminar memoria"
								>
									<TrashIcon size={13} />
								</button>
							</div>

							<p
								style={{ fontSize: "12.5px", color: "var(--muted)", margin: 0, minHeight: "42px" }}
							>
								{m.content}
							</p>

							{m.tags && m.tags.length > 0 && (
								<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
									{m.tags.map((t) => (
										<span
											key={t}
											className="nav-badge"
											style={{
												fontSize: "10.5px",
												background: "rgba(168, 85, 247, 0.12)",
												color: "#c084fc",
												border: "1px solid rgba(168, 85, 247, 0.25)",
											}}
										>
											#{t}
										</span>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* Modal Crear Memoria */}
			{showAddModal && (
				<div className="dialog-backdrop">
					<button
						type="button"
						aria-label="Cerrar modal"
						className="dialog-backdrop-btn"
						onClick={() => setShowAddModal(false)}
					/>
					<div
						className="dialog-card"
						style={{
							zIndex: 1,
							position: "relative",
							maxWidth: "480px",
							width: "92vw",
						}}
					>
						<div className="dialog-title-row">
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<BrainIcon size={18} style={{ color: "var(--accent)" }} />
								<span className="dialog-title">Crear Nueva Memoria</span>
							</div>
							<button
								type="button"
								className="session-action-btn"
								onClick={() => setShowAddModal(false)}
								style={{ opacity: 1 }}
							>
								<XIcon size={18} />
							</button>
						</div>

						<form
							onSubmit={handleCreate}
							style={{ display: "flex", flexDirection: "column", gap: "14px" }}
						>
							<div>
								<label
									htmlFor="mem-key-input"
									style={{
										fontSize: "12px",
										fontWeight: 600,
										color: "var(--muted)",
										display: "block",
										marginBottom: "6px",
									}}
								>
									Clave / Identificador
								</label>
								<input
									id="mem-key-input"
									type="text"
									className="sidebar-search-input"
									style={{ padding: "8px 10px" }}
									value={newKey}
									onChange={(e) => setNewKey(e.target.value)}
									placeholder="ej. preferencia_stack"
									required
								/>
							</div>

							<div>
								<label
									htmlFor="mem-content-input"
									style={{
										fontSize: "12px",
										fontWeight: 600,
										color: "var(--muted)",
										display: "block",
										marginBottom: "6px",
									}}
								>
									Contenido / Hecho
								</label>
								<textarea
									id="mem-content-input"
									className="dialog-textarea"
									rows={3}
									value={newContent}
									onChange={(e) => setNewContent(e.target.value)}
									placeholder="ej. El usuario prefiere TypeScript estricto y Tailwind CSS..."
									required
								/>
							</div>

							<div>
								<label
									htmlFor="mem-tags-input"
									style={{
										fontSize: "12px",
										fontWeight: 600,
										color: "var(--muted)",
										display: "block",
										marginBottom: "6px",
									}}
								>
									Etiquetas (separadas por coma)
								</label>
								<input
									id="mem-tags-input"
									type="text"
									className="sidebar-search-input"
									style={{ padding: "8px 10px" }}
									value={newTags}
									onChange={(e) => setNewTags(e.target.value)}
									placeholder="frontend, dev, preferencia"
								/>
							</div>

							<div className="dialog-footer">
								<button
									type="button"
									className="btn-secondary"
									onClick={() => setShowAddModal(false)}
								>
									Cancelar
								</button>
								<button type="submit" className="btn-primary">
									Guardar Memoria
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
