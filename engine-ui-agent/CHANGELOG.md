# Changelog

## Sin liberar

- **Agregado**: 5 features de uso cotidiano — (1) **Auto-título de sesión**: refresco reactivo automático que adopta el nuevo nombre generado por el backend sin bloquear la interfaz; (2) **Tags de sesión**: visualización de chips de tags en la lista de chats, agregador rápido de tags inline y filtro dinámico por tag en el sidebar; (3) **Favoritos en mensajes**: botón de estrella en la barra de acciones de `MessageBubble` con persistencia instantánea y modal dedicado `FavoritesModal` (tab "Guardados") para explorar y saltar a respuestas clave; (4) **Búsqueda full-text en mensajes**: buscador debounced en tiempo real que encuentra coincidencias dentro del contenido de los mensajes con snippets de contexto y navegación directa a la sesión correspondiente; (5) **Indicador de ventana de contexto**: badge dinámico en la barra superior de chat (`chat-navbar-right`) que muestra el porcentaje de contexto consumido con alerta visual cuando supera el 85%. [2026-09-24]
  * **Archivos**: `src/api.ts`, `src/providers/SessionsProvider.tsx`, `src/components/ui/Icons.tsx`, `src/features/chat/components/ChatView.tsx`, `src/features/chat/components/MessageBubble.tsx`, `src/features/sessions/components/SessionList.tsx`, `src/features/sessions/components/FavoritesModal.tsx`. [2026-09-24]

- **Agregado**: Modal de configuración y edición de agentes (`AgentEditModal.tsx`) con icono de rueda (engranaje) en cada item de la lista de agentes del sidebar. Permite modificar nombre, descripción, system prompt / core instructions, modelo específico, número máximo de iteraciones, toggle de activación y selección interactiva de herramientas (tools) permitidas, además de eliminación segura del agente con actualización en tiempo real en la UI. [2026-09-23]
  * **Archivos**: `src/features/sessions/components/AgentEditModal.tsx`, `src/features/sessions/components/SessionList.tsx`. [2026-09-23]

- **Agregado/Mejorado**: Sincronización integral de configuraciones y experiencia de chat — (1) store reactivo de configuraciones de la aplicación (`useAppSettings`, `loadSettings`, `saveSettings`) con efecto inmediato en `ChatView` (auto-scroll), `MessageBubble` (visibilidad de métricas y apertura por defecto de reasoning), y `Composer` (parámetros de inferencia); (2) conexión del botón `Editar mensaje` (`onEdit`) cargando el texto en el Composer para reenvío/corrección rápida; (3) soporte completo de gestión de Habilidades (Skills) y creación de agentes persistidos en el backend desde `SettingsModal`; (4) importación real de conversaciones creando las sesiones en el servidor; (5) confirmación al eliminar conversaciones e indicador dinámico de estado de conexión (`Online`/`Desconectado`) en el pie del sidebar; (6) integración de endpoints para bifurcación de sesión y borrado individual de mensajes. [2026-09-23]
  * **Archivos**: `src/lib/settings.ts`, `src/lib/useAppSettings.ts`, `src/api.ts`, `src/features/chat/components/ChatView.tsx`, `src/features/chat/components/Composer.tsx`, `src/features/chat/components/MessageBubble.tsx`, `src/features/chat/components/SettingsModal.tsx`, `src/features/sessions/components/SessionList.tsx`, `src/index.css`. [2026-09-23]

- **Agregado/Mejorado**: Exportación de conversaciones y mejoras de calidad de código — (1) funcionalidad para exportar cualquier conversación activa a formato **Markdown (.md)** o **JSON (.json)** descargable desde la barra superior de chat; (2) resolución de accesibilidad en modales, botones de pestañas, sliders y previsualizadores de medios; (3) eliminación de warning de `act(...)` en suite de tests; (4) formateo unificado con Biome. [2026-09-23]
  * **Archivos**: `src/features/chat/components/ChatView.tsx`, `src/features/chat/components/MessageBubble.tsx`, `src/features/chat/components/MessageBubble.test.tsx`, `src/features/chat/components/ModelSettingsModal.tsx`, `src/features/sessions/components/SessionList.tsx`, `src/main.tsx`, `src/providers/SessionsProvider.tsx`. [2026-09-23]

