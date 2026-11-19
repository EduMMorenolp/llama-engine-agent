import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import type { Message } from "../../../api.ts";
import logoImg from "../../../assets/logo.jpg";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	ClockIcon,
	CopyIcon,
	EditIcon,
	EyeIcon,
	ForkIcon,
	LightbulbIcon,
	RefreshCwIcon,
	SparklesIcon,
	SpeakerIcon,
	StarIcon,
	TerminalIcon,
	TrashIcon,
	UserIcon,
	VolumeXIcon,
	XIcon,
	ZapIcon,
} from "../../../components/ui/Icons.tsx";

import { useAppSettings } from "../../../lib/useAppSettings.ts";
import type { ArtifactData } from "./ArtifactPanel.tsx";

export interface ToolCallInfo {
	id?: string;
	name: string;
	args: Record<string, unknown>;
	result?: string;
	status: "pending" | "done" | "error";
}

interface MessageBubbleProps {
	message: Message;
	toolCalls?: ToolCallInfo[];
	toolResults?: Record<string, string>;
	isStreaming?: boolean;
	modelName?: string;
	onCopy?: (text: string) => void;
	onEdit?: (message: Message) => void;
	onReload?: (message: Message) => void;
	onFavorite?: (message: Message) => void;
	onFork?: (messageId: string) => void;
	onDelete?: (messageId: string) => void;
	onOpenArtifact?: (artifact: ArtifactData) => void;
	onSpeak?: (text: string) => void;
	isSpeakingThis?: boolean;
	variants?: string[];
	activeVariantIndex?: number;
	onVariantChange?: (index: number) => void;
}

function parseThinking(content: string): { thinking: string; rest: string } {
	if (!content) return { thinking: "", rest: "" };

	const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/gi;
	const thinkings: string[] = [];

	const matches = content.matchAll(thinkRegex);
	for (const match of matches) {
		if (match[1]?.trim()) {
			thinkings.push(match[1].trim());
		}
	}

	const rest = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();

	return {
		thinking: thinkings.join("\n\n"),
		rest,
	};
}

function CodeCopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<button
			type="button"
			className="code-copy-btn"
			onClick={handleCopy}
			title="Copiar fragmento de código"
		>
			{copied ? (
				<>
					<CheckIcon size={12} style={{ color: "var(--success)" }} />
					<span style={{ color: "var(--success)" }}>Copiado</span>
				</>
			) : (
				<>
					<CopyIcon size={12} />
					<span>Copiar</span>
				</>
			)}
		</button>
	);
}

interface GenericToolCall {
	id?: string;
	name?: string;
	args?: unknown;
	status?: string;
	result?: unknown;
	function?: {
		id?: string;
		name?: string;
		arguments?: unknown;
	};
}

function formatToolArgs(tc: GenericToolCall | null | undefined): string {
	if (!tc) return "";
	if (typeof tc.args === "string") return tc.args;
	if (tc.args && typeof tc.args === "object") {
		try {
			return JSON.stringify(tc.args);
		} catch {
			return "";
		}
	}
	if (tc.function?.arguments) {
		return typeof tc.function.arguments === "string"
			? tc.function.arguments
			: JSON.stringify(tc.function.arguments);
	}
	return "";
}

function getToolName(tc: GenericToolCall | null | undefined): string {
	return tc?.name || tc?.function?.name || "herramienta";
}

function getToolStatus(tc: GenericToolCall | null | undefined): "pending" | "done" | "error" {
	if (tc?.status === "pending" || tc?.status === "done" || tc?.status === "error") {
		return tc.status;
	}
	return "done";
}

