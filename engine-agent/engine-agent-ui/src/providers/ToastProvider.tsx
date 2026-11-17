import { createContext, useCallback, useContext, useState } from "react";

export interface Toast {
	id: string;
	type: "success" | "error" | "info" | "warning";
	message: string;
}

interface ToastContextValue {
	toasts: Toast[];
	addToast: (typeOrMessage: Toast["type"] | string, message?: string) => void;
	removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const addToast = useCallback(
		(a: Toast["type"] | string, b?: string) => {
			const validTypes = ["success", "error", "info", "warning"] as const;
			let type: Toast["type"] = "info";
			let message = "";

			if (b !== undefined) {
				if (validTypes.includes(a as Toast["type"])) {
					type = a as Toast["type"];
					message = b;
				} else {
					message = a;
					type = validTypes.includes(b as Toast["type"]) ? (b as Toast["type"]) : "info";
				}
			} else {
				message = a;
				type = "info";
			}

			const id = crypto.randomUUID?.() ?? Date.now().toString();
			setToasts((prev) => [...prev, { id, type, message }]);
			setTimeout(() => removeToast(id), 3000);
		},
		[removeToast],
	);

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
			{children}
			<div className="toast-container">
				{toasts.map((t) => (
					<button
						key={t.id}
						type="button"
						className={`toast toast-${t.type}`}
						onClick={() => removeToast(t.id)}
						style={{ textAlign: "left", width: "auto" }}
					>
						{t.message}
					</button>
				))}
			</div>
		</ToastContext.Provider>
	);
}
