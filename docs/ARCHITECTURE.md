# Arquitectura de la Solución — llama-engine-agent

## 1. Diagrama General de Componentes

```mermaid
flowchart TD
    subgraph Hardware["Hardware Local (NVIDIA RTX 5050 8GB / 16GB RAM)"]
        LLAMA["llama-runtime (llama.cpp)\nQwen 3.5 4B Q4_K_M\nPuerto 3050 / 8080"]
        WHISPER["Faster-Whisper Server\nModelo small FP16 (CUDA)\nPuerto 8000"]
    end

    subgraph Docker_Services["Contenedores Docker"]
        POSTGRES[("PostgreSQL 16 (Dedicado)\nPuerto 5434:5432\nTablas: agenda, habitos, registros,\npersonalidades, memorias")]
        N8N["n8n Orquestador\n(n8n-docker en puerto 5678)\n- Schedule Crons (08:00 AM, cada 5 min)\n- Telegram Trigger & Webhooks\n- Tool Calling Execution"]
    end

    subgraph Canales["Canales de Interacción"]
        TG["Telegram Bot (Celular)\nTexto y Notas de voz"]
        WEB["engine-ui-agent (PC)\nReact 19 + Vite + Web Speech API\nPuerto 3061"]
    end

    TG -->|Audio| WHISPER
    WHISPER -->|Texto transcrito| N8N
    TG -->|Mensaje de texto| N8N
    WEB -->|Webhook Chat / Dictado de voz| N8N

    N8N -->|Inferencia + Tool Calling| LLAMA
    LLAMA -->|Herramientas a ejecutar| N8N
    N8N <-->|Consultas y Persistencia SQL| POSTGRES

    N8N -->|Avisos proactivos matutinos y alertas| TG
    N8N -->|Respuesta del asistente| WEB
```

---

## 2. Flujo de Secuencia: Disparador Matutino (Buenos Días)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as n8n (Schedule 08:00 AM)
    participant PG as PostgreSQL (Puerto 5434)
    participant LLM as Qwen 3.5 4B (Puerto 3050)
    participant TG as Telegram (Usuario)

    Cron->>PG: SELECT personalidad activa y agenda de hoy
    PG-->>Cron: System prompt + actividades previas
    Cron->>LLM: Redactar saludo cordial y preguntar actividades del día
    LLM-->>Cron: Texto del saludo generado
    Cron->>TG: Enviar mensaje de buenos días por Telegram
```

---

## 3. Flujo de Secuencia: Mensaje de Voz y Agendamiento

```mermaid
sequenceDiagram
    autonumber
    participant User as Usuario (Telegram)
    participant TG as Bot de Telegram
    participant N8N as n8n Orquestador
    participant FW as Faster-Whisper (CUDA)
    participant LLM as Qwen 3.5 4B
    participant PG as PostgreSQL

    User->>TG: Envía nota de voz ("Hoy a las 18:00 voy al gimnasio")
    TG->>N8N: Evento message.voice
    N8N->>FW: POST /v1/audio/transcriptions (archivo de audio)
    FW-->>N8N: Texto: "Hoy a las 18:00 voy al gimnasio"
    N8N->>LLM: Prompt con fecha/hora actual y tools disponibles
    LLM-->>N8N: Tool Call: agendar_actividad(hora="18:00", actividad="Gimnasio")
    N8N->>PG: INSERT INTO agenda_diaria (fecha, hora, actividad)
    PG-->>N8N: Confirmación OK
    N8N->>TG: "✅ Agendé 'Gimnasio' a las 18:00 para hoy."
    TG-->>User: Mensaje en Telegram
```

---

## 4. Flujo de Secuencia: Reloj Vigilante (Recordatorios y Hábitos)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as n8n (Schedule cada 5 min)
    participant PG as PostgreSQL
    participant TG as Telegram

    Cron->>PG: 1. SELECT actividades entre now() y now()+15m (recordado=false)
    alt Hay actividad próxima
        PG-->>Cron: Actividad encontrada
        Cron->>TG: "⏰ Recordatorio: a las 18:00 tienes Gimnasio."
        Cron->>PG: UPDATE agenda_diaria SET recordado = true
    end

    Cron->>PG: 2. SELECT habitos activos donde hora_disparo ≈ hora_actual
    alt Coincide hora de hábito
        PG-->>Cron: Hábito: Almuerzo ("¿Qué almorzaste hoy?")
        Cron->>TG: "📌 Seguimiento: ¿Qué almorzaste hoy?"
    end
```