function ToolCallItem({ tc }: { tc: GenericToolCall }) {
	const [isOpen, setIsOpen] = useState(false);
	const toolName = getToolName(tc);
	const toolStatus = getToolStatus(tc);
	const rawArgsStr = formatToolArgs(tc);
	const toolArgsStr = rawArgsStr.length > 70 ? `${rawArgsStr.slice(0, 70)}...` : rawArgsStr;
	const result =
		typeof tc.result === "string" ? tc.result : tc.result ? JSON.stringify(tc.result, null, 2) : "";

	return (
		<div className={`tool-call-card ${toolStatus}`} style={{ marginBottom: "6px" }}>
			<button
				type="button"
				className="tool-call-header-btn"
				onClick={() => setIsOpen(!isOpen)}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					width: "100%",
					background: "none",
					border: "none",
					padding: "8px 10px",
					cursor: "pointer",
					textAlign: "left",
					color: "inherit",
				}}
			>
				<div
					className="tool-call-left"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						overflow: "hidden",
					}}
				>
					{isOpen ? <ChevronDownIcon size={13} /> : <ChevronRightIcon size={13} />}
					<TerminalIcon size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
					<span className="tool-call-name" style={{ fontWeight: 600 }}>
						{toolName}
					</span>
					{!isOpen && toolArgsStr && (
						<span
							className="tool-call-args"
							style={{
								opacity: 0.65,
								fontSize: "12px",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{toolArgsStr}
						</span>
					)}
				</div>
				<div className="tool-call-status" style={{ flexShrink: 0, marginLeft: "8px" }}>
					{toolStatus === "pending" ? (
						<span style={{ color: "var(--warning)", fontSize: "11px", fontWeight: 500 }}>
							Ejecutando...
						</span>
					) : toolStatus === "done" ? (
						<CheckIcon size={14} style={{ color: "var(--success)" }} />
					) : (
						<XIcon size={14} style={{ color: "var(--danger)" }} />
					)}
				</div>
			</button>

			{isOpen && (
				<div
					className="tool-call-expanded"
					style={{
						padding: "0 10px 10px 10px",
						borderTop: "1px solid var(--border-subtle)",
						marginTop: "4px",
					}}
				>
					{rawArgsStr && (
						<div style={{ marginTop: "6px" }}>
							<div
								style={{
									fontSize: "11px",
									fontWeight: 600,
									color: "var(--text-muted)",
									marginBottom: "3px",
								}}
							>
								Argumentos:
							</div>
							<pre
								style={{
									margin: 0,
									padding: "6px 8px",
									background: "var(--bg-surface)",
									borderRadius: "6px",
									fontSize: "11.5px",
									fontFamily: "var(--font-mono)",
									overflowX: "auto",
									maxHeight: "140px",
								}}
							>
								{rawArgsStr}
							</pre>
						</div>
					)}
					<div style={{ marginTop: "6px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "3px",
							}}
						>
							<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>
								Salida / Resultado:
							</span>
							{result && <CodeCopyButton text={result} />}
						</div>
						<pre
							style={{
								margin: 0,
								padding: "6px 8px",
								background: "var(--bg-surface)",
								borderRadius: "6px",
								fontSize: "11.5px",
								fontFamily: "var(--font-mono)",
								overflowX: "auto",
								maxHeight: "220px",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
							}}
						>
							{result || (toolStatus === "pending" ? "Ejecutando herramienta..." : "(sin salida)")}
						</pre>
					</div>
				</div>
			)}
		</div>
	);
}

