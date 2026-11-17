---
name: node-logging-ops-backend
description: 'Single structured logger (Winston) for Express backends, correct levels, health check and log hygiene. Use when logs are missing, console.* in production, duplicated loggers, committed .log files, or to set up/fix logging and health endpoints. Triggers: "logger", "winston", "no loguea", "console.log en prod", "health check", "log rotacion", "morgan", "logging", "errores en log".'
---

# Backend Logging Ops — un logger, niveles correctos, sin ruido

**Regla:** un solo logger por proyecto, el error handler central es quien loguea los errores, y
el repo no guarda archivos de log.

## Cuándo usarla

- "El backend no loguea" / "hay `console.log` en producción" / "no encuentro el error".
- Configurar logger en un proyecto nuevo o unificar loggers duplicados.
- Agregar/mejorar health check o revisar qué se commitea del repo.

## Checklist de ejecución

1. **Un único logger.** Winston (o el elegido) con wrapper propio tipado en
   `src/utils/logger.ts` / `shared/utils/logger.ts`. Una sola configuración en el repo:
   prohibido loggers duplicados o copiados entre proyectos sin revisar. `morgan` **solo en dev**
   (middleware de requests), no como logger de errores.
2. **Niveles: quién loguea qué.**

   | Nivel | Qué va |
   |---|---|
   | `error` | Errores 500 — **lo loguea el errorHandler central** con `{ method, path, userId, status }` |
   | `warn` | Degradaciones: API key opcional ausente, retry, feature deshabilitada |
   | `info` | Arranque, migraciones, cron ejecutado |
   | `debug` | Detalle fino, solo `LOG_LEVEL=debug` en dev |

   - **Contexto mínimo**: método + ruta + user id (+ correlation id si existe).
   - **Nunca** loguear secretos, tokens ni `DATABASE_URL` sin sanitizar (`//***:***@`).
   - Cuidado con niveles no-op: `logger.debug` con config `minLevel: "info"` no imprime nada —
     si algo "no loguea", verificar el nivel configurado.
3. **Health check real.** `GET /health` que **verifique la BD** (un query simple) y devuelva
   `{ status, db, uptime }`; 503 si la BD está caída, nunca un 200 estático. El banner de
   arranque ya corta si la BD está offline — el health check cubre el runtime posterior.
4. **Higiene del repo.** `*.log` en `.gitignore` **y** verificar que no haya logs trackeados;
   `console.*` solo en config/server para el banner de arranque, en el resto logger.
5. **Verificación (obligatoria):**

   ```bash
   # console.* fuera del arranque
   rg "console\.(log|error|warn)" src/ -g '!**/server.ts' -g '!**/config*'
   # archivos que usan el logger real (métrica de adopción)
   rg "logger\.(error|warn|info|debug)" src/ -l
   # logs trackeados en git
   git ls-files | rg "\.log$"
   ```

   Meta: los archivos con lógica de negocio loguean vía `logger`, no vía `console.*`.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Logger configurado pero casi nadie lo usa | `rg -l "logger\." src/` pocos vs `rg --files src/` total |
| Dos implementaciones/configuraciones de logger distintas | `rg -l "createLogger" src/` → más de un módulo |
| Logs commiteados al repo | `git ls-files "*.log"` |
| `console.*` en producción | `rg "console\." src/ -g '!**/server*'` |
| Nivel de logger inexistente o inefectivo | `rg "logger\.debug" src/` + revisar `minLevel` de la config |
| Sin handler que loguee errores centralmente | `rg "logger\.error" src/*errorHandler*` sin matches |
| Health check estático (no toca la BD) | Leer `GET /health`: si no consulta BD, es 200 mentiroso |

## Solapamiento

- **Puente con** `node-errores-respuestas-backend`: ese handler central es el mayor consumidor de
  `logger.error`; si no existe handler, no hay log central de errores.
- `node-config-env-backend` — `LOG_LEVEL` y rutas de log se definen en el módulo único de config.
- No confundir con APM/métricas (fuera de alcance de esta skill).
