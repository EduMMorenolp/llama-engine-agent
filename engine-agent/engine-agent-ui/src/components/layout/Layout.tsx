import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { fetchAvailableModels, type ModelInfo } from "../../api.ts";
import { CommandPaletteModal } from "../../features/chat/components/CommandPaletteModal.tsx";
import { useSessions } from "../../features/sessions/hooks/useSessions.ts";
import { Sidebar } from "./Sidebar.tsx";
import { Topbar } from "./Topbar.tsx";

const FALLBACK_MODELS: ModelInfo[] = [
	{ id: "qwen3.5-4b", name: "Qwen 3.5 4B", badge: "Visión", loaded: true },
	{ id: "qwen3.5-9b", name: "Qwen 3.5 9B", badge: "Texto" },
	{ id: "gemma-4-e4b", name: "Gemma 4 E4B", badge: "Visión" },
	{ id: "mistral-small-7b", name: "Mistral Small 7B", badge: "Texto" },
];

export function Layout() {
	const navigate = useNavigate();
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [inspectorOpen, setInspectorOpen] = useState(false);
	const [subSidebarOpen, setSubSidebarOpen] = useState(true);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
	const [selectedModel, setSelectedModel] = useState("qwen3.5-4b");

	const { sessions, activeSessionId, selectSession, removeSession, createNewSession, messages } =
		useSessions();

	useEffect(() => {
		fetchAvailableModels()
			.then((res) => {
				if (res?.models && res.models.length > 0) {
					setModels(res.models);
					const active = res.models.find((m) => m.loaded) || res.models[0];
					if (active) setSelectedModel(active.id);
				}
			})
			.catch(() => {});
	}, []);

	// Global shortcut Ctrl+K
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setPaletteOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, []);

	const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
	const contextPercent = Math.min(100, Math.round((totalChars / 60000) * 100));

	const handleCompactContext = () => {
		window.dispatchEvent(new CustomEvent("trigger_compact_context"));
	};

	return (
		<div className="layout">
			<Sidebar
				collapsed={sidebarCollapsed}
				onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
				onOpenPalette={() => setPaletteOpen(true)}
				activeModel={selectedModel}
				activeSessionCount={sessions.length}
			/>

			<div className="shell">
				<Topbar
					sessions={sessions}
					activeSessionId={activeSessionId}
					onSelectSession={selectSession}
					onCloseSession={removeSession}
					onNewSession={() => createNewSession()}
					models={models}
					selectedModel={selectedModel}
					onSelectModel={setSelectedModel}
					contextPercent={contextPercent}
					totalChars={totalChars}
					inspectorOpen={inspectorOpen}
					onToggleInspector={() => setInspectorOpen((v) => !v)}
					onOpenPalette={() => setPaletteOpen(true)}
					onCompactContext={handleCompactContext}
				/>

				<main className="page">
					<Outlet
						context={{
							inspectorOpen,
							toggleInspector: () => setInspectorOpen((v) => !v),
							subSidebarOpen,
							toggleSubSidebar: () => setSubSidebarOpen((v) => !v),
							selectedModel,
							models,
						}}
					/>
				</main>
			</div>

			{paletteOpen && (
				<CommandPaletteModal
					onClose={() => setPaletteOpen(false)}
					onOpenMemories={() => navigate("/memories")}
					onOpenSettings={() => navigate("/settings")}
					onExportChat={() => window.dispatchEvent(new CustomEvent("trigger_export_chat"))}
				/>
			)}
		</div>
	);
}
