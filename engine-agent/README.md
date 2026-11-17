# engine-agent

Contenedor de los servicios cliente y API del Asistente Proactivo.

## Submódulos

- **`engine-agent-api/`**: Servidor API en Node.js / Express y WebSocket para herramientas y puente de comunicaciones (puerto `3060`).
- **`engine-agent-ui/`**: Interfaz web en React 19 + Vite con Web Speech API para dictado por voz y conexión a los webhooks de n8n (puerto `3061` en dev o `80` en Docker).