- **Corregido**: Clic en un agente no recreaba el chat después de borrar la sesión — el mapping localStorage `session_agents` quedaba huérfano. `removeSession` ahora limpia el mapping y `handleSelectAgent` valida que la sesión exista antes de reutilizarla. [2026-09-23]
  * **Archivos**: `src/lib/session-agents.ts`, `src/providers/SessionsProvider.tsx`, `src/features/sessions/components/SessionList.tsx`. [2026-09-23]

- **Corregido**: Chat con agentes roto — cada token del stream se pintaba como mensaje "AI" separado y la UI parpadeaba con "Iniciando sesión..." en cada envío. `useChat` ya no emite `onMessage` por chunk (un solo mensaje final en `done` con `_subAgent`); `SessionsProvider` ya no re-carga sesiones por cada cambio de `messages.length` (refreshSessions silencioso); ChatView solo muestra el gate de loading en la carga inicial; fix de `ws.onclose` con `streamingRef` para no dejar el Composer bloqueado. [2026-09-23]
  * **Archivos**: `src/features/chat/hooks/useChat.ts`, `src/providers/SessionsProvider.tsx`, `src/features/sessions/components/SessionList.tsx`, `src/features/chat/components/ChatView.tsx`. [2026-09-23]

- **Agregado**: Clic en un agente del tab Agentes crea o selecciona una sesión de chat asociada a ese agente, cambia al tab Chat y envía los mensajes con `agent` en el payload WebSocket para usar el core_prompt/tools del agente. Mapeo sesión↔agente en localStorage. [2026-09-23]
  * **Archivos**: `src/features/sessions/components/SessionList.tsx`, `src/features/chat/hooks/useChat.ts`, `src/features/chat/components/ChatView.tsx`, `src/lib/session-agents.ts`. [2026-09-23]

- **Agregado**: Dos tabs en el sidebar principal (Chat / Agentes) debajo del header. Tab Chat muestra el contenido actual (sesiones, búsqueda, nueva conversación). Tab Agentes muestra la lista de agentes del backend con opción de crear nuevos. [2026-09-23]
  * **Archivos**: `src/features/sessions/components/SessionList.tsx`, `src/index.css`. [2026-09-23]

- **Agregado**: Entrada de micrófono vía Web Speech API — hook `useSpeechRecognition` permite voz-a-texto directo en el navegador. Botón de micrófono en el composer con animación de pulso de grabación y visualización de transcript interim. [2026-09-22]
  * **Archivos**: `src/features/chat/hooks/useSpeechRecognition.ts`, `src/features/chat/components/Composer.tsx`, `src/components/ui/Icons.tsx`, `src/index.css`, `src/vite-env.d.ts`. [2026-09-22]

- **Cambiado**: Paginación de mensajes con lazy loading — chat carga inicialmente los últimos 3 mensajes. Scrolling hacia arriba carga incrementalmente 20 mensajes más a la vez via params `offset`/`limit`. `SessionsProvider` expone `hasMore`, `loadingMore`, `loadMoreMessages()`. `fetchSession()` acepta `limit` y `offset` opcionales. [2026-09-20]
  * **Archivos**: `src/api.ts`, `src/api.test.ts`, `src/providers/SessionsProvider.tsx`, `src/features/chat/components/ChatView.tsx`, `src/index.css`. [2026-09-20]

- **Agregado**: Integración MCP (Model Context Protocol) y modal (`MCPServersModal.tsx`). Soporta visualización de servidores configurados, toggles de conectar/desconectar, indicadores de cantidad de tools, agregado de servidores custom por comando, e integraciones preset (Memory Graph, Fetch, Filesystem). [2026-09-16]
  * **Archivos**: `src/features/chat/components/MCPServersModal.tsx`, `src/features/chat/components/AttachMenu.tsx`, `src/api.ts`, `src/index.css`. [2026-09-16]

