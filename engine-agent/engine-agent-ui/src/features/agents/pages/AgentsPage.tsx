import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AgentDefinition, fetchAgents } from "../../../api.ts";
import { BotIcon, MessageSquareIcon, SlidersIcon } from "../../../components/ui/Icons.tsx";

const DEFAULT_AGENTS: AgentDefinition[] = [
	{
		name: "asistente",
		description: "Asistente personal proactivo, agenda, hábitos y razonamiento general.",
		corePrompt:
			"Eres el asistente personal principal del usuario. Gestionas agenda, hábitos y resuelves consultas.",
		tools: ["web_search", "web_fetch", "load_skill"],
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
		tools: ["web_search", "web_fetch", "read_file"],
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

export function AgentsPage() {
	const navigate = useNavigate();
	const [agents, setAgents] = useState<AgentDefinition[]>(DEFAULT_AGENTS);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchAgents()
			.then((res) => {
				if (res && res.length > 0) setAgents(res);
				setLoading(false);
			})
			.catch(() => {
				setLoading(false);
			});
	}, []);

	const handleChatWithAgent = (agentName: string) => {
		navigate(`/?agent=${agentName}`);
	};

	const handleAskAgentToModify = (agentName: string) => {
		const prompt = `Por favor analiza la configuración del agente "${agentName}", revisa su system prompt y las herramientas asignadas para optimizar su rendimiento.`;
		navigate(`/?draft=${encodeURIComponent(prompt)}`);
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
						Personalidades & Sub-Agentes
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Agentes especializados con prompts de sistema, modelos y conjunto de herramientas
						asignadas.
					</p>
				</div>
				{loading && (
					<span className="nav-badge" style={{ fontSize: "11px" }}>
						Cargando agentes...
					</span>
				)}
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
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
								<span style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--text)" }}>
									{ag.name}
								</span>
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
								paddingTop: "10px",
								borderTop: "1px solid var(--border)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<button
								type="button"
								onClick={() => handleAskAgentToModify(ag.name)}
								style={{
									background: "transparent",
									color: "var(--muted)",
									border: "none",
									fontSize: "11.5px",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								<SlidersIcon size={12} />
								<span>Configurar</span>
							</button>

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
		</div>
	);
}
