import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchFavoriteMessages, type Message, updateSessionMessage } from "../../../api.ts";
import { MessageSquareIcon, StarIcon, XIcon } from "../../../components/ui/Icons.tsx";
import { useToast } from "../../../providers/ToastProvider.tsx";

interface FavoritesModalProps {
	onClose: () => void;
	onSelectSession: (sessionId: string) => void;
}

interface FavoriteItem {
	message: Message;
	session: { id: string; name: string | null };
}

export function FavoritesModal({ onClose, onSelectSession }: FavoritesModalProps) {
	const { addToast } = useToast();
	const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchFavoriteMessages(50)
			.then((items) => {
				setFavorites(items || []);
			})
			.catch((err) => {
				console.error("[FavoritesModal] Error loading favorites:", err);
				addToast("Error al cargar mensajes favoritos", "error");
			})
			.finally(() => setLoading(false));
	}, [addToast]);

	const handleUnfavorite = async (sessionId: string, messageId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await updateSessionMessage(sessionId, messageId, { favorite: false });
			setFavorites((prev) => prev.filter((f) => f.message.id !== messageId));
			addToast("Mensaje removido de favoritos", "info");
		} catch {
			addToast("Error al actualizar favorito", "error");
		}
	};

	const handleOpenMessage = (sessionId: string) => {
		onSelectSession(sessionId);
		onClose();
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
				className="dialog-card favorites-dialog"
				style={{
					maxWidth: "640px",
					width: "90vw",
					maxHeight: "80vh",
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
					gap: "16px",
					zIndex: 1,
					position: "relative",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						borderBottom: "1px solid var(--border-subtle)",
						paddingBottom: "12px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<StarIcon size={20} filled style={{ color: "#fbbf24" }} />
						<div>
							<h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
								Mensajes Guardados ({favorites.length})
							</h2>
							<span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
								Respuestas y mensajes destacados de tus sesiones
							</span>
						</div>
					</div>
					<button
						type="button"
						className="session-action-btn"
						onClick={onClose}
						title="Cerrar modal"
						style={{ opacity: 1 }}
					>
						<XIcon size={18} />
					</button>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{loading ? (
						<div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
							Cargando favoritos...
						</div>
					) : favorites.length === 0 ? (
						<div
							style={{
								padding: "32px 16px",
								textAlign: "center",
								color: "var(--text-muted)",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "8px",
							}}
						>
							<StarIcon size={28} style={{ opacity: 0.3 }} />
							<span>No tenés mensajes guardados todavía.</span>
							<span style={{ fontSize: "12px", opacity: 0.7 }}>
								Hacé clic en la estrella de cualquier mensaje para guardarlo aquí.
							</span>
						</div>
					) : (
						favorites.map(({ message, session }) => {
							const sessionTitle = session.name || `Chat ${session.id.slice(0, 6)}`;
							const preview = (message.content || "").slice(0, 200);

							return (
								<button
									type="button"
									key={message.id}
									className="session-item"
									onClick={() => handleOpenMessage(session.id)}
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "6px",
										padding: "10px 12px",
										background: "var(--bg-app)",
										borderRadius: "var(--r-md)",
										border: "1px solid var(--border-subtle)",
										cursor: "pointer",
										textAlign: "left",
										width: "100%",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											width: "100%",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<MessageSquareIcon size={13} style={{ color: "var(--accent)" }} />
											<span
												style={{
													fontSize: "12px",
													fontWeight: 600,
													color: "var(--text-primary)",
												}}
											>
												{sessionTitle}
											</span>
											<span
												className="model-tag-badge"
												style={{ fontSize: "10px", padding: "1px 5px" }}
											>
												{message.role}
											</span>
										</div>

										<span
											className="action-icon-btn"
											title="Quitar de favoritos"
											onClick={(e) => handleUnfavorite(session.id, message.id, e)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													handleUnfavorite(session.id, message.id, e as any);
												}
											}}
											style={{ color: "#fbbf24", display: "inline-flex" }}
										>
											<StarIcon size={14} filled />
										</span>
									</div>

									<div
										style={{
											fontSize: "13px",
											color: "var(--text-secondary)",
											lineHeight: 1.4,
											whiteSpace: "pre-wrap",
											wordBreak: "break-word",
										}}
									>
										{preview}
										{(message.content?.length || 0) > 200 ? "..." : ""}
									</div>
								</button>
							);
						})
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
