import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
	CheckIcon,
	CopyIcon,
	DownloadIcon,
	EyeIcon,
	FileCodeIcon,
	Maximize2Icon,
	Minimize2Icon,
	XIcon,
} from "../../../components/ui/Icons.tsx";

export interface ArtifactData {
	id: string;
	title: string;
	language: string;
	content: string;
}

interface ArtifactPanelProps {
	artifact: ArtifactData;
	onClose: () => void;
}

export function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
	const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
	const [isMaximized, setIsMaximized] = useState(false);
	const [copied, setCopied] = useState(false);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const isHtml =
		artifact.language === "html" ||
		artifact.content.trim().startsWith("<!DOCTYPE html>") ||
		artifact.content.trim().startsWith("<html");
	const isSvg = artifact.language === "svg" || artifact.content.trim().startsWith("<svg");
	const canPreview = isHtml || isSvg;

	useEffect(() => {
		// Si no se puede previsualizar directamente, ir a pestaña de código
		if (!canPreview) {
			setActiveTab("code");
		} else {
			setActiveTab("preview");
		}
	}, [canPreview]);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(artifact.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleDownload = () => {
		const ext =
			artifact.language === "html"
				? "html"
				: artifact.language === "svg"
					? "svg"
					: artifact.language === "javascript" || artifact.language === "js"
						? "js"
						: artifact.language === "typescript" || artifact.language === "ts"
							? "ts"
							: artifact.language === "python" || artifact.language === "py"
								? "py"
								: artifact.language === "json"
									? "json"
									: "txt";

		const mime = isHtml ? "text/html" : isSvg ? "image/svg+xml" : "text/plain";

		const blob = new Blob([artifact.content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<div
			className={`artifact-panel ${isMaximized ? "maximized" : ""}`}
			style={{
				width: isMaximized ? "100%" : "50%",
				minWidth: isMaximized ? "100%" : "380px",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				background: "var(--bg-app)",
				borderLeft: isMaximized ? "none" : "1px solid var(--border-default)",
				position: isMaximized ? "fixed" : "relative",
				top: 0,
				right: 0,
				bottom: 0,
				zIndex: isMaximized ? 100 : 10,
				transition: "width 0.2s ease",
			}}
		>
			{/* Artifact Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "10px 16px",
					borderBottom: "1px solid var(--border-default)",
					background: "var(--bg-surface)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
					<FileCodeIcon size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
					<span
						style={{
							fontSize: "13.5px",
							fontWeight: 600,
							color: "var(--text-primary)",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{artifact.title}
					</span>
					<span
						style={{
							fontSize: "10.5px",
							padding: "1px 6px",
							background: "var(--bg-card)",
							border: "1px solid var(--border-subtle)",
							borderRadius: "4px",
							color: "var(--text-muted)",
							textTransform: "uppercase",
							fontFamily: "var(--font-mono)",
						}}
					>
						{artifact.language}
					</span>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					{/* Tabs */}
					{canPreview && (
						<div
							style={{
								display: "flex",
								background: "var(--bg-app)",
								borderRadius: "6px",
								padding: "2px",
								border: "1px solid var(--border-subtle)",
								marginRight: "6px",
							}}
						>
							<button
								type="button"
								onClick={() => setActiveTab("preview")}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
									padding: "4px 8px",
									fontSize: "12px",
									fontWeight: 500,
									border: "none",
									borderRadius: "4px",
									cursor: "pointer",
									background: activeTab === "preview" ? "var(--bg-surface-active)" : "transparent",
									color: activeTab === "preview" ? "var(--text-primary)" : "var(--text-muted)",
								}}
							>
								<EyeIcon size={13} />
								<span>Vista Previa</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("code")}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
									padding: "4px 8px",
									fontSize: "12px",
									fontWeight: 500,
									border: "none",
									borderRadius: "4px",
									cursor: "pointer",
									background: activeTab === "code" ? "var(--bg-surface-active)" : "transparent",
									color: activeTab === "code" ? "var(--text-primary)" : "var(--text-muted)",
								}}
							>
								<FileCodeIcon size={13} />
								<span>Código</span>
							</button>
						</div>
					)}

					<button
						type="button"
						className="session-action-btn"
						onClick={handleCopy}
						title="Copiar código del artefacto"
					>
						{copied ? (
							<CheckIcon size={14} style={{ color: "var(--success)" }} />
						) : (
							<CopyIcon size={14} />
						)}
					</button>

					<button
						type="button"
						className="session-action-btn"
						onClick={handleDownload}
						title="Descargar archivo"
					>
						<DownloadIcon size={14} />
					</button>

					<button
						type="button"
						className="session-action-btn"
						onClick={() => setIsMaximized(!isMaximized)}
						title={isMaximized ? "Restaurar tamaño" : "Pantalla completa"}
					>
						{isMaximized ? <Minimize2Icon size={14} /> : <Maximize2Icon size={14} />}
					</button>

					<button
						type="button"
						className="session-action-btn"
						onClick={onClose}
						title="Cerrar canvas"
					>
						<XIcon size={15} />
					</button>
				</div>
			</div>

			{/* Artifact Body */}
			<div style={{ flex: 1, overflow: "auto", position: "relative" }}>
				{activeTab === "preview" && canPreview ? (
					isSvg ? (
						<div
							style={{
								width: "100%",
								height: "100%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								padding: "24px",
								background: "var(--bg-surface)",
							}}
							// biome-ignore lint/security/noDangerouslySetInnerHtml: safe SVG artifact rendering
							dangerouslySetInnerHTML={{ __html: artifact.content }}
						/>
					) : (
						<iframe
							ref={iframeRef}
							title={artifact.title}
							srcDoc={artifact.content}
							sandbox="allow-scripts allow-modals"
							style={{
								width: "100%",
								height: "100%",
								border: "none",
								background: "#ffffff",
							}}
						/>
					)
				) : (
					<div style={{ padding: 0, height: "100%" }}>
						<SyntaxHighlighter
							language={artifact.language || "typescript"}
							style={oneDark}
							customStyle={{
								margin: 0,
								height: "100%",
								fontSize: "12.5px",
								background: "var(--bg-app)",
							}}
						>
							{artifact.content}
						</SyntaxHighlighter>
					</div>
				)}
			</div>
		</div>
	);
}
