import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { createSkill, deleteSkill, fetchSkills, type Skill, updateSkill } from "../../../api.ts";
import {
	EditIcon,
	MessageSquareIcon,
	PlusIcon,
	SearchIcon,
	SparklesIcon,
	TrashIcon,
	XIcon,
} from "../../../components/ui/Icons.tsx";
import { setAgentForSession } from "../../../lib/session-agents.ts";
import { useToast } from "../../../providers/ToastProvider.tsx";
import { useSessions } from "../../sessions/hooks/useSessions.ts";

const AGENT_PROFILES = [
	{ id: "all", label: "Todos los Agentes", color: "#60a5fa" },
	{ id: "asistente", label: "asistente", color: "#3b82f6" },
	{ id: "coder", label: "coder", color: "#a855f7" },
	{ id: "researcher", label: "researcher", color: "#10b981" },
	{ id: "reviewer", label: "reviewer", color: "#f59e0b" },
];

const AVAILABLE_TOOLS = [
	"web_search",
	"web_fetch",
	"execute_bash",
	"read_file",
	"write_file",
	"edit_file",
	"glob_search",
	"grep_search",
	"store_memory",
	"recall_memory",
	"load_skill",
];

function normalizeAgentName(agent?: string): string {
	if (!agent || agent === "default" || agent === "global") return "asistente";
	return agent;
}

function getAgentColor(agent?: string): string {
	const norm = normalizeAgentName(agent);
	return AGENT_PROFILES.find((a) => a.id === norm)?.color || "#3b82f6";
}

