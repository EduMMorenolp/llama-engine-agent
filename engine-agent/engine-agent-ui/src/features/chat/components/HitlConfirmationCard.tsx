import { useState } from "react";
import { CheckIcon, ShieldAlertIcon, XIcon } from "../../../components/ui/Icons.tsx";

interface HitlConfirmationCardProps {
	toolName: string;
	commandText: string;
	onConfirm: () => void;
	onReject: () => void;
}

export function HitlConfirmationCard({
	toolName,
	commandText,
	onConfirm,
	onReject,
}: HitlConfirmationCardProps) {
	const [status, setStatus] = useState<"pending" | "allowed" | "rejected">("pending");

	const handleAllow = () => {
		setStatus("allowed");
		onConfirm();
	};

	const handleReject = () => {
		setStatus("rejected");
		onReject();
	};

	return (
		<div className="hitl-card">
			<div className="hitl-header">
				<ShieldAlertIcon size={16} />
				<span>Confirmar ejecución · {toolName}</span>
				{status !== "pending" && (
					<span
						className="nav-badge"
						style={{
							marginLeft: "auto",
							background:
								status === "allowed" ? "rgba(16, 185, 129, 0.2)" : "rgba(248, 113, 113, 0.2)",
							color: status === "allowed" ? "#10b981" : "#f87171",
						}}
					>
						{status === "allowed" ? "Permitido" : "Rechazado"}
					</span>
				)}
			</div>

			<div className="hitl-body">{commandText}</div>

			<div style={{ fontSize: "11px", color: "var(--muted)" }}>
				El agente solicita ejecutar esta operación en el entorno. Revisa el comando antes de
				continuar.
			</div>

			{status === "pending" && (
				<div className="hitl-actions">
					<button type="button" className="hitl-btn-deny" onClick={handleReject}>
						<XIcon size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
						Rechazar
					</button>
					<button type="button" className="hitl-btn-allow" onClick={handleAllow}>
						<CheckIcon size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
						Permitir
					</button>
				</div>
			)}
		</div>
	);
}
