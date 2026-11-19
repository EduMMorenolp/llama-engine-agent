export function isNotificationSupported(): boolean {
	return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
	if (!isNotificationSupported()) return "unsupported";
	return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
	if (!isNotificationSupported()) return false;
	try {
		if (Notification.permission === "granted") return true;
		const permission = await Notification.requestPermission();
		return permission === "granted";
	} catch {
		return false;
	}
}

export interface NotifyAgentFinishedOptions {
	agentName?: string;
	sessionTitle?: string;
	content?: string;
	onClick?: () => void;
}

export function notifyAgentFinished({
	agentName,
	sessionTitle,
	content,
	onClick,
}: NotifyAgentFinishedOptions) {
	if (!isNotificationSupported() || Notification.permission !== "granted") {
		return;
	}

	// Clean Markdown formatting, code blocks and <think> reasoning tags
	const cleanContent = (content || "")
		.replace(/<think>[\s\S]*?<\/think>/gi, "")
		.replace(/```[\s\S]*?```/g, "[bloque de código]")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/[*_#~]/g, "")
		.replace(/\n+/g, " ")
		.trim();

	const title = agentName
		? `🤖 ${agentName} terminó de responder`
		: sessionTitle
			? `💬 ${sessionTitle}`
			: "🤖 El agente terminó de responder";

	const snippet = cleanContent.length > 140 ? `${cleanContent.slice(0, 140)}...` : cleanContent;

	try {
		const notification = new Notification(title, {
			body: snippet || "La respuesta del asistente está lista para revisar.",
			icon: "/favicon.ico",
			tag: "agent-response-finished",
		});

		notification.onclick = () => {
			window.focus();
			onClick?.();
			notification.close();
		};
	} catch (err) {
		console.warn("[notifications] Error al mostrar notificación nativa:", err);
	}
}
