import { MoonIcon, SunIcon } from "../../../components/ui/Icons.tsx";
import { useAppSettings } from "../../../lib/useAppSettings.ts";

export function SettingsPage() {
	const appSettings = useAppSettings();

	return (
		<div style={{ flex: 1, height: "100%", overflowY: "auto", padding: "24px 32px" }}>
			<div style={{ marginBottom: "24px" }}>
				<h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
					Configuración del Sistema
				</h1>
				<p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
					Preferencias globales del asistente, interfaz y conexión al runtime local.
				</p>
			</div>

			<div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "20px" }}>
				{/* Theme & Appearance */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "18px",
					}}
				>
					<h3
						style={{
							fontSize: "14px",
							fontWeight: 700,
							color: "var(--text)",
							marginBottom: "12px",
						}}
					>
						Apariencia & Tema
					</h3>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<div>
							<div style={{ fontWeight: 600, fontSize: "13px" }}>Tema Visual</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Alternar entre tema oscuro (Obsidian) y claro
							</div>
						</div>
						<button
							type="button"
							className="btn btn-ghost"
							onClick={appSettings.toggleTheme}
							style={{
								border: "1px solid var(--border)",
								padding: "6px 12px",
								borderRadius: "var(--r-sm)",
								fontSize: "12.5px",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							{appSettings.theme === "dark" ? <SunIcon size={14} /> : <MoonIcon size={14} />}
							<span>{appSettings.theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
						</button>
					</div>
				</div>

				{/* Auto Scroll & Thinking */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "18px",
					}}
				>
					<h3
						style={{
							fontSize: "14px",
							fontWeight: 700,
							color: "var(--text)",
							marginBottom: "12px",
						}}
					>
						Comportamiento del Chat
					</h3>
					<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<div>
								<div style={{ fontWeight: 600, fontSize: "13px" }}>
									Desplazamiento Automático (Auto-scroll)
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									Seguir el flujo de texto en tiempo real al generar respuesta
								</div>
							</div>
							<label className="switch-control" aria-label="Auto scroll">
								<input
									type="checkbox"
									checked={appSettings.autoScroll}
									onChange={(e) => appSettings.updateSettings({ autoScroll: e.target.checked })}
								/>
								<span className="switch-slider" />
							</label>
						</div>

						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<div>
								<div style={{ fontWeight: 600, fontSize: "13px" }}>
									Expandir Razonamiento Automáticamente
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									Mostrar el bloque &lt;think&gt; desplegado por defecto
								</div>
							</div>
							<label className="switch-control" aria-label="Expandir razonamiento">
								<input
									type="checkbox"
									checked={appSettings.expandReasoning}
									onChange={(e) =>
										appSettings.updateSettings({ expandReasoning: e.target.checked })
									}
								/>
								<span className="switch-slider" />
							</label>
						</div>
					</div>
				</div>

				{/* API Key */}
				<div
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						padding: "18px",
					}}
				>
					<h3
						style={{
							fontSize: "14px",
							fontWeight: 700,
							color: "var(--text)",
							marginBottom: "12px",
						}}
					>
						Autenticación & Clave API
					</h3>
					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						<label htmlFor="api-key-input" style={{ fontSize: "12px", color: "var(--muted)" }}>
							Clave API de engine-agent-api (x-api-key)
						</label>
						<input
							id="api-key-input"
							type="password"
							className="text-input"
							value={appSettings.apiKey}
							onChange={(e) => appSettings.updateSettings({ apiKey: e.target.value })}
							placeholder="llama-engine-dev"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
