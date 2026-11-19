import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSkills, type Skill } from "../../../api.ts";
import {
	MessageSquareIcon,
	PlusIcon,
	SearchIcon,
	SparklesIcon,
} from "../../../components/ui/Icons.tsx";

export function SkillsPage() {
	const navigate = useNavigate();
	const [skills, setSkills] = useState<Skill[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		fetchSkills()
			.then((res) => {
				setSkills(res);
				setLoading(false);
			})
			.catch(() => {
				setLoading(false);
			});
	}, []);

	const filteredSkills = skills.filter((s) => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase().trim();
		return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
	});

	const handleAskAgentToModify = (skillName?: string) => {
		const prompt = skillName
			? `Por favor analiza la skill "${skillName}" y ayúdame a modificarla o mejorar sus herramientas y playbooks.`
			: "Por favor ayúdame a crear una nueva habilidad (skill) para el agente con su respectivo playbook y herramientas.";
		navigate(`/?draft=${encodeURIComponent(prompt)}`);
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
				}}
			>
				<div>
					<h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
						Catálogo de Habilidades (Skills)
					</h1>
					<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
						Habilidades modulares con playbooks e instrucciones automáticas cargadas en el agente.
					</p>
				</div>
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => handleAskAgentToModify()}
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
					<span>Pedir al Agente Crear Skill</span>
				</button>
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
						placeholder="Buscar por nombre o descripción..."
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

			{/* Skills Grid */}
			{loading ? (
				<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
					<div className="spinner" style={{ width: 16, height: 16 }} />
					<span>Cargando catálogo de skills...</span>
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
						gap: "16px",
					}}
				>
					{filteredSkills.map((skill) => (
						<div
							key={skill.name}
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
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<SparklesIcon size={16} style={{ color: "var(--accent)" }} />
									<span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text)" }}>
										{skill.name}
									</span>
								</div>
								<span className="nav-badge" style={{ fontSize: "10.5px" }}>
									{skill.agent || "global"}
								</span>
							</div>

							<p
								style={{ fontSize: "12.5px", color: "var(--muted)", margin: 0, minHeight: "36px" }}
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
									paddingTop: "8px",
									borderTop: "1px solid var(--border)",
									display: "flex",
									justifyContent: "flex-end",
								}}
							>
								<button
									type="button"
									onClick={() => handleAskAgentToModify(skill.name)}
									style={{
										background: "var(--card-strong)",
										color: "var(--text)",
										border: "1px solid var(--border)",
										padding: "4px 10px",
										borderRadius: "var(--r-sm)",
										fontSize: "11.5px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "4px",
									}}
								>
									<MessageSquareIcon size={12} />
									<span>Pedir al Agente modificar</span>
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
