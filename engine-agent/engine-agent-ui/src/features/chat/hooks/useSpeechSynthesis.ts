import { useCallback, useEffect, useState } from "react";

export function useSpeechSynthesis() {
	const [speaking, setSpeaking] = useState(false);
	const [supported, setSupported] = useState(false);
	const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			setSupported(true);
		}
	}, []);

	const stop = useCallback(() => {
		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			window.speechSynthesis.cancel();
			setSpeaking(false);
			setCurrentSpeakingId(null);
		}
	}, []);

	const speak = useCallback(
		(text: string, messageId?: string) => {
			if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

			// Si ya está hablando el mismo mensaje, detenerlo (toggle)
			if (speaking && messageId && currentSpeakingId === messageId) {
				stop();
				return;
			}

			window.speechSynthesis.cancel();

			// Limpiar código, markdown y etiquetas <think> para pronunciación fluida
			const cleanText = text
				.replace(/<think>[\s\S]*?<\/think>/gi, "")
				.replace(/```[\s\S]*?```/g, "bloque de código omitido")
				.replace(/`([^`]+)`/g, "$1")
				.replace(/[*_#~>]/g, "")
				.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
				.trim();

			if (!cleanText) return;

			const utterance = new SpeechSynthesisUtterance(cleanText);
			utterance.lang = "es-ES";
			utterance.rate = 1.05;

			const voices = window.speechSynthesis.getVoices();
			const esVoice =
				voices.find((v) => v.lang === "es-AR" || v.lang === "es-ES" || v.lang.startsWith("es")) ||
				voices[0];
			if (esVoice) utterance.voice = esVoice;

			utterance.onstart = () => {
				setSpeaking(true);
				if (messageId) setCurrentSpeakingId(messageId);
			};
			utterance.onend = () => {
				setSpeaking(false);
				setCurrentSpeakingId(null);
			};
			utterance.onerror = () => {
				setSpeaking(false);
				setCurrentSpeakingId(null);
			};

			window.speechSynthesis.speak(utterance);
		},
		[speaking, currentSpeakingId, stop],
	);

	return { speak, stop, speaking, currentSpeakingId, isSupported: supported };
}