- **Agregado**: Selector dropdown expandible de modelos de IA con badges de proveedor (Default, Meta, Reasoning, Anthropic, OpenAI), descripciones, y auto-cierre al hacer click afuera. [2026-09-16]
  * **Archivos**: `src/features/chat/components/ChatView.tsx`, `src/index.css`. [2026-09-16]

- **Agregado**: Extracción de contenido de archivos adjuntos e inyección en prompt para archivos de texto y código (`.md`, `.txt`, `.json`, `.ts`, `.py`, `.js`, etc.) usando `FileReader.readAsText`. [2026-09-16]
  * **Archivos**: `src/features/chat/components/FileUpload.tsx`, `src/features/chat/components/ChatView.tsx`. [2026-09-16]

- **Agregado**: Habilitación/deshabilitación dinámica de tools sincronizada vía WebSocket con opción `enabledTools` pasada desde el composer al backend del agente. [2026-09-16]
  * **Archivos**: `src/features/chat/components/Composer.tsx`, `src/features/chat/hooks/useChat.ts`. [2026-09-16]

- **Agregado**: `SessionsProvider` centralizado de React context asegurando cambio compartido de sesiones, carga de mensajes y sincronización de sesión activa entre sidebar y vistas de chat. [2026-09-16]
  * **Archivos**: `src/providers/SessionsProvider.tsx`, `src/App.tsx`, `src/features/sessions/hooks/useSessions.ts`. [2026-09-16]

- **Corregido**: Overflow de layout del sidebar colapsado impidiendo superposición de branding y navegación con el selector de modelos del header. [2026-09-16]
  * **Archivos**: `src/index.css`. [2026-09-16]

- **Corregido**: Diálogo de system prompt centrado y overlay con glassmorphism y animaciones de entrada suaves. [2026-09-16]
  * **Archivos**: `src/features/chat/components/SystemPromptModal.tsx`, `src/index.css`. [2026-09-16]

- **Corregido**: Eliminado item duplicado de herramientas del agente en el menú de adjuntos del composer (`+`). [2026-09-16]
  * **Archivos**: `src/features/chat/components/AttachMenu.tsx`. [2026-09-16]

- **Agregado**: Renderizado Markdown con soporte GFM (tablas, listas, task lists). Bloques de código con syntax highlighting y botón de copiar. Secciones de thinking/reasoning colapsables. Streaming con renderizado progresivo de markdown. [2026-09-16]
  * **Archivos**: `src/features/chat/components/MessageBubble.tsx`, `src/index.css`. [2026-09-16]

- **Agregado**: Visualización de tool calls como cards colapsables con indicadores de estado (pending/done/error). Reconexión automática WebSocket con backoff exponencial. Indicador de estado de conexión. [2026-09-16]
  * **Archivos**: `src/features/chat/hooks/useChat.ts`, `src/features/chat/components/ChatView.tsx`. [2026-09-16]

- **Agregado**: Composer flotante con botón de adjuntos (+), selector de modelo y contador de tokens. Diseño UI dark moderno inspirado en Claude, Gemini, ChatGPT y DeepSeek. [2026-09-16]
  * **Archivos**: `src/features/chat/components/Composer.tsx`, `src/index.css`. [2026-09-16]

- **Agregado**: Sistema de notificaciones toast (success, error, info, warning) con auto-dismiss y animación slide-in. [2026-09-16]
  * **Archivos**: `src/providers/ToastProvider.tsx`. [2026-09-16]

- **Agregado**: Estados de vista (loading skeleton, estado vacío, error con retry). Cards de inicio hero centradas. [2026-09-16]
  * **Archivos**: `src/features/chat/components/ChatView.tsx`. [2026-09-16]

- **Cambiado**: Estructura de proyecto basada en features. Cliente HTTP único en `lib/api-client.ts`. Componentes organizados por dominio (chat, sessions). [2026-09-16]
  * **Archivos**: `src/lib/api-client.ts`, `src/api.ts`, `src/features/`, `src/components/`. [2026-09-16]
