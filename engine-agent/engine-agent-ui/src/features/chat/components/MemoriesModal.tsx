import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createMemory, deleteMemory, fetchMemories, type MemoryItem } from "../../../api.ts";
import {
	LightbulbIcon,
	PlusIcon,
	SearchIcon,
	SparklesIcon,
	TrashIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import { useToast } from "../../../providers/ToastProvider.tsx";

interface MemoriesModalProps {
	onClose: () => void;
}

export function MemoriesModal({ onClose }: MemoriesModalProps) {
	const { addToast } = useToast();
	const [memories, setMemories] = useState<MemoryItem[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [showAddForm, setShowAddForm] = useState(false);
	const [newKey, setNewKey] = useState("");
	const [newContent, setNewContent] = useState("");
	const [newTags, setNewTags] = useState("");

	const loadData = async (q = "") => {
		try {
			setLoading(true);
			const list = await fetchMemories(q);
			setMemories(list);
		} catch (err) {
			console.warn("[memories] Error cargando memorias:", err);
			addToast("Error al cargar memorias del agente", "error");
		} finally {
			setLoading(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: initial mount only
	useEffect(() => {
		loadData();
	}, []);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		loadData(searchQuery.trim());
	};

	const handleDelete = async (key: string) => {
		try {
			await deleteMemory(key);
			setMemories((prev) => prev.filter((m) => m.key !== key));
			addToast(`Memoria "${key}" eliminada`, "info");
		} catch {
			addToast(`Error al eliminar la memoria "${key}"`, "error");
		}
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		const key = newKey.trim();
		const content = newContent.trim();
		if (!key || !content) return;

		const tags = newTags
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		try {
			const created = await createMemory(key, content, tags);
			setMemories((prev) => [created, ...prev.filter((m) => m.key !== key)]);
			setNewKey("");
			setNewContent("");
			setNewTags("");
			setShowAddForm(false);
			addToast(`Memoria "${key}" guardada correctamente`, "success");
		} catch {
			addToast("Error al crear la memoria", "error");
		}
	};

	return createPortal(
		<div className="dialog-backdrop">
			<button
				type="button"
				className="dialog-backdrop-btn"
				onClick={onClose}
				aria-label="Cerrar modal"
			/>
			<div
				className="dialog-card memories-dialog"
				style={{
					zIndex: 1,
					position: "relative",
					maxWidth: "680px",
					width: "90vw",
					maxHeight: "80vh",
					display: "flex",
					flexDirection: "column",
					padding: "20px",
					overflow: "hidden",
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "16px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<LightbulbIcon size={20} style={{ color: "var(--accent)" }} />
						<h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>
							Memorias del Asistente
						</h2>
					</div>
					<button
						type="button"
						className="session-action-btn"
						onClick={onClose}
						title="Cerrar"
						style={{ opacity: 1 }}
					>
						<XIcon size={18} />
					</button>
				</div>

				<p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "14px" }}>
					Información persistente que el agente recuerda sobre vos, tus proyectos y preferencias
					para responder de forma personalizada.
				</p>

				{/* Search & Actions Bar */}
				<div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
					<form
						onSubmit={handleSearch}
						style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}
					>
						<SearchIcon
							size={15}
							style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }}
						/>
						<input
							type="text"
							placeholder="Buscar memorias..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								if (!e.target.value.trim()) {
									loadData("");
								}
							}}
							style={{
								width: "100%",
								padding: "8px 10px 8px 32px",
								background: "var(--bg-surface)",
								border: "1px solid var(--border-default)",
								borderRadius: "var(--r-sm)",
								color: "var(--text-primary)",
								fontSize: "13px",
							}}
						/>
					</form>
					<button
						type="button"
						onClick={() => setShowAddForm(!showAddForm)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							padding: "8px 12px",
							background: showAddForm ? "var(--bg-surface-active)" : "var(--accent-subtle)",
							color: "var(--accent)",
							border: "1px solid var(--accent-glow)",
							borderRadius: "var(--r-sm)",
							fontSize: "12.5px",
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						<PlusIcon size={14} />
						<span>{showAddForm ? "Cancelar" : "Nueva Memoria"}</span>
					</button>
				</div>

				{/* Add Memory Form */}
				{showAddForm && (
					<form
						onSubmit={handleCreate}
						style={{
							background: "var(--bg-surface)",
							border: "1px solid var(--border-strong)",
							borderRadius: "var(--r-sm)",
							padding: "14px",
							marginBottom: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "10px",
						}}
					>
						<div style={{ display: "flex", gap: "8px" }}>
							<input
								type="text"
								placeholder="Clave (ej. nombre_usuario, framework_favorito)"
								value={newKey}
								onChange={(e) => setNewKey(e.target.value)}
								required
								style={{
									flex: 1,
									padding: "6px 10px",
									background: "var(--bg-app)",
									border: "1px solid var(--border-default)",
									borderRadius: "6px",
									color: "var(--text-primary)",
									fontSize: "12.5px",
								}}
							/>
							<input
								type="text"
								placeholder="Tags separados por coma (ej. personal, dev)"
								value={newTags}
								onChange={(e) => setNewTags(e.target.value)}
								style={{
									flex: 1,
									padding: "6px 10px",
									background: "var(--bg-app)",
									border: "1px solid var(--border-default)",
									borderRadius: "6px",
									color: "var(--text-primary)",
									fontSize: "12.5px",
								}}
							/>
						</div>
						<textarea
							placeholder="Contenido de la memoria..."
							value={newContent}
							onChange={(e) => setNewContent(e.target.value)}
							required
							rows={2}
							style={{
								padding: "8px 10px",
								background: "var(--bg-app)",
								border: "1px solid var(--border-default)",
								borderRadius: "6px",
								color: "var(--text-primary)",
								fontSize: "12.5px",
								resize: "vertical",
							}}
						/>
						<button
							type="submit"
							style={{
								alignSelf: "flex-end",
								padding: "6px 14px",
								background: "var(--accent)",
								color: "#0f172a",
								border: "none",
								borderRadius: "6px",
								fontWeight: 600,
								fontSize: "12.5px",
								cursor: "pointer",
							}}
						>
							Guardar Memoria
						</button>
					</form>
				)}

				{/* Memories List */}
				<div
					style={{
						flex: 1,
						overflowY: "auto",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					{loading ? (
						<div
							style={{
								textAlign: "center",
								padding: "30px",
								color: "var(--text-muted)",
								fontSize: "13px",
							}}
						>
							Cargando memorias...
						</div>
					) : memories.length === 0 ? (
						<div
							style={{
								textAlign: "center",
								padding: "40px 20px",
								color: "var(--text-muted)",
								fontSize: "13px",
							}}
						>
							<SparklesIcon size={28} style={{ opacity: 0.4, marginBottom: "8px" }} />
							<div>No se encontraron memorias activas.</div>
							<div style={{ fontSize: "11.5px", opacity: 0.7, marginTop: "4px" }}>
								Podés pedirle al agente en el chat que memorice algo o agregarla arriba.
							</div>
						</div>
					) : (
						memories.map((m) => (
							<div
								key={m.key}
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
									padding: "10px 14px",
									background: "var(--bg-card)",
									border: "1px solid var(--border-subtle)",
									borderRadius: "var(--r-sm)",
									gap: "10px",
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											marginBottom: "4px",
										}}
									>
										<span style={{ fontWeight: 600, fontSize: "13px", color: "var(--accent)" }}>
											{m.key}
										</span>
										{m.tags?.map((tag) => (
											<span
												key={tag}
												style={{
													fontSize: "10.5px",
													padding: "1px 6px",
													background: "var(--bg-surface)",
													border: "1px solid var(--border-subtle)",
													borderRadius: "4px",
													color: "var(--text-muted)",
												}}
											>
												#{tag}
											</span>
										))}
									</div>
									<div
										style={{
											fontSize: "12.5px",
											color: "var(--text-primary)",
											whiteSpace: "pre-wrap",
											wordBreak: "break-word",
										}}
									>
										{m.content}
									</div>
								</div>
								<button
									type="button"
									className="session-action-btn delete"
									onClick={() => handleDelete(m.key)}
									title={`Eliminar memoria "${m.key}"`}
									style={{ opacity: 0.7 }}
								>
									<TrashIcon size={14} />
								</button>
							</div>
						))
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
