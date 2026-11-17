import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	type AgentDefinition,
	deleteAgent,
	fetchAvailableModels,
	fetchTools,
	type ModelInfo,
	type Tool,
	updateAgent,
} from "../../../api.ts";
import { SparklesIcon, TrashIcon, WrenchIcon, XIcon } from "../../../components/ui/Icons.tsx";
import { useToast } from "../../../providers/ToastProvider.tsx";

interface AgentEditModalProps {
	agent: AgentDefinition;
	onClose: () => void;
	onSaved: (updated: AgentDefinition) => void;
	onDeleted: (agentName: string) => void;
}

export function AgentEditModal({ agent, onClose, onSaved, onDeleted }: AgentEditModalProps) {
	const { addToast } = useToast();
	const [description, setDescription] = useState(agent.description || "");
	const [corePrompt, setCorePrompt] = useState(agent.corePrompt || "");
	const [model, setModel] = useState(agent.model || "");
	const [maxIterations, setMaxIterations] = useState(agent.maxIterations || 10);
	const [enabled, setEnabled] = useState(agent.enabled ?? true);
	const [selectedTools, setSelectedTools] = useState<string[]>(agent.tools || []);
	const [availableTools, setAvailableTools] = useState<Tool[]>([]);
	const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchTools()
			.then((tools) => {
				if (tools) setAvailableTools(tools);
			})
			.catch(() => {});

		fetchAvailableModels()
			.then((res) => {
				if (res?.models) setAvailableModels(res.models);
			})
			.catch(() => {});
	}, []);

	const handleToggleTool = (toolName: string) => {
		setSelectedTools((prev) =>
			prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName],
		);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const updated = await updateAgent(agent.name, {
				description,
				corePrompt,
				model: model.trim() || undefined,
				maxIterations: Number(maxIterations),
				enabled,
				tools: selectedTools,
			});
			addToast(`Agente "${agent.name}" actualizado correctamente`, "success");
			onSaved(updated);
			onClose();
		} catch (err) {
			console.error("[AgentEditModal] Error saving agent:", err);
			addToast("Error al guardar los cambios del agente", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (window.confirm(`¿Estás seguro de eliminar permanentemente al agente "${agent.name}"?`)) {
			try {
				await deleteAgent(agent.name);
				addToast(`Agente "${agent.name}" eliminado`, "info");
				onDeleted(agent.name);
				onClose();
			} catch {
				addToast("Error al eliminar el agente", "error");
			}
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
				className="dialog-card agent-edit-dialog"
				style={{
					maxWidth: "680px",
					width: "90vw",
					maxHeight: "85vh",
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
						<SparklesIcon size={20} style={{ color: "var(--accent)" }} />
						<div>
							<h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
								Configurar Agente: {agent.name}
							</h2>
							<span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
								Personaliza el comportamiento, modelo y herramientas del agente
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

				<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
					{/* Description */}
					<div className="settings-input-block">
						<label htmlFor="agent-desc" className="settings-item-title">
							Descripción
						</label>
						<input
							id="agent-desc"
							type="text"
							className="sidebar-search-input"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Breve descripción del rol del agente..."
						/>
					</div>

					{/* Core Prompt */}
					<div className="settings-input-block">
						<label htmlFor="agent-prompt" className="settings-item-title">
							System Prompt / Instrucciones Principales
						</label>
						<textarea
							id="agent-prompt"
							className="sidebar-search-input"
							value={corePrompt}
							onChange={(e) => setCorePrompt(e.target.value)}
							rows={6}
							placeholder="Define las instrucciones del sistema, objetivos y límites del agente..."
							style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "13px" }}
						/>
					</div>

					{/* Model Selection & Max Iterations */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						<div className="settings-input-block">
							<label htmlFor="agent-model" className="settings-item-title">
								Modelo Específico
							</label>
							<select
								id="agent-model"
								className="sidebar-search-input"
								value={model}
								onChange={(e) => setModel(e.target.value)}
								style={{ height: "36px" }}
							>
								<option value="">Por defecto del sistema</option>
								{availableModels.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name || m.id}
									</option>
								))}
							</select>
						</div>

						<div className="settings-input-block">
							<label htmlFor="agent-iters" className="settings-item-title">
								Máx. Iteraciones ({maxIterations})
							</label>
							<input
								id="agent-iters"
								type="number"
								min="1"
								max="30"
								className="sidebar-search-input"
								value={maxIterations}
								onChange={(e) => setMaxIterations(Math.max(1, Number(e.target.value)))}
								style={{ height: "36px" }}
							/>
						</div>
					</div>

					{/* Enabled Toggle */}
					<div className="settings-toggle-row" style={{ padding: "8px 0" }}>
						<div>
							<div className="settings-item-title">Agente Habilitado</div>
							<div className="settings-item-desc">
								Determina si el agente puede ser invocado en el chat y sesiones.
							</div>
						</div>
						<input
							type="checkbox"
							checked={enabled}
							onChange={(e) => setEnabled(e.target.checked)}
							className="toggle-checkbox"
						/>
					</div>

					{/* Tools Multi-select */}
					<div className="settings-input-block">
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								marginBottom: "6px",
							}}
						>
							<WrenchIcon size={14} style={{ color: "var(--accent)" }} />
							<span className="settings-item-title">Herramientas Permitidas</span>
						</div>
						<div className="settings-item-desc" style={{ marginBottom: "8px" }}>
							Selecciona qué capacidades locales puede invocar este agente (si no seleccionas
							ninguna, usará las por defecto):
						</div>

						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								maxHeight: "150px",
								overflowY: "auto",
								padding: "8px",
								background: "var(--bg-app)",
								borderRadius: "var(--r-md)",
								border: "1px solid var(--border-subtle)",
							}}
						>
							{availableTools.length === 0 ? (
								<span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
									Cargando herramientas...
								</span>
							) : (
								availableTools.map((t) => {
									const isSelected = selectedTools.includes(t.name);
									return (
										<button
											key={t.name}
											type="button"
											className={`model-tag-badge ${isSelected ? "active" : ""}`}
											onClick={() => handleToggleTool(t.name)}
											style={{
												cursor: "pointer",
												background: isSelected ? "var(--accent-glow)" : "var(--bg-surface)",
												borderColor: isSelected ? "var(--accent)" : "var(--border-default)",
												color: isSelected ? "var(--accent)" : "var(--text-secondary)",
												padding: "4px 8px",
												fontSize: "12px",
												display: "flex",
												alignItems: "center",
												gap: "4px",
												borderRadius: "var(--r-sm)",
											}}
										>
											<span>{t.name}</span>
										</button>
									);
								})
							)}
						</div>
					</div>
				</div>

				{/* Modal Footer */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						borderTop: "1px solid var(--border-subtle)",
						paddingTop: "14px",
						marginTop: "6px",
					}}
				>
					<button
						type="button"
						className="settings-danger-btn"
						onClick={handleDelete}
						title="Eliminar este agente"
					>
						<TrashIcon size={14} />
						<span>Eliminar</span>
					</button>

					<div style={{ display: "flex", gap: "8px" }}>
						<button type="button" className="btn-secondary" onClick={onClose}>
							Cancelar
						</button>
						<button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
							{saving ? "Guardando..." : "Guardar Cambios"}
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
