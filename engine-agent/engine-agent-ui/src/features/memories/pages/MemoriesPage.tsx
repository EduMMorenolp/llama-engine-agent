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
					<div className="dialog-content" style={{ maxWidth: 460 }}>
						<div className="dialog-header">
							<h3>Crear Nueva Memoria</h3>
							<button
								type="button"
								className="action-icon-btn"
								onClick={() => setShowAddModal(false)}
							>
								<XIcon size={16} />
							</button>
						</div>

						<form
							onSubmit={handleCreate}
							style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}
						>
							<div>
								<label
									htmlFor="mem-key-input"
									style={{
										fontSize: "12px",
										color: "var(--muted)",
										display: "block",
										marginBottom: "4px",
									}}
								>
									Clave / Identificador
								</label>
								<input
									id="mem-key-input"
									type="text"
									className="text-input"
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
										color: "var(--muted)",
										display: "block",
										marginBottom: "4px",
									}}
								>
									Contenido / Hecho
								</label>
								<textarea
									id="mem-content-input"
									className="text-input"
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
										color: "var(--muted)",
										display: "block",
										marginBottom: "4px",
									}}
								>
									Etiquetas (separadas por coma)
								</label>
								<input
									id="mem-tags-input"
									type="text"
									className="text-input"
									value={newTags}
									onChange={(e) => setNewTags(e.target.value)}
									placeholder="frontend, dev, preferencia"
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
