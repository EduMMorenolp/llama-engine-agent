import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	type AgentDefinition,
	createAgent,
	deleteAgent,
	fetchAgents,
	fetchTools,
	type Tool,
	updateAgent,
} from "../../../api.ts";
import {
	BotIcon,
	CheckIcon,
	MessageSquareIcon,
	PlusIcon,
	SlidersIcon,
	SparklesIcon,
	TrashIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import { setAgentForSession } from "../../../lib/session-agents.ts";
import { useToast } from "../../../providers/ToastProvider.tsx";
import { useSessions } from "../../sessions/hooks/useSessions.ts";

const DEFAULT_AGENTS: AgentDefinition[] = [
	{
		name: "asistente",
		description: "Asistente personal proactivo, agenda, hábitos y razonamiento general.",
		corePrompt:
			"Eres el asistente personal principal del usuario. Gestionas agenda, hábitos y resuelves consultas.",
		tools: ["web_search", "web_fetch", "load_skill", "memorize", "search_memories"],
		model: "qwen3.5-4b",
		maxIterations: 10,
		enabled: true,
	},
	{
		name: "coder",
		description:
			"Especialista en desarrollo de software, TypeScript, Bash, arquitectura y depuración.",
		corePrompt:
			"Eres un ingeniero de software senior experto en TypeScript, Node.js, React y Docker.",
		tools: ["execute_bash", "read_file", "write_file", "glob_search", "grep_search"],
		model: "qwen3.5-9b",
		maxIterations: 15,
		enabled: true,
	},
	{
		name: "researcher",
		description:
			"Investigador analítico con acceso a búsqueda web y lectura de documentación técnica.",
		corePrompt:
			"Eres un investigador analítico. Buscas información fidedigna, sintetizas y citas fuentes.",
		tools: ["web_search", "web_fetch", "read_file", "search_memories"],
		model: "qwen3.5-4b",
		maxIterations: 10,
		enabled: true,
	},
	{
		name: "reviewer",
		description:
			"Revisor de código, aseguramiento de calidad (QA), tests y auditoría de seguridad.",
		corePrompt:
			"Eres un revisor técnico enfocado en calidad de código, buenas prácticas y seguridad.",
		tools: ["read_file", "glob_search", "grep_search"],
		model: "mistral-small-7b",
		maxIterations: 8,
		enabled: true,
	},
];

const COMMON_TOOLS = [
	"web_search",
	"web_fetch",
	"execute_bash",
	"read_file",
	"write_file",
	"edit_file",
	"glob_search",
	"grep_search",
	"memorize",
	"search_memories",
	"update_memory",
	"list_skills",
	"load_skill",
	"create_skill",
];

const MODEL_OPTIONS = [
	{ id: "qwen3.5-4b", name: "Qwen 3.5 4B (Rápido & Tools)" },
	{ id: "qwen3.5-9b", name: "Qwen 3.5 9B (Razonamiento profundo)" },
	{ id: "qwen2.5-coder-7b", name: "Qwen 2.5 Coder 7B (Especialista en Código)" },
	{ id: "gemma-4-e4b", name: "Google Gemma 4 E4B (Visión y Multimodal)" },
	{ id: "mistral-small-7b", name: "Mistral Small 7B (Instrucciones complejas)" },
	{ id: "llama-3.2-3b", name: "Meta Llama 3.2 3B (Ultra liviano)" },
];

interface AgentModalProps {
	agent: AgentDefinition | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (saved: AgentDefinition) => void;
	availableTools: string[];
}

function AgentModal({ agent, isOpen, onClose, onSave, availableTools }: AgentModalProps) {
	const { addToast } = useToast();
	const isEditing = Boolean(agent);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [corePrompt, setCorePrompt] = useState("");
	const [model, setModel] = useState("qwen3.5-4b");
	const [maxIterations, setMaxIterations] = useState(10);
	const [selectedTools, setSelectedTools] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (agent) {
			setName(agent.name);
			setDescription(agent.description || "");
			setCorePrompt(agent.corePrompt || "");
			setModel(agent.model || "qwen3.5-4b");
			setMaxIterations(agent.maxIterations ?? 10);
			setSelectedTools(agent.tools || []);
		} else {
			setName("");
			setDescription("");
			setCorePrompt("Eres un asistente especializado con directivas claras y objetivas.");
			setModel("qwen3.5-4b");
			setMaxIterations(10);
			setSelectedTools(["web_search", "read_file", "search_memories"]);
		}
	}, [agent]);

	if (!isOpen) return null;

	const handleToggleTool = (toolName: string) => {
		setSelectedTools((prev) =>
			prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const cleanName = name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]/g, "-");

		if (!cleanName) {
			addToast("El nombre del agente es obligatorio", "error");
			return;
		}
		if (!description.trim()) {
			addToast("La descripción del agente es obligatoria", "error");
			return;
		}

		setSaving(true);
		try {
			if (isEditing) {
				const updated = await updateAgent(cleanName, {
					description: description.trim(),
					corePrompt: corePrompt.trim(),
					model,
					maxIterations,
					tools: selectedTools,
				});
				addToast(`Agente "${cleanName}" actualizado con éxito`, "success");
				onSave(updated);
			} else {
				const created = await createAgent({
					name: cleanName,
					description: description.trim(),
					corePrompt: corePrompt.trim(),
					model,
					maxIterations,
					tools: selectedTools,
					enabled: true,
				});
				addToast(`Agente "${cleanName}" creado con éxito`, "success");
				onSave(created);
			}
			onClose();
		} catch (err) {
			addToast(
				`Error al guardar agente: ${err instanceof Error ? err.message : "Error del servidor"}`,
				"error",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0, 0, 0, 0.75)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
				padding: "16px",
			}}
		>
			<div
				style={{
					background: "var(--card)",
					border: "1px solid var(--border)",
					borderRadius: "var(--r-md)",
					width: "100%",
					maxWidth: "600px",
					maxHeight: "90vh",
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
					boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
				}}
			>
				{/* Modal Header */}
				<div
					style={{
						padding: "16px 20px",
						borderBottom: "1px solid var(--border)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<BotIcon size={18} style={{ color: "var(--accent)" }} />
						<span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
							{isEditing ? `Configurar Agente: ${agent?.name}` : "Crear Nuevo Agente"}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="session-action-btn"
						title="Cerrar"
						style={{ padding: "4px" }}
					>
						<XIcon size={16} />
					</button>
				</div>

				{/* Modal Form */}
				<form
					onSubmit={handleSubmit}
					style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}
				>
					{/* Name */}
					<div>
						<label
							htmlFor="agent-name-input"
							style={{
								display: "block",
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--text)",
								marginBottom: "4px",
							}}
						>
							Nombre Identificador (slug)
						</label>
						<input
							id="agent-name-input"
							type="text"
							value={name}
							disabled={isEditing}
							onChange={(e) => setName(e.target.value)}
							placeholder="ej: sql-analyst, devops-assistant"
							style={{
								width: "100%",
								padding: "8px 10px",
								background: isEditing ? "rgba(255, 255, 255, 0.03)" : "var(--bg)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-sm)",
								color: isEditing ? "var(--muted)" : "var(--text)",
								fontSize: "13px",
								outline: "none",
								fontFamily: "var(--font-mono)",
							}}
						/>
						{isEditing && (
							<span
								style={{
									fontSize: "11px",
									color: "var(--muted)",
									marginTop: "2px",
									display: "block",
								}}
							>
								El identificador del agente es único e inmutable.
							</span>
						)}
					</div>

					{/* Description */}
					<div>
						<label
							htmlFor="agent-desc-input"
							style={{
								display: "block",
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--text)",
								marginBottom: "4px",
							}}
						>
							Descripción / Rol
						</label>
						<input
							id="agent-desc-input"
							type="text"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="ej: Especialista en bases de datos PostgreSQL, queries y migraciones"
							style={{
								width: "100%",
								padding: "8px 10px",
								background: "var(--bg)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-sm)",
								color: "var(--text)",
								fontSize: "13px",
								outline: "none",
							}}
						/>
					</div>

					{/* Model and Iterations */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "12px" }}>
						<div>
							<label
								htmlFor="agent-model-select"
								style={{
									display: "block",
									fontSize: "12px",
									fontWeight: 600,
									color: "var(--text)",
									marginBottom: "4px",
								}}
							>
								Modelo LLM Asignado
							</label>
							<select
								id="agent-model-select"
								value={model}
								onChange={(e) => setModel(e.target.value)}
								style={{
									width: "100%",
									padding: "8px 10px",
									background: "var(--bg)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-sm)",
									color: "var(--text)",
									fontSize: "12.5px",
									outline: "none",
									cursor: "pointer",
								}}
							>
								{MODEL_OPTIONS.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<label
								htmlFor="agent-max-iter-input"
								style={{
									display: "block",
									fontSize: "12px",
									fontWeight: 600,
									color: "var(--text)",
									marginBottom: "4px",
								}}
							>
								Max Iteraciones
							</label>
							<input
								id="agent-max-iter-input"
								type="number"
								min="1"
								max="50"
								value={maxIterations}
								onChange={(e) => setMaxIterations(Number(e.target.value) || 10)}
								style={{
									width: "100%",
									padding: "8px 10px",
									background: "var(--bg)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-sm)",
									color: "var(--text)",
									fontSize: "13px",
									outline: "none",
								}}
							/>
						</div>
					</div>

					{/* Core Prompt */}
					<div>
						<label
							htmlFor="agent-prompt-textarea"
							style={{
								display: "block",
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--text)",
								marginBottom: "4px",
							}}
						>
							System Prompt (Directivas e Instrucciones de Comportamiento)
						</label>
						<textarea
							id="agent-prompt-textarea"
							rows={5}
							value={corePrompt}
							onChange={(e) => setCorePrompt(e.target.value)}
							placeholder="Instrucciones precisas para el modelo al interactuar como este agente..."
							style={{
								width: "100%",
								padding: "8px 10px",
								background: "var(--bg)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-sm)",
								color: "var(--text)",
								fontSize: "12.5px",
								lineHeight: "1.5",
								outline: "none",
								resize: "vertical",
								fontFamily: "var(--font-mono)",
							}}
						/>
					</div>

					{/* Tools Multi-Select */}
					<div>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "6px",
							}}
						>
							<label
								htmlFor="agent-tools-container"
								style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}
							>
								Herramientas Asignadas ({selectedTools.length})
							</label>
							<span style={{ fontSize: "11px", color: "var(--muted)" }}>
								Haz clic para agregar o quitar herramientas
							</span>
						</div>

						<div
							id="agent-tools-container"
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								maxHeight: "130px",
								overflowY: "auto",
								padding: "8px",
								background: "var(--bg)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-sm)",
							}}
						>
							{availableTools.map((toolName) => {
								const isSelected = selectedTools.includes(toolName);
								return (
									<button
										type="button"
										key={toolName}
										onClick={() => handleToggleTool(toolName)}
										style={{
											padding: "4px 8px",
											borderRadius: "var(--r-sm)",
											fontSize: "11px",
											fontFamily: "var(--font-mono)",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "4px",
											background: isSelected
												? "rgba(59, 130, 246, 0.2)"
												: "rgba(255, 255, 255, 0.04)",
											border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
											color: isSelected ? "var(--accent)" : "var(--muted)",
										}}
									>
										{isSelected && <CheckIcon size={10} />}
										<span>{toolName}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Modal Footer Actions */}
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
							gap: "10px",
							paddingTop: "12px",
							borderTop: "1px solid var(--border)",
							marginTop: "4px",
						}}
					>
						<button
							type="button"
							onClick={onClose}
							className="btn-secondary"
							style={{ padding: "7px 14px", fontSize: "12.5px" }}
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={saving}
							style={{
								background: "var(--accent)",
								color: "#080b12",
								border: "none",
								padding: "7px 16px",
								borderRadius: "var(--r-sm)",
								fontSize: "12.5px",
								fontWeight: 600,
								cursor: saving ? "not-allowed" : "pointer",
								opacity: saving ? 0.7 : 1,
							}}
						>
							{saving ? "Guardando..." : isEditing ? "Actualizar Agente" : "Crear Agente"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function AgentsPage() {
	const navigate = useNavigate();
	const { addToast } = useToast();
	const { createNewSession } = useSessions();
	const [agents, setAgents] = useState<AgentDefinition[]>(DEFAULT_AGENTS);
	const [loading, setLoading] = useState(true);
	const [availableTools, setAvailableTools] = useState<string[]>(COMMON_TOOLS);

	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingAgent, setEditingAgent] = useState<AgentDefinition | null>(null);

	const loadAgents = () => {
		setLoading(true);
		fetchAgents()
			.then((res) => {
				if (res && res.length > 0) setAgents(res);
				setLoading(false);
			})
			.catch(() => {
				setLoading(false);
			});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: initial mount only
	useEffect(() => {
		loadAgents();
		fetchTools()
			.then((tools: Tool[]) => {
				if (tools && tools.length > 0) {
					const toolNames = Array.from(new Set([...COMMON_TOOLS, ...tools.map((t) => t.name)]));
					setAvailableTools(toolNames);
				}
			})
			.catch(() => {});
	}, []);

	const handleOpenCreateModal = () => {
		setEditingAgent(null);
		setIsModalOpen(true);
	};

	const handleOpenEditModal = (ag: AgentDefinition) => {
		setEditingAgent(ag);
		setIsModalOpen(true);
	};

	const handleDeleteAgent = async (agentName: string) => {
		if (agentName === "asistente") {
			addToast("El agente base 'asistente' no se puede eliminar", "info");
			return;
		}

		if (
			window.confirm(
				`¿Estás seguro de eliminar el agente "${agentName}"? Esta acción no se puede deshacer.`,
			)
		) {
			try {
				await deleteAgent(agentName);
				addToast(`Agente "${agentName}" eliminado`, "success");
				setAgents((prev) => prev.filter((a) => a.name !== agentName));
			} catch (err) {
				addToast(
					`Error al eliminar agente: ${err instanceof Error ? err.message : "Error del servidor"}`,
					"error",
				);
			}
		}
	};

	const handleChatWithAgent = async (agentName: string) => {
		try {
			const newSession = await createNewSession(`Chat con ${agentName}`);
			if (newSession?.id) {
				setAgentForSession(newSession.id, agentName);
				window.dispatchEvent(
					new CustomEvent("agent_session_changed", {
						detail: { sessionId: newSession.id, agentId: agentName },
					}),
				);
			}
			navigate("/");
		} catch {
			navigate(`/?agent=${agentName}`);
		}
	};

	const handleAskAgentToCreate = async () => {
		const prompt = `Hola, quiero diseñar y configurar un nuevo agente o personalidad especializada para mi entorno. Ayúdame paso a paso a definir:
1. Nombre identificador (slug único en minúsculas)
2. Rol y propósito del agente
3. System prompt detallado con instrucciones y directivas
4. Herramientas que debe tener asignadas (ej. web_search, execute_bash, read_file, search_memories, etc.)
5. Modelo LLM recomendado (ej. qwen3.5-4b, qwen3.5-9b)

Cuando estemos de acuerdo con la propuesta, utiliza la herramienta \`create_agent\` para registrarlo formalmente en el sistema.`;
		try {
			const newSession = await createNewSession("Diseñar nuevo Agente Especializado");
			if (newSession?.id) {
				setAgentForSession(newSession.id, "asistente");
				window.dispatchEvent(
					new CustomEvent("agent_session_changed", {
						detail: { sessionId: newSession.id, agentId: "asistente" },
					}),
				);
			}
			navigate(`/?draft=${encodeURIComponent(prompt)}`);
		} catch {
			navigate(`/?draft=${encodeURIComponent(prompt)}`);
		}
	};

	const handleAskAgentToModify = async (agentName: string) => {
		const prompt = `Por favor analiza la configuración del agente "${agentName}", revisa su system prompt y las herramientas asignadas para optimizar su rendimiento. Si decidimos realizar ajustes, puedes utilizar la herramienta \`update_agent\` para aplicar los cambios directamente.`;
		try {
			const newSession = await createNewSession(`Configurar agente: ${agentName}`);
			if (newSession?.id) {
				setAgentForSession(newSession.id, agentName);
				window.dispatchEvent(
					new CustomEvent("agent_session_changed", {
						detail: { sessionId: newSession.id, agentId: agentName },
					}),
				);
			}
			navigate(`/?draft=${encodeURIComponent(prompt)}`);
		} catch {
			navigate(`/?agent=${agentName}&draft=${encodeURIComponent(prompt)}`);
		}
	};

	return (
		<div style={{ flex: 1, height: "100%", overflowY: "auto", padding: "24px 32px" }}>
			{/* Page Header */}
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
						Personalidades & Sub-Agentes
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Agentes especializados con prompts de sistema, modelos y conjunto de herramientas
						asignadas.
					</p>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button
						type="button"
						className="btn-secondary"
						onClick={handleOpenCreateModal}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							padding: "8px 14px",
							fontSize: "12.5px",
						}}
					>
						<PlusIcon size={14} />
						<span>Crear Agente Manual</span>
					</button>

					<button
						type="button"
						onClick={handleAskAgentToCreate}
						style={{
							background: "var(--accent)",
							color: "#080b12",
							border: "none",
							padding: "8px 16px",
							borderRadius: "var(--r-sm)",
							fontSize: "12.5px",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "6px",
							cursor: "pointer",
						}}
					>
						<SparklesIcon size={14} />
						<span>Pedir al Agente Crear Agente</span>
					</button>
				</div>
			</div>

			{loading && (
				<div style={{ padding: "20px 0", color: "var(--muted)", fontSize: "13px" }}>
					Cargando agentes configurados...
				</div>
			)}

			{/* Agents Grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
					gap: "16px",
				}}
			>
				{agents.map((ag) => (
					<div
						key={ag.name}
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
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
								<div
									style={{
										width: "32px",
										height: "32px",
										borderRadius: "var(--r-sm)",
										background: "rgba(59, 130, 246, 0.15)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--accent)",
									}}
								>
									<BotIcon size={18} />
								</div>
								<div>
									<span style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--text)" }}>
										{ag.name}
									</span>
									{ag.name === "asistente" && (
										<span
											style={{
												marginLeft: "6px",
												fontSize: "10px",
												padding: "1px 5px",
												borderRadius: "4px",
												background: "rgba(59, 130, 246, 0.15)",
												color: "var(--accent)",
											}}
										>
											Base
										</span>
									)}
								</div>
							</div>
							<span className="nav-badge" style={{ fontSize: "10.5px" }}>
								{ag.model || "qwen3.5-4b"}
							</span>
						</div>

						<p style={{ fontSize: "12.5px", color: "var(--muted)", margin: 0, minHeight: "38px" }}>
							{ag.description}
						</p>

						<div>
							<span
								style={{
									fontSize: "11px",
									fontWeight: 700,
									color: "var(--muted)",
									textTransform: "uppercase",
								}}
							>
								Herramientas Asignadas ({ag.tools?.length || 0})
							</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
								{ag.tools?.map((t) => (
									<span
										key={t}
										className="nav-badge"
										style={{
											fontSize: "10px",
											background: "rgba(255, 255, 255, 0.04)",
											border: "1px solid var(--border)",
										}}
									>
										{t}
									</span>
								))}
							</div>
						</div>

						<div
							style={{
								marginTop: "auto",
								paddingTop: "12px",
								borderTop: "1px solid var(--border)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<button
									type="button"
									onClick={() => handleOpenEditModal(ag)}
									style={{
										background: "rgba(255, 255, 255, 0.05)",
										border: "1px solid var(--border)",
										borderRadius: "var(--r-sm)",
										color: "var(--text)",
										padding: "4px 8px",
										fontSize: "11.5px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "4px",
									}}
									title="Configurar y editar agente manualmente"
								>
									<SlidersIcon size={12} />
									<span>Configurar</span>
								</button>

								<button
									type="button"
									onClick={() => handleAskAgentToModify(ag.name)}
									style={{
										background: "transparent",
										border: "none",
										color: "var(--muted)",
										padding: "4px 6px",
										fontSize: "11.5px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "4px",
									}}
									title="Pedir al agente optimizar este agente en una conversación guiada"
								>
									<SparklesIcon size={12} />
									<span>Asistir</span>
								</button>

								{ag.name !== "asistente" && (
									<button
										type="button"
										onClick={() => handleDeleteAgent(ag.name)}
										className="session-action-btn danger-hover"
										title="Eliminar agente"
										style={{ padding: "4px 6px" }}
									>
										<TrashIcon size={12} />
									</button>
								)}
							</div>

							<button
								type="button"
								onClick={() => handleChatWithAgent(ag.name)}
								style={{
									background: "var(--accent)",
									color: "#080b12",
									border: "none",
									padding: "5px 12px",
									borderRadius: "var(--r-sm)",
									fontSize: "12px",
									fontWeight: 600,
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								<MessageSquareIcon size={13} />
								<span>Iniciar Chat</span>
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Agent Config Modal */}
			<AgentModal
				agent={editingAgent}
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				availableTools={availableTools}
				onSave={(saved) => {
					setAgents((prev) => {
						const exists = prev.some((a) => a.name === saved.name);
						if (exists) {
							return prev.map((a) => (a.name === saved.name ? saved : a));
						}
						return [...prev, saved];
					});
				}}
			/>
		</div>
	);
}