export function SkillsPage() {
	const navigate = useNavigate();
	const { addToast } = useToast();
	const { createNewSession } = useSessions();

	const [skills, setSkills] = useState<Skill[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");

	// Modal state (Create / Edit)
	const [modalOpen, setModalOpen] = useState(false);
	const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
	const [formName, setFormName] = useState("");
	const [formAgent, setFormAgent] = useState("coder");
	const [formDescription, setFormDescription] = useState("");
	const [formTools, setFormTools] = useState<string[]>(["read_file", "grep_search"]);
	const [formPlaybook, setFormPlaybook] = useState("");
	const [saving, setSaving] = useState(false);

	const loadSkills = useCallback(() => {
		setLoading(true);
		fetchSkills()
			.then((res) => {
				setSkills(res);
				setLoading(false);
			})
			.catch(() => {
				setLoading(false);
			});
	}, []);

	useEffect(() => {
		loadSkills();
	}, [loadSkills]);

	const filteredSkills = skills.filter((s) => {
		const normAgent = normalizeAgentName(s.agent);
		if (selectedAgentFilter !== "all" && normAgent !== selectedAgentFilter) {
			return false;
		}
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase().trim();
		return (
			s.name.toLowerCase().includes(q) ||
			s.description.toLowerCase().includes(q) ||
			normAgent.toLowerCase().includes(q)
		);
	});

	// Open a brand new conversation associated with the target agent
	const handleAskAgentInNewChat = async (skill?: Skill) => {
		const targetAgent = skill
			? normalizeAgentName(skill.agent)
			: selectedAgentFilter !== "all"
				? selectedAgentFilter
				: "coder";

		const sessionTitle = skill
			? `Modificar skill: ${skill.name}`
			: `Crear nueva skill (${targetAgent})`;
		const prompt = skill
			? `Necesito modificar y mejorar la skill "${skill.name}" (asociada al agente "${targetAgent}"). Su descripción actual es: "${skill.description}". Por favor revisa su playbook y herramientas (${skill.allowedTools?.join(", ") || "ninguna"}) y proponme las mejoras.`
			: `Quiero crear una nueva skill para el agente "${targetAgent}". Ayúdame a definir su nombre en formato kebab-case, su descripción, las herramientas permitidas (allowedTools) y su playbook paso a paso.`;

		try {
			const newSession = await createNewSession(sessionTitle);
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

	const openCreateModal = () => {
		setEditingSkill(null);
		setFormName("");
		setFormAgent(selectedAgentFilter !== "all" ? selectedAgentFilter : "coder");
		setFormDescription("");
		setFormTools(["read_file", "grep_search"]);
		setFormPlaybook(
			"## Objetivo\nDescribe cómo el agente debe abordar esta tarea.\n\n## Pasos\n1. Analizar el contexto.\n2. Ejecutar herramientas necesarias.\n3. Verificar el resultado.",
		);
		setModalOpen(true);
	};

	const openEditModal = (skill: Skill) => {
		setEditingSkill(skill);
		setFormName(skill.name);
		setFormAgent(normalizeAgentName(skill.agent));
		setFormDescription(skill.description || "");
		setFormTools(skill.allowedTools || []);
		const meta = (skill.metadata || {}) as unknown as Record<string, unknown>;
		setFormPlaybook(typeof meta.playbook === "string" ? meta.playbook : "");
		setModalOpen(true);
	};

	const toggleFormTool = (toolName: string) => {
		setFormTools((prev) =>
			prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName],
		);
	};

	const handleSaveSkill = async (e: React.FormEvent) => {
		e.preventDefault();
		const cleanName = formName
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "-")
			.replace(/^-+|-+$/g, "");

		if (!cleanName || !formDescription.trim()) {
			addToast("Completa el nombre y la descripción de la skill", "error");
			return;
		}

		setSaving(true);
		try {
			if (editingSkill) {
				const updated = await updateSkill(editingSkill.name, {
					agent: formAgent,
					description: formDescription.trim(),
					allowedTools: formTools,
					metadata: {
						...(editingSkill.metadata || {}),
						name: editingSkill.name,
						description: formDescription.trim(),
						playbook: formPlaybook,
						tags: [formAgent],
					} as unknown as Skill["metadata"],
				});
				setSkills((prev) => prev.map((s) => (s.name === editingSkill.name ? updated : s)));
				addToast(`Skill "${editingSkill.name}" actualizada`, "success");
			} else {
				const created = await createSkill({
					name: cleanName,
					agent: formAgent,
					description: formDescription.trim(),
					directory: `skills/${cleanName}`,
					allowedTools: formTools,
					triggers: [cleanName],
					tags: [formAgent],
					metadata: {
						name: cleanName,
						description: formDescription.trim(),
						playbook: formPlaybook,
						tags: [formAgent],
					} as unknown as Skill["metadata"],
				});
				setSkills((prev) => [...prev, created]);
				addToast(`Skill "${cleanName}" creada y asociada a ${formAgent}`, "success");
			}
			setModalOpen(false);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Error al guardar la skill";
			addToast(msg, "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteSkill = async (skillName: string) => {
		try {
			await deleteSkill(skillName);
			setSkills((prev) => prev.filter((s) => s.name !== skillName));
			addToast(`Skill "${skillName}" eliminada`, "info");
		} catch {
			addToast(`No se pudo eliminar la skill "${skillName}"`, "error");
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
					marginBottom: "20px",
					flexWrap: "wrap",
					gap: "12px",
				}}
			>
				<div>
					<h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
						Catálogo de Habilidades (Skills)
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Playbooks e instrucciones modulares asociadas a cada agente especialista.
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
						<span>Crear Skill Manual</span>
					</button>

					<button
						type="button"
						className="btn-primary"
						onClick={() => handleAskAgentInNewChat()}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							padding: "8px 14px",
							fontSize: "13px",
						}}
					>
						<SparklesIcon size={15} />
						<span>Pedir al Agente Crear Skill</span>
					</button>
				</div>
			</div>

			{/* Filter Bar: Search + Agent Tabs */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "16px",
					marginBottom: "20px",
					flexWrap: "wrap",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-sm)",
						padding: "6px 12px",
						minWidth: "280px",
						flex: "1 1 280px",
						maxWidth: "400px",
					}}
				>
					<SearchIcon size={15} style={{ color: "var(--muted)" }} />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Buscar por nombre, descripción o agente..."
						style={{
							background: "transparent",
							border: "none",
							outline: "none",
							color: "var(--text)",
							fontSize: "13px",
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

				{/* Agent Filter Pills */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
					{AGENT_PROFILES.map((ag) => {
						const active = selectedAgentFilter === ag.id;
						const count =
							ag.id === "all"
								? skills.length
								: skills.filter((s) => normalizeAgentName(s.agent) === ag.id).length;
						return (
							<button
								key={ag.id}
								type="button"
								onClick={() => setSelectedAgentFilter(ag.id)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "6px",
									padding: "6px 12px",
									borderRadius: "var(--r-sm)",
									fontSize: "12px",
									fontWeight: active ? 600 : 500,
									cursor: "pointer",
									background: active ? "rgba(59, 130, 246, 0.14)" : "var(--card)",
									color: active ? "var(--accent-strong)" : "var(--muted)",
									border: active ? "1px solid rgba(59, 130, 246, 0.35)" : "1px solid var(--border)",
									transition: "all 0.15s ease",
								}}
							>
								<span
									className="model-dot"
									style={{
										background: ag.color,
										boxShadow: active ? `0 0 6px ${ag.color}` : "none",
									}}
								/>
								<span>{ag.label}</span>
								<span
									style={{
										fontSize: "10.5px",
										opacity: 0.75,
										fontFamily: "var(--font-mono)",
									}}
								>
									({count})
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Skills Grid */}
			{loading ? (
				<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
					<div className="spinner" style={{ width: 16, height: 16 }} />
					<span>Cargando catálogo de skills...</span>
				</div>
			) : filteredSkills.length === 0 ? (
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
					No se encontraron skills para el filtro seleccionado.
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
						gap: "16px",
					}}
				>
					{filteredSkills.map((skill) => {
						const normAgent = normalizeAgentName(skill.agent);
						const agentColor = getAgentColor(normAgent);

						return (
							<div
								key={skill.name}
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
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: "8px",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
										<SparklesIcon size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
										<span
											style={{
												fontWeight: 700,
												fontSize: "14px",
												color: "var(--text)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{skill.name}
										</span>
									</div>

									{/* Agent Association Badge */}
									<span
										className="nav-badge"
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "5px",
											fontSize: "11px",
											padding: "2px 8px",
											background: "var(--card-strong)",
											border: `1px solid ${agentColor}44`,
											color: "var(--text)",
											flexShrink: 0,
										}}
										title={`Asociada al agente: ${normAgent}`}
									>
										<span
											className="model-dot"
											style={{
												background: agentColor,
												boxShadow: `0 0 6px ${agentColor}`,
											}}
										/>
										{normAgent}
									</span>
								</div>

								<p
									style={{
										fontSize: "12.5px",
										color: "var(--muted)",
										margin: 0,
										minHeight: "38px",
										lineHeight: 1.45,
									}}
								>
									{skill.description || "Sin descripción proporcionada."}
								</p>

								{skill.allowedTools && skill.allowedTools.length > 0 && (
									<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
										{skill.allowedTools.map((t) => (
											<span
												key={t}
												className="nav-badge"
												style={{
													fontSize: "10px",
													background: "rgba(59, 130, 246, 0.1)",
													color: "var(--accent)",
													border: "1px solid rgba(59, 130, 246, 0.2)",
												}}
											>
												{t}
											</span>
										))}
									</div>
								)}

								<div
									style={{
										marginTop: "auto",
										paddingTop: "10px",
										borderTop: "1px solid var(--border)",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: "8px",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
										<button
											type="button"
											className="session-action-btn edit-btn"
											onClick={() => openEditModal(skill)}
											title="Editar skill manualmente"
											style={{ padding: "5px 8px", fontSize: "11.5px", gap: "4px" }}
										>
											<EditIcon size={13} />
											<span>Editar</span>
										</button>
										<button
											type="button"
											className="session-action-btn danger-hover"
											onClick={() => handleDeleteSkill(skill.name)}
											title="Eliminar skill"
											style={{ padding: "5px 6px" }}
										>
											<TrashIcon size={13} />
										</button>
									</div>

									<button
										type="button"
										onClick={() => handleAskAgentInNewChat(skill)}
										style={{
											background: "var(--card-strong)",
											color: "var(--text)",
											border: "1px solid var(--border)",
											padding: "5px 10px",
											borderRadius: "var(--r-sm)",
											fontSize: "11.5px",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "5px",
										}}
										title={`Abrir conversación nueva con ${normAgent} para modificar esta skill`}
									>
										<MessageSquareIcon size={12} />
										<span>Pedir al Agente modificar</span>
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Modal Crear / Editar Skill Manualmente */}
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
								maxWidth: "560px",
								width: "92vw",
								maxHeight: "88vh",
								overflowY: "auto",
							}}
						>
							<div className="dialog-title-row">
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<SparklesIcon size={18} style={{ color: "var(--accent)" }} />
									<span className="dialog-title">
										{editingSkill ? `Editar Skill: ${editingSkill.name}` : "Crear Nueva Skill"}
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
								onSubmit={handleSaveSkill}
								style={{ display: "flex", flexDirection: "column", gap: "14px" }}
							>
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
									<div>
										<label
											htmlFor="skill-name-input"
											style={{
												fontSize: "12px",
												fontWeight: 600,
												color: "var(--muted)",
												display: "block",
												marginBottom: "6px",
											}}
										>
											Identificador (kebab-case)
										</label>
										<input
											id="skill-name-input"
											type="text"
											className="sidebar-search-input"
											style={{ padding: "8px 10px" }}
											value={formName}
											onChange={(e) => setFormName(e.target.value)}
											placeholder="ej. docker-diagnostics"
											disabled={Boolean(editingSkill)}
											required
										/>
									</div>

									<div>
										<label
											htmlFor="skill-agent-select"
											style={{
												fontSize: "12px",
												fontWeight: 600,
												color: "var(--muted)",
												display: "block",
												marginBottom: "6px",
											}}
										>
											Agente Asociado
										</label>
										<select
											id="skill-agent-select"
											value={formAgent}
											onChange={(e) => setFormAgent(e.target.value)}
											className="sidebar-search-input"
											style={{
												padding: "8px 10px",
												background: "var(--bg-surface)",
												cursor: "pointer",
											}}
										>
											<option value="asistente">asistente (Asistente General)</option>
											<option value="coder">coder (Ingeniero de Software)</option>
											<option value="researcher">researcher (Investigador Web)</option>
											<option value="reviewer">reviewer (Revisor & QA)</option>
										</select>
									</div>
								</div>

								<div>
									<label
										htmlFor="skill-desc-input"
										style={{
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--muted)",
											display: "block",
											marginBottom: "6px",
										}}
									>
										Descripción (Cuándo y para qué usar esta skill)
									</label>
									<input
										id="skill-desc-input"
										type="text"
										className="sidebar-search-input"
										style={{ padding: "8px 10px" }}
										value={formDescription}
										onChange={(e) => setFormDescription(e.target.value)}
										placeholder="ej. Analiza contenedores Docker, revisa logs y verifica healthchecks..."
										required
									/>
								</div>

								<div>
									<span
										style={{
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--muted)",
											display: "block",
											marginBottom: "6px",
										}}
									>
										Herramientas Permitidas (allowedTools)
									</span>
									<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
										{AVAILABLE_TOOLS.map((tool) => {
											const selected = formTools.includes(tool);
											return (
												<button
													key={tool}
													type="button"
													onClick={() => toggleFormTool(tool)}
													style={{
														fontSize: "11px",
														padding: "4px 9px",
														borderRadius: "var(--r-sm)",
														cursor: "pointer",
														background: selected
															? "rgba(59, 130, 246, 0.18)"
															: "rgba(255, 255, 255, 0.04)",
														color: selected ? "var(--accent-strong)" : "var(--muted)",
														border: selected
															? "1px solid rgba(59, 130, 246, 0.45)"
															: "1px solid var(--border)",
														fontFamily: "var(--font-mono)",
													}}
												>
													{selected ? "✓ " : "+ "}
													{tool}
												</button>
											);
										})}
									</div>
								</div>

								<div>
									<label
										htmlFor="skill-playbook-input"
										style={{
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--muted)",
											display: "block",
											marginBottom: "6px",
										}}
									>
										Playbook / Instrucciones de la Skill (Markdown)
									</label>
									<textarea
										id="skill-playbook-input"
										className="dialog-textarea"
										rows={5}
										value={formPlaybook}
										onChange={(e) => setFormPlaybook(e.target.value)}
										placeholder="Instrucciones paso a paso que el agente cargará con load_skill..."
									/>
								</div>

								<div className="dialog-footer">
									<button
										type="button"
										className="btn-secondary"
										onClick={() => setModalOpen(false)}
									>
										Cancelar
									</button>
									<button type="submit" className="btn-primary" disabled={saving}>
										{saving ? "Guardando..." : editingSkill ? "Guardar Cambios" : "Crear Skill"}
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
