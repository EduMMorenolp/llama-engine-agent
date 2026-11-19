import { useEffect, useState } from "react";
import { MicIcon, SpeakerIcon, StopIcon } from "../../../components/ui/Icons.tsx";

interface VoiceOrbProps {
	mode: "listening" | "speaking";
	onStop: () => void;
}

export function VoiceOrb({ mode, onStop }: VoiceOrbProps) {
	const [waveBars, setWaveBars] = useState<number[]>([40, 70, 100, 60, 30]);

	// Simulación reactiva de ondas de audio
	useEffect(() => {
		const interval = setInterval(() => {
			setWaveBars([
				Math.floor(25 + Math.random() * 65),
				Math.floor(40 + Math.random() * 60),
				Math.floor(55 + Math.random() * 45),
				Math.floor(35 + Math.random() * 65),
				Math.floor(20 + Math.random() * 60),
			]);
		}, 120);

		return () => clearInterval(interval);
	}, []);

	const isListening = mode === "listening";

	return (
		<div
			className="voice-orb-container"
			style={{
				position: "fixed",
				bottom: "95px",
				right: "24px",
				zIndex: 40,
				display: "flex",
				alignItems: "center",
				gap: "12px",
				padding: "10px 16px",
				background: "var(--bg-glass)",
				backdropFilter: "blur(16px)",
				border: isListening ? "1px solid var(--accent)" : "1px solid var(--ai-spark)",
				borderRadius: "9999px",
				boxShadow: isListening
					? "0 8px 30px rgba(56, 189, 248, 0.35)"
					: "0 8px 30px rgba(167, 139, 250, 0.35)",
				animation: "pulse 2s infinite ease-in-out",
			}}
		>
			{/* Orb Icon Glow */}
			<div
				style={{
					width: "36px",
					height: "36px",
					borderRadius: "50%",
					background: isListening
						? "radial-gradient(circle, #38bdf8 0%, #0284c7 100%)"
						: "radial-gradient(circle, #c084fc 0%, #7c3aed 100%)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#ffffff",
					boxShadow: isListening
						? "0 0 16px rgba(56, 189, 248, 0.8)"
						: "0 0 16px rgba(192, 132, 252, 0.8)",
				}}
			>
				{isListening ? <MicIcon size={18} /> : <SpeakerIcon size={18} />}
			</div>

			{/* Status Label & Wave bars */}
			<div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
						{isListening ? "Escuchando voz..." : "Leyendo respuesta..."}
					</span>
					{/* Soundwave bars */}
					<div style={{ display: "flex", alignItems: "center", gap: "3px", height: "14px" }}>
						{waveBars.map((h, i) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: simple visual visualizer bars
								key={i}
								style={{
									width: "3px",
									height: `${h}%`,
									background: isListening ? "var(--accent)" : "var(--ai-spark)",
									borderRadius: "2px",
									transition: "height 0.1s ease",
								}}
							/>
						))}
					</div>
				</div>
				<span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
					{isListening ? "Hablá al micrófono" : "Asistente reproduciendo audio"}
				</span>
			</div>

			{/* Stop Button */}
			<button
				type="button"
				onClick={onStop}
				style={{
					background: "rgba(239, 68, 68, 0.15)",
					border: "1px solid rgba(239, 68, 68, 0.35)",
					color: "#ef4444",
					borderRadius: "50%",
					width: "28px",
					height: "28px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					marginLeft: "4px",
				}}
				title={isListening ? "Detener micrófono" : "Detener audio"}
			>
				<StopIcon size={12} />
			</button>
		</div>
	);
}