export function MessageBubble({
	message,
	toolCalls = [],
	toolResults,
	isStreaming = false,
	modelName = "qwen3.5-9b",
	onCopy,
	onEdit,
	onReload,
	onFavorite,
	onFork,
	onDelete,
	onOpenArtifact,
	onSpeak,
	isSpeakingThis = false,
	variants,
	activeVariantIndex = 0,
	onVariantChange,
}: MessageBubbleProps) {
	const appSettings = useAppSettings();
	const isUser = message.role === "user";
	const isTool = message.role === "tool";
	const [copiedMsg, setCopiedMsg] = useState(false);
	const [thinkingOpen, setThinkingOpen] = useState(false);

	if (isTool) return null;
	const content =
		variants && variants.length > 0 && activeVariantIndex !== undefined
			? (variants[activeVariantIndex] ?? message.content ?? "")
			: (message.content ?? "");
	const { thinking, rest } = parseThinking(content);
	const displayContent = rest;

	// Estimate token metrics (excluding base64 payload to reflect true token count)
	const cleanContentForMetrics = displayContent.replace(
		/!\[.*?\]\(data:image\/[^;]+;base64,[^)]+\)/g,
		"",
	);
	const hasImageAttachment = displayContent.includes("data:image/");
	const tokenCount = Math.max(
		1,
		Math.round(cleanContentForMetrics.length / 3.8) + (hasImageAttachment ? 320 : 0),
	);
	const durationSeconds = (tokenCount / (isUser ? 600 : 45)).toFixed(1);
	const tokensPerSecond = isUser
		? "662.66"
		: (tokenCount / Math.max(0.2, parseFloat(durationSeconds))).toFixed(2);

	// Parse tool calls safely from message if present as JSON string or array
	let parsedToolCalls: GenericToolCall[] = Array.isArray(toolCalls) ? toolCalls : [];
	if (parsedToolCalls.length === 0 && message.toolCalls) {
		try {
			const parsed =
				typeof message.toolCalls === "string" ? JSON.parse(message.toolCalls) : message.toolCalls;
			if (Array.isArray(parsed)) {
				parsedToolCalls = parsed;
			}
		} catch {
			parsedToolCalls = [];
		}
	}

	if (toolResults && parsedToolCalls.length > 0) {
		parsedToolCalls = parsedToolCalls.map((tc) => {
			const callId = tc.id || tc.function?.id;
			if (callId && toolResults[callId] && !tc.result) {
				return { ...tc, result: toolResults[callId], status: "done" };
			}
			return tc;
		});
	}

	const handleCopyMessage = async () => {
		const cleanForClipboard = displayContent.replace(
			/!\[(.*?)\]\(data:image\/[^;]+;base64,[^)]+\)/g,
			"[Imagen: $1]",
		);
		await navigator.clipboard.writeText(cleanForClipboard);
		setCopiedMsg(true);
		onCopy?.(cleanForClipboard);
		setTimeout(() => setCopiedMsg(false), 2000);
	};

	return (
		<div className={`message-row ${isUser ? "user" : "assistant"}`}>
			<div className={`message-avatar ${isUser ? "user" : "assistant"}`}>
				{isUser ? (
					<UserIcon size={18} />
				) : (
					<img src={logoImg} alt="AI" className="assistant-avatar-img" />
				)}
			</div>

			<div className="message-body-container">
				{/* Top Performance Stats for Message */}
				{appSettings.showMetrics && (
					<div className={`message-stats-header ${isUser ? "user" : "assistant"}`}>
						<span className="stat-pill">
							<span style={{ fontFamily: "var(--font-mono)", opacity: 0.7 }}>ab</span>
							<span>{tokenCount} tokens</span>
						</span>
						<span className="stat-pill">
							<ClockIcon size={11} />
							<span>{durationSeconds}s</span>
						</span>
						<span className="stat-pill">
							<ZapIcon size={11} />
							<span>
								{tokensPerSecond} {isUser ? "tokens/s" : "t/s"}
							</span>
						</span>
					</div>
				)}

				<div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
					{/* DeepSeek R1 / Qwen Reasoning Container */}
					{thinking && (
						<div className="thinking-container">
							<button
								type="button"
								className="thinking-header"
								onClick={() => setThinkingOpen(!thinkingOpen)}
								style={{ width: "100%", border: "none", textAlign: "left" }}
							>
								<div className="thinking-header-left">
									<LightbulbIcon size={15} style={{ color: "var(--accent)" }} />
									<span style={{ fontWeight: 600 }}>Reasoning</span>
								</div>
								{thinkingOpen ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
							</button>
							{thinkingOpen && (
								<div className="thinking-body">
									{thinking}
									{isStreaming && !displayContent && <span className="streaming-cursor" />}
								</div>
							)}
						</div>
					)}

					{/* Tool Execution Cards */}
					{parsedToolCalls.length > 0 && (
						<div className="tool-calls-container">
							{parsedToolCalls.map((tc, idx) => (
								<ToolCallItem key={tc.id || `${getToolName(tc)}-${idx}`} tc={tc} />
							))}
						</div>
					)}

					{/* Message Content */}
					{displayContent ? (
						<div className={`message-content ${isUser ? "user-bubble-content" : ""}`}>
							<div className="markdown-content">
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									urlTransform={(url) => url}
									components={{
										p(props) {
											return <div className="markdown-paragraph">{props.children}</div>;
										},
										img(props) {
											const { src, alt } = props;
											if (!src) return null;
											return (
												<span className="attached-media-container">
													<button
														type="button"
														className="attached-media-btn"
														style={{
															background: "none",
															border: "none",
															padding: 0,
															cursor: "pointer",
															display: "inline-flex",
														}}
														onClick={() => window.open(src, "_blank")}
														title="Ver imagen en tamaño completo"
													>
														<img
															src={src}
															alt={alt || "Imagen adjunta"}
															className="attached-media-img"
															loading="lazy"
														/>
													</button>
													{alt && <span className="attached-media-name">{alt}</span>}
												</span>
											);
										},
										code(props) {
											const { children, className, ...rest } = props;
											const match = /language-(\w+)/.exec(className || "");
											const codeString = String(children).replace(/\n$/, "");

											if (match) {
												return (
													<div className="code-block-wrapper">
														<div className="code-block-header">
															<span className="code-lang-label">{match[1]}</span>
															<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
																{onOpenArtifact && (
																	<button
																		type="button"
																		className="code-copy-btn"
																		onClick={() =>
																			onOpenArtifact({
																				id: `art-${message.id}-${match[1]}`,
																				title: `Artefacto (${match[1]})`,
																				language: match[1],
																				content: codeString,
																			})
																		}
																		title="Abrir en panel de Artifacts / Canvas"
																	>
																		<EyeIcon size={12} />
																		<span>Canvas</span>
																	</button>
																)}
																<CodeCopyButton text={codeString} />
															</div>
														</div>
														<SyntaxHighlighter
															style={oneDark}
															language={match[1]}
															PreTag="div"
															customStyle={{
																margin: 0,
																background: "#0d1017",
																fontSize: "13px",
																padding: "12px 14px",
																fontFamily: "var(--font-mono)",
																lineHeight: 1.5,
															}}
														>
															{codeString}
														</SyntaxHighlighter>
													</div>
												);
											}
											return (
												<code className="inline-code" {...rest}>
													{children}
												</code>
											);
										},
										a(props) {
											const { children, href } = props;
											return (
												<a href={href} target="_blank" rel="noopener noreferrer">
													{children}
												</a>
											);
										},
										table(props) {
											return (
												<div className="table-wrapper">
													<table {...props} />
												</div>
											);
										},
									}}
								>
									{displayContent}
								</ReactMarkdown>
								{isStreaming && <span className="streaming-cursor" style={{ marginLeft: "4px" }} />}
							</div>
						</div>
					) : isStreaming && !thinking && parsedToolCalls.length === 0 ? (
						<div className="message-content">
							<span className="streaming-cursor" />
						</div>
					) : null}
				</div>

				{/* Message Bottom Action Bar */}
				<div className={`message-actions-bar ${isUser ? "user" : "assistant"}`}>
					{!isUser && (
						<div className="message-model-pill">
							<span className="model-pill-icon">⬡</span>
							<span className="model-pill-name">{modelName}</span>
							{message._subAgent && (
								<span className="sub-agent-badge">
									<SparklesIcon size={10} />
									{message._subAgent}
								</span>
							)}
						</div>
					)}

					<div className="actions-cluster">
						{variants && variants.length > 1 && (
							<div
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "3px",
									fontSize: "11px",
									color: "var(--text-muted)",
									marginRight: "4px",
									background: "var(--bg-surface)",
									padding: "1px 6px",
									borderRadius: "4px",
									border: "1px solid var(--border-subtle)",
								}}
							>
								<button
									type="button"
									disabled={activeVariantIndex <= 0}
									onClick={() => onVariantChange?.(activeVariantIndex - 1)}
									style={{
										background: "none",
										border: "none",
										color: "inherit",
										cursor: activeVariantIndex <= 0 ? "default" : "pointer",
										opacity: activeVariantIndex <= 0 ? 0.35 : 1,
										padding: "0 2px",
										fontWeight: "bold",
									}}
									title="Respuesta anterior"
								>
									&lt;
								</button>
								<span>
									{activeVariantIndex + 1}/{variants.length}
								</span>
								<button
									type="button"
									disabled={activeVariantIndex >= variants.length - 1}
									onClick={() => onVariantChange?.(activeVariantIndex + 1)}
									style={{
										background: "none",
										border: "none",
										color: "inherit",
										cursor: activeVariantIndex >= variants.length - 1 ? "default" : "pointer",
										opacity: activeVariantIndex >= variants.length - 1 ? 0.35 : 1,
										padding: "0 2px",
										fontWeight: "bold",
									}}
									title="Respuesta siguiente"
								>
									&gt;
								</button>
							</div>
						)}

						{!isUser && onSpeak && displayContent && (
							<button
								type="button"
								className="action-icon-btn"
								title={isSpeakingThis ? "Detener lectura de voz" : "Leer respuesta en voz alta"}
								onClick={() => onSpeak(displayContent)}
								style={isSpeakingThis ? { color: "var(--accent)" } : undefined}
							>
								{isSpeakingThis ? <VolumeXIcon size={14} /> : <SpeakerIcon size={14} />}
							</button>
						)}

						<button
							type="button"
							className="action-icon-btn"
							title="Copiar mensaje"
							onClick={handleCopyMessage}
						>
							{copiedMsg ? (
								<CheckIcon size={14} style={{ color: "var(--success)" }} />
							) : (
								<CopyIcon size={14} />
							)}
						</button>

						{onFavorite && (
							<button
								type="button"
								className="action-icon-btn"
								title={message.favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
								onClick={() => onFavorite(message)}
								style={message.favorite ? { color: "#fbbf24" } : undefined}
							>
								<StarIcon size={14} filled={!!message.favorite} />
							</button>
						)}

						{isUser && onEdit && (
							<button
								type="button"
								className="action-icon-btn"
								title="Editar mensaje"
								onClick={() => onEdit(message)}
							>
								<EditIcon size={14} />
							</button>
						)}

						{onReload && (
							<button
								type="button"
								className="action-icon-btn"
								title={isUser ? "Reenviar mensaje" : "Regenerar respuesta"}
								onClick={() => onReload(message)}
							>
								<RefreshCwIcon size={14} />
							</button>
						)}

						{onFork && (
							<button
								type="button"
								className="action-icon-btn"
								title="Bifurcar conversación desde este punto"
								onClick={() => onFork(message.id)}
							>
								<ForkIcon size={14} />
							</button>
						)}

						{onDelete && (
							<button
								type="button"
								className="action-icon-btn danger-hover"
								title="Eliminar mensaje"
								onClick={() => onDelete(message.id)}
							>
								<TrashIcon size={14} />
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
