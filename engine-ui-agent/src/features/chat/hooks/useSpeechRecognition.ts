import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
	resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
	message: string;
}

interface UseSpeechRecognitionReturn {
	listening: boolean;
	transcript: string;
	isSupported: boolean;
	start: () => void;
	stop: () => void;
	reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
	const [listening, setListening] = useState(false);
	const [transcript, setTranscript] = useState("");
	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const finalTranscriptRef = useRef("");

	const isSupported =
		typeof window !== "undefined" &&
		("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

	useEffect(() => {
		if (!isSupported) return;

		const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
		const recognition = new SpeechRecognitionConstructor();

		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "es";
		recognition.maxAlternatives = 1;

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			let interimText = "";
			const finalText = [];

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				if (result.isFinal) {
					finalText.push(result[0].transcript);
				} else {
					interimText += result[0].transcript;
				}
			}

			if (finalText.length > 0) {
				finalTranscriptRef.current += finalText.join(" ");
			}

			setTranscript(finalTranscriptRef.current + interimText);
		};

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			if (event.error === "no-speech" || event.error === "aborted") {
				return;
			}
			console.error("[speech] Error:", event.error, event.message);
		};

		recognition.onend = () => {
			setListening(false);
		};

		recognitionRef.current = recognition;

		return () => {
			recognition.abort();
			recognitionRef.current = null;
		};
	}, [isSupported]);

	const start = useCallback(() => {
		const recognition = recognitionRef.current;
		if (!recognition || listening) return;

		finalTranscriptRef.current = "";
		setTranscript("");
		try {
			recognition.start();
			setListening(true);
		} catch {
			// Already started
		}
	}, [listening]);

	const stop = useCallback(() => {
		const recognition = recognitionRef.current;
		if (!recognition) return;

		recognition.stop();
		setListening(false);
	}, []);

	const reset = useCallback(() => {
		finalTranscriptRef.current = "";
		setTranscript("");
	}, []);

	return {
		listening,
		transcript,
		isSupported,
		start,
		stop,
		reset,
	};
}
