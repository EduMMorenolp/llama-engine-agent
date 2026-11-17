---
name: node-config-env-backend
description: 'Backend environment config with a single validated source (fail-fast at boot). Use when adding or changing env variables, when the server starts half-configured, when a JWT/API key is missing, or to review env/secrets hygiene. Triggers: "agregar variable de entorno", "configurar env", "revisar config", "JWT_SECRET", "el server arranca a medias", "agregar API key", ".env.example", "secretos", "DATABASE_URL".'
---

# Backend Config Env — una única fuente + fail-fast

**Regla:** un solo módulo lee `process.env`, se valida al arranque y, si falta algo crítico, el
servidor **no arranca**. El `.env.example` es la fuente de truth documentada.

## Cuándo usarla

- Agregar, quitar o renombrar una variable de entorno.
- El server arranca "a medias" o falla en runtime por un valor faltante.
- Integrar un servicio externo que requiere API key (mail, storage, pagos...).
- Auditoría de higiene: secretos, defaults, cobertura del `.env.example`.

## Checklist de ejecución

1. **Módulo único de config.** Aprovisionar `src/config/index.ts` (o `shared/config.ts`) como
   único lector de `process.env`. Verificar:
   ```bash
   rg "process\.env" src/ -l
   ```
   Esperado: **1-2 archivos** (config + un escape hatch justificado). Si hay más, migrar cada
   lector disperso a `import { config } from "<config>"`.
2. **Validación fail-fast** con Joi (o Zod) al arranque:
   - Tipos y coerción: `PORT` → `Joi.number().default(3000)`, enums (`NODE_ENV`), strings.
   - **Requeridas según ambiente**: `Joi.when("NODE_ENV", ...)` — p. ej. credenciales de un
     servicio externo opcionales en `development` y requeridas en `production`.
   - Defaults para lo opcional (`LOG_LEVEL`, `CLIENT_URL`).
   - Al fallar: detalle **variable por variable** + `process.exit(1)`:

   ```ts
   const { error, value: env } = schema.validate(process.env, { abortEarly: false });
   if (error) {
     console.error("🚨 Variables de entorno inválidas:");
     for (const d of error.details) console.error(`  - ${d.message}`);
     process.exit(1);
   }
   ```

   `console.warn` y seguir **no** es validación (fail-slow).
3. **Exportar `config` tipado.** El resto del código importa `config` y nunca toca
   `process.env` directo. Sin duplicar un mismo secreto en varios archivos.
4. **`.env.example` completo.** Checklist por variable: **nombre · tipo · requerida (¿en qué
   ambiente?) · default · quién la lee**. `.env` local gitignored; cero secretos en repo.
5. **Verificación (obligatoria):**
   ```bash
   # nadie más lee process.env
   rg "process\.env" src/ -l
   # defaults hardcodeados que esquivan el validador
   rg '\|\|\s*\x22' src/config/
   # claves usadas en el código vs declaradas en .env.example
   rg -o 'process\.env\.([A-Z_0-9]+)' src/ -r '$1' | sort -u
   ```
   - Los tests usan valores ficticios, nunca credenciales reales.
   - Nunca loguear secretos; URLs de conexión en logs/banner se sanitizan:
     `/\/\/([^:]+):([^@]+)@/` → `//***:***@`.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Secret con fallback hardcodeado (`JWT_SECRET \|\| "default"`) | `rg '\|\| *\x22' src/config/` |
| "Validación" que solo avisa y arranca igual | `console.warn` en el chequeo de env sin `process.exit` |
| Lectores dispersos de `process.env` | `rg "process\.env" src/ -l` → más de 2 archivos |
| API keys inline en el código | `rg -i "api[_-]?key\s*[:=]\s*[\x27\x22]" src/` |
| Env de test con secretos reales trackeado | `git ls-files ".env*" "*.env"` y revisar contenido |
| Conexiones con defaults que esquivan el validador | `rg "localhost\|process\.env" src/ -g "*db*" -g "*connection*"` |
| Credenciales fijas en setup de tests | `rg -i "password\|secret" test/` |

## Solapamiento

- **Precede** a las skills hermanas `node-errores-respuestas-backend`, `node-validacion-entrada-backend`
  y `node-logging-ops-backend`: asumen que existe un `config` único.
