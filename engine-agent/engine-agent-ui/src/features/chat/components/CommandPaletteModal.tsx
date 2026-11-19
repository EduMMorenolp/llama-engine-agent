import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	DownloadIcon,
	FileCodeIcon,
	ForkIcon,
	LightbulbIcon,
	PlusIcon,
	SearchIcon,
	SlidersIcon,
	SparklesIcon,
} from "../../../components/ui/Icons.tsx";
import { useAppSettings } from "../../../lib/useAppSettings.ts";
import { useSessions } from "../../sessions/hooks/useSessions.ts";

interface CommandPaletteModalProps {
	onClose: () => void;
	onOpenMemories: () => void;
	onOpenSettings: () => void;
	onExportChat: () => void;
}

interface PaletteAction {
	id: string;
	title: string;
	subtitle?: string;
	category: "Comandos" | "Conversaciones" | "Preferencias";
	icon: React.ReactNode;
	run: () => void;
}

export function CommandPaletteModal({
	onClose,
	onOpenMemories,
	onOpenSettings,
	onExportChat,
}: CommandPaletteModalProps) {
	const { sessions, selectSession, createNewSession, activeSessionId, forkSession } = useSessions();
	const { theme, updateSettings } = useAppSettings();
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const actions: PaletteAction[] = [
		{
			id: "new-chat",
			title: "Nuevo Chat",
			subtitle: "Iniciar una conversación limpia",
			category: "Comandos",
			icon: <PlusIcon size={16} />,
			run: () => {
				createNewSession();
				onClose();
			},
		},
		{
			id: "toggle-theme",
			title: `Cambiar a tema ${theme === "dark" ? "Claro" : "Oscuro"}`,
			subtitle: "Alternar paleta visual de la aplicación",
			category: "Preferencias",
			icon: <SparklesIcon size={16} style={{ color: "var(--accent)" }} />,
			run: () => {
				updateSettings({ theme: theme === "dark" ? "light" : "dark" });
				onClose();
			},
		},
		{
			id: "memories",
			title: "Memorias del Asistente",
			subtitle: "Ver, buscar o editar memorias persistentes",
			category: "Comandos",
			icon: <LightbulbIcon size={16} style={{ color: "var(--accent)" }} />,
			run: () => {
				onClose();
				onOpenMemories();
			},
		},
		{
			id: "fork",
			title: "Bifurcar Chat Actual (Fork)",
			subtitle: "Crear una copia ramificada de la conversación activa",
			category: "Comandos",
			icon: <ForkIcon size={16} />,
			run: () => {
				if (activeSessionId) {
					forkSession("");
				}
				onClose();
			},
		},
		{
			id: "export",
			title: "Exportar Chat Actual",
			subtitle: "Descargar la conversación en Markdown o JSON",
			category: "Comandos",
			icon: <DownloadIcon size={16} />,
			run: () => {
				onClose();
				onExportChat();
			},
		},
		{
			id: "settings",
			title: "Configuración y Parámetros",
			subtitle: "Ajustar temperatura, razonamiento, APIs y modelos",
			category: "Preferencias",
			icon: <SlidersIcon size={16} />,
			run: () => {
				onClose();
				onOpenSettings();
			},
		},
	];

	// Agregar sesiones activas a la búsqueda
	for (const s of sessions.slice(0, 15)) {
		actions.push({
			id: `session-${s.id}`,
			title: s.name || "Nuevo Chat",
			subtitle: `Chat guardado · ${new Date(s.updatedAt || s.createdAt).toLocaleDateString()}`,
			category: "Conversaciones",
			icon: <FileCodeIcon size={16} style={{ opacity: 0.7 }} />,
			run: () => {
				selectSession(s.id);
				onClose();
			},
		});
	}

	const filtered = actions.filter((a) => {
		const q = query.toLowerCase().trim();
		if (!q) return true;
		return (
			a.title.toLowerCase().includes(q) ||
			a.subtitle?.toLowerCase().includes(q) ||
			a.category.toLowerCase().includes(q)
		);
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset index on query change
	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const target = filtered[selectedIndex];
			if (target) target.run();
		} else if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		}
	};

	return createPortal(
		<div className="dialog-backdrop">
			<button
				type="button"
				className="dialog-backdrop-btn"
				onClick={onClose}
				aria-label="Cerrar paleta de comandos"
			/>
			<div
				className="dialog-card command-palette-dialog"
				style={{
					zIndex: 1,
					position: "relative",
					maxWidth: "560px",
					width: "90vw",
					maxHeight: "440px",
					display: "flex",
					flexDirection: "column",
					padding: 0,
					overflow: "hidden",
					boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
				}}
			>
				{/* Search Bar */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						padding: "12px 16px",
						borderBottom: "1px solid var(--border-default)",
						gap: "10px",
					}}
				>
					<SearchIcon size={17} style={{ color: "var(--accent)", flexShrink: 0 }} />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Escribe un comando o busca una conversación..."
						style={{
							flex: 1,
							background: "none",
							border: "none",
							color: "var(--text-primary)",
							fontSize: "14px",
							outline: "none",
						}}
					/>
					<span
						style={{
							fontSize: "11px",
							padding: "2px 6px",
							borderRadius: "4px",
							background: "var(--bg-card)",
							border: "1px solid var(--border-subtle)",
							color: "var(--text-muted)",
						}}
					>
						ESC
					</span>
				</div>

				{/* Results List */}
				<div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
					{filtered.length === 0 ? (
						<div
							style={{
								padding: "24px",
								textAlign: "center",
								color: "var(--text-muted)",
								fontSize: "13px",
							}}
						>
							No se encontraron resultados para "{query}"
						</div>
					) : (
						filtered.map((item, idx) => {
							const isSelected = idx === selectedIndex;
							return (
								<button
									key={item.id}
									type="button"
									onClick={item.run}
									onMouseEnter={() => setSelectedIndex(idx)}
									style={{
										display: "flex",
										alignItems: "center",
										width: "100%",
										padding: "10px 12px",
										background: isSelected ? "var(--bg-surface-active)" : "transparent",
										border: isSelected ? "1px solid var(--border-glow)" : "1px solid transparent",
										borderRadius: "6px",
										textAlign: "left",
										cursor: "pointer",
										color: "inherit",
										gap: "12px",
										marginBottom: "2px",
									}}
								>
									<span
										style={{
											color: isSelected ? "var(--accent)" : "var(--text-muted)",
											flexShrink: 0,
										}}
									>
										{item.icon}
									</span>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontSize: "13px",
												fontWeight: isSelected ? 600 : 500,
												color: "var(--text-primary)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{item.title}
										</div>
										{item.subtitle && (
											<div
												style={{
													fontSize: "11px",
													color: "var(--text-muted)",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
											>
												{item.subtitle}
											</div>
										)}
									</div>
									<span
										style={{
											fontSize: "10.5px",
											color: "var(--text-dim)",
											background: "var(--bg-surface)",
											padding: "2px 6px",
											borderRadius: "4px",
											border: "1px solid var(--border-subtle)",
											flexShrink: 0,
										}}
									>
										{item.category}
									</span>
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
