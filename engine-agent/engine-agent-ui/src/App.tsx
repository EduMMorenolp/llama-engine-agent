import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout.tsx";
import { AgentsPage } from "./features/agents/pages/AgentsPage.tsx";
import { ChatView } from "./features/chat/components/ChatView.tsx";
import { MCPPage } from "./features/mcp/pages/MCPPage.tsx";
import { MemoriesPage } from "./features/memories/pages/MemoriesPage.tsx";
import { SettingsPage } from "./features/settings/pages/SettingsPage.tsx";
import { SkillsPage } from "./features/skills/pages/SkillsPage.tsx";
import { ToolsPage } from "./features/tools/pages/ToolsPage.tsx";
import { SessionsProvider } from "./providers/SessionsProvider.tsx";
import { ToastProvider } from "./providers/ToastProvider.tsx";

export default function App() {
	return (
		<ToastProvider>
			<SessionsProvider>
				<BrowserRouter>
					<Routes>
						<Route element={<Layout />}>
							<Route index element={<ChatView />} />
							<Route path="/agents" element={<AgentsPage />} />
							<Route path="/skills" element={<SkillsPage />} />
							<Route path="/tools" element={<ToolsPage />} />
							<Route path="/mcp" element={<MCPPage />} />
							<Route path="/memories" element={<MemoriesPage />} />
							<Route path="/settings" element={<SettingsPage />} />
							<Route path="*" element={<ChatView />} />
						</Route>
					</Routes>
				</BrowserRouter>
			</SessionsProvider>
		</ToastProvider>
	);
}
