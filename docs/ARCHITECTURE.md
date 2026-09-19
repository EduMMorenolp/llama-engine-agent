# Architecture — llama-engine-agent

## Diagrama de componentes high-level

```mermaid
graph TB
    subgraph Frontend ["Frontend — engine-ui-agent (port 3061)"]
        UI[React SPA]
        WS_Client[WebSocket Client]
        SSE_Client[SSE Client]
    end

    subgraph Backend ["Backend — engine-agent (port 3060)"]
        Express[Express Server]
        WS_Server[WebSocket Server]
        AgentLoop[Agent Loop]
        ToolRegistry[Tool Registry]
        LLMClient[LLM Client]
        SessionService[Session Service]
        MemoryService[Memory Service]
    end

    subgraph Storage ["Storage"]
        SQLite[(SQLite — sql.js WASM)]
    end

    subgraph External ["External"]
        LlamaCpp["llama.cpp Server (port 3050)"]
        Telegram["Telegram Bot (optional)"]
    end

    UI -->|HTTP| Express
    UI --> SSE_Client
    UI --> WS_Client
    SSE_Client -->|SSE Stream| Express
    WS_Client -->|WebSocket| WS_Server

    Express --> AgentLoop
    WS_Server --> AgentLoop
    AgentLoop --> LLMClient
    AgentLoop --> ToolRegistry
    AgentLoop --> SessionService
    AgentLoop --> MemoryService

    SessionService --> SQLite
    MemoryService --> SQLite

    LLMClient -->|OpenAI API| LlamaCpp
    Telegram -->|Bot API| Express
```

---

## Flujo del Agent Loop

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant LLM as llama.cpp
    participant Tools as Tool Registry
    participant DB as SQLite

    U->>FE: Send message
    FE->>BE: POST /api/chat (SSE) or WS "chat"
    BE->>DB: Save user message
    BE->>DB: Load memories
    BE->>BE: Build system prompt + memories

    loop Max 10 iterations
        BE->>LLM: Send history + tool schemas
        LLM-->>BE: Response (text or tool_calls)

        alt Tool calls
            BE->>Tools: Execute tool
            Tools-->>BE: Tool result
            BE->>DB: Save tool message
            BE->>FE: SSE/WS: tool_start + tool_end
            BE->>LLM: Continue with tool result
        else Text only
            BE->>DB: Save assistant message
            BE->>FE: SSE/WS: message chunks + done
        end
    end
```

---

## Estructura de la base de datos

```mermaid
erDiagram
    sessions ||--o{ messages : "has"
    sessions {
        string id PK
        string name
        string model
        datetime created_at
        datetime updated_at
    }
    messages {
        string id PK
        string session_id FK
        string role
        string content
        string tool_calls
        string tool_call_id
        datetime created_at
    }
    memories {
        string id PK
        string key UK
        string content
        string tags
        datetime created_at
        datetime updated_at
    }
    custom_tools {
        string name PK
        string description
        string parameters
        string handler_type
        string handler_config
        boolean enabled
        datetime created_at
    }
```

---

## Flujo de datos — Streaming

```mermaid
graph LR
    subgraph SSE ["SSE Stream"]
        A[Client] -->|POST /api/chat| B[Express]
        B -->|text/event-stream| A
    end

    subgraph WS ["WebSocket"]
        C[Client] -->|type: chat| D[WS Server]
        D -->|type: message/tool_start/tool_end/done| C
    end

    subgraph Events ["Event Types"]
        E[message]
        F[tool_start]
        G[tool_end]
        H[done]
        I[error]
    end

    B --> E
    B --> F
    B --> G
    B --> H
    B --> I
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
```

---

## Estructura de directorios

```
llama-engine-agent/
├── engine-agent/              # Backend
│   ├── src/
│   │   ├── index.ts           # Entry point + bootstrap
│   │   ├── server.ts          # Express app factory
│   │   ├── ws.ts              # WebSocket server
│   │   ├── config/            # Env validation (Zod)
│   │   ├── db/                # SQLite init + migrations
│   │   ├── agent/             # Agent loop + LLM client + prompt
│   │   ├── tools/             # Registry + 9 built-in tools
│   │   ├── sessions/          # Session CRUD
│   │   ├── memories/          # Memory CRUD
│   │   ├── modules/           # chat, sessions, memories, tools, models, mcp
│   │   ├── middleware/        # auth, validation, errorHandler
│   │   ├── common/            # HTTP exceptions
│   │   └── utils/             # Logger
│   ├── data/                  # SQLite DB
│   └── docs/                  # API-CONTRACTS.md
├── engine-ui-agent/           # Frontend
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Router + providers
│   │   ├── api.ts             # Types + API functions
│   │   ├── lib/               # fetchClient, WebSocket
│   │   ├── providers/         # ToastProvider, SessionsProvider
│   │   ├── components/        # Layout, Icons
│   │   └── features/
│   │       ├── chat/          # ChatView, Composer, MessageBubble
│   │       └── sessions/      # SessionList
│   └── ...
└── docs/                      # Project documentation
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── RULES.md
    ├── DESIGN.md
    ├── TASKS.md
    └── MEMORY.md
```

---

## Decisiones técnicas

| Decisión | Elección | Razón |
|----------|----------|-------|
| Runtime backend | Express 4 | Simplicidad, ecosistema amplio |
| Base de datos | SQLite via sql.js (WASM) | Sin dependencias nativas, file-based, suficiente para single-user |
| Validación | Zod | Type inference + validación runtime |
| Linting/Formatting | Biome | Más rápido que ESLint + Prettier, config unificada |
| Frontend framework | React 19 | Latest, concurrent features |
| Bundler | Vite 6 | HMR rápido, ESM nativo |
| State management | React Context + hooks | Sin dependencia externa, suficiente para la complejidad actual |
| Markdown | react-markdown + remark-gfm | GFM support, plugins |
| Testing | Vitest | Compatible con ESM, rápido |
| LLM SDK | openai | Compatible con la API de llama.cpp |
