import { type ReactNode, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { fetchMemories } from "../../api.ts";
import {
	BotIcon,
	BrainIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	MessageSquareIcon,
	SearchIcon,
	ServerIcon,
	SlidersIcon,
	SparklesIcon,
	WrenchIcon,
} from "../ui/Icons.tsx";

interface NavItem {
	to: string;
	label: string;
	end: boolean;
	badge?: string;
	icon: ReactNode;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
	{
		title: "Principal",
		items: [
			{ to: "/", label: "Chats", end: true, badge: "Live", icon: <MessageSquareIcon size={17} /> },
		],
	},
	{
		title: "Capacidades & Extensiones",
		items: [
			{ to: "/agents", label: "Agentes", end: false, icon: <BotIcon size={17} /> },
			{
				to: "/skills",
				label: "Skills",
				end: false,
				badge: "Nativo",
				icon: <SparklesIcon size={17} />,
			},
			{ to: "/tools", label: "Tools", end: false, badge: "18", icon: <WrenchIcon size={17} /> },
			{ to: "/mcp", label: "MCP Servers", end: false, icon: <ServerIcon size={17} /> },
			{ to: "/memories", label: "Memorias", end: false, icon: <BrainIcon size={17} /> },
		],
	},
	{
		title: "Sistema",
		items: [
			{ to: "/settings", label: "Configuración", end: false, icon: <SlidersIcon size={17} /> },
		],
	},
];

interface SidebarProps {
	collapsed: boolean;
	onToggleCollapse: () => void;
	onOpenPalette: () => void;
	activeModel?: string;
	activeSessionCount?: number;
}

export function Sidebar({
	collapsed,
	onToggleCollapse,
	onOpenPalette,
	activeModel = "qwen3.5-4b",
	activeSessionCount = 0,
}: SidebarProps) {
	const [memoriesCount, setMemoriesCount] = useState(0);

	useEffect(() => {
		const loadMemoriesCount = () => {
			fetchMemories()
				.then((mems) => setMemoriesCount(mems.length))
				.catch(() => {});
		};
		loadMemoriesCount();
		window.addEventListener("memories_updated", loadMemoriesCount);
		return () => window.removeEventListener("memories_updated", loadMemoriesCount);
	}, []);

	return (
		<aside
			className={`sidebar ${collapsed ? "collapsed" : ""}`}
			aria-label="Navegación principal de Engine Agent"
		>
			{/* Brand Header */}
			<div className="sidebar-brand">
				<div className="brand-logo" aria-hidden="true">
					🤖
				</div>
				{!collapsed ? (
					<div className="brand-text">
						<span className="brand-name">engine-agent</span>
						<span className="brand-sub">AGENT STUDIO · v0.2.0</span>
					</div>
				) : null}
				<button
					type="button"
					className="sidebar-collapse-btn"
					onClick={onToggleCollapse}
					title={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
					aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
				>
					{collapsed ? <ChevronRightIcon size={15} /> : <ChevronLeftIcon size={15} />}
				</button>
			</div>

			{/* Search Action / Command Palette Button */}
			<button
				type="button"
				className="sidebar-search-btn"
				onClick={onOpenPalette}
				title="Buscar acción o comando (Ctrl+K)"
				aria-label="Buscar acción o comando (Ctrl+K)"
			>
				<SearchIcon size={14} />
				{!collapsed ? (
					<>
						<span>Buscar acción…</span>
						<kbd className="kbd">Ctrl K</kbd>
					</>
				) : null}
			</button>

			{/* Navigation Groups */}
			<nav className="sidebar-nav">
				{NAV_GROUPS.map((group) => (
					<div key={group.title} className="sidebar-group">
						{!collapsed ? <div className="sidebar-group-label">{group.title}</div> : null}
						<ul>
							{group.items.map((item) => (
								<li key={item.to}>
									<NavLink
										to={item.to}
										end={item.end}
										className={({ isActive }) => `sidebar-nav-link ${isActive ? "active" : ""}`}
										title={collapsed ? item.label : undefined}
									>
										<span className="nav-glyph">{item.icon}</span>
										{!collapsed ? (
											<>
												<span className="nav-label">{item.label}</span>
												{item.to === "/" && activeSessionCount > 0 ? (
													<span className="nav-badge">{activeSessionCount}</span>
												) : item.to === "/memories" ? (
													<span className="nav-badge">{memoriesCount}</span>
												) : item.badge ? (
													<span className="nav-badge">{item.badge}</span>
												) : null}
											</>
										) : null}
									</NavLink>
								</li>
							))}
						</ul>
					</div>
				))}
			</nav>

			{/* Runtime Card */}
			{!collapsed ? (
				<div className="sidebar-runtime-card">
					<div className="sidebar-runtime-row">
						<span className="model-dot" style={{ background: "#10b981" }} aria-hidden="true" />
						<span className="sidebar-runtime-status">engine ok</span>
						<span className="sidebar-vram-pct">WS Live</span>
					</div>
					<div className="sidebar-runtime-model" title={activeModel}>
						{activeModel}
					</div>
					<div className="sidebar-mini-bar">
						<div className="sidebar-mini-fill" style={{ width: "65%" }} />
					</div>
				</div>
			) : null}

			{/* Footer */}
			<footer className="sidebar-foot">
				<span style={{ color: "var(--muted)" }}>v0.2.0</span>
				{!collapsed ? <span style={{ color: "var(--muted)" }}>llama.cpp /v1</span> : null}
			</footer>
		</aside>
	);
}
