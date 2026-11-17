---
name: node-errores-respuestas-backend
description: 'Central error handler and uniform responses for Express backends. Use when implementing or fixing error handling, when controllers respond errors directly, when a 500 leaks error.message, or when adding a 404 catch-all. Triggers: "error 500", "manejo de errores", "error handler", "responder error", "404", "stack trace", "mensaje de error al cliente", "try catch", "revisar errores".'
---

# Backend Errores y Respuestas — un solo lugar construye el error

**Regla:** el controller nunca responde errores; lanza la excepción y responde el handler
central. Una sola shape de error en todo el backend.

## Cuándo usarla

- Crear o revisar el manejo de errores de un backend.
- Aparece un 500 crudo, un `error.message` del lado del cliente, o respuestas con formas distintas.
- Agregar un endpoint y darse cuenta de que no hay handler 404.

## Checklist de ejecución

1. **Clase de error con `status`** (nombre consistente en todo el proyecto; si la clase ajena
   usa `statusCode`, unificar antes de continuar):

   ```ts
   export class AppError extends Error {
     constructor(message: string, public status: number = 500, public details?: unknown) {
       super(message);
     }
   }
   ```

2. **Handler central + 404 catch-all**, registrados **al final** del chain:

   ```ts
   app.use(notFoundHandler);   // cualquier ruta no matcheada → 404 JSON
   app.use(errorHandler);      // SIEMPRE último middleware
   ```

   El handler:
   - Loguea el error con contexto (método, ruta, user id — **nunca** secrets).
   - Responde con la **única shape de error** del proyecto: `{ "error": "<mensaje>" }`
     (o `{ success:false, message, details? }` — elegir UNA y no mezclar).
   - `AppError`/`ValidationError` → su status; error desconocido → 500 con mensaje genérico.
   - **Stack trace solo si `NODE_ENV !== "production"`.**

3. **Controllers: lanzar, no responder.** `asyncHandler` (o try/catch con `next(e)`) en todo
   controller:

   ```ts
   // ❌ prohibido
   try { const x = await svc(); res.json(x); }
   catch (e) { res.status(500).json({ error: (e as Error).message }); }

   // ✅
   const handler = asyncHandler(async (req, res) => {
     const x = await svc();   // si svc lanza AppError(404), lo toma el errorHandler
     res.json(x);
   });
   ```

   - **Prohibido** `res.status(500)` en controllers; **prohibido** devolver `error.message`.
   - Clasificar errores por **tipo/clase** (`err instanceof AppError`), nunca por string-matching
     sobre `err.message` (frágil ante cambios de texto/i18n).
   - Errores de auth sin body vacío: 401/403 siempre con `{ error }`, jamás `sendStatus`.

4. **Verificación (obligatoria):**

   ```bash
   # controllers respondiendo errores directamente
   rg "res\.status\(500\)" src/ --glob '!*errorHandler*'
   # mensajes internos filtrándose
   rg "error\.message" src/ -g '*controller*' -g '*routes*'
   # handler registrado y como último middleware
   rg "app\.use\((notFound|error)" src/
   # respuestas sin cuerpo
   rg "sendStatus\(" src/
   ```

   **Anti-check:** si una ruta mal armada devuelve HTML del servidor en vez de un 404 JSON,
   falta el catch-all.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Cero error handlers en el repo | `rg "next\(err\|errorHandler" src/` → sin matches |
| Controllers con `res.status(500)` directo (el handler ni se alcanza) | `rg "res\.status\(500\)" src/ -c` alto vs `rg "next\(" src/ -c` bajo |
| `error.message` devuelto al cliente | `rg "json\(\{ *error: *\(e" src/` o `send(error.message)` |
| Respuestas con formas mezcladas (`{error}` vs `{message}` vs `sendStatus`) | `rg "res\.(json\|send\|sendStatus)" src/` y comparar shapes |
| Clasificación por string sobre `err.message` | `rg "includes\(\|match\(" src/*errorHandler*` |
| Sin 404 catch-all | `rg "notFound\|404" src/` sin registrar en `app.ts` |
| Orden del chain: errorHandler antes de las rutas | Revisar orden de `app.use` en `app.ts` |

## Solapamiento

- `node-validacion-entrada-backend` define los `ValidationError` que este handler clasifica.
- `node-logging-ops-backend` define **cómo** se loguea dentro del handler (logger único, niveles).
- `contrato-api-global` — define la forma única de error (`code`/`message`) y los status que este handler emite.
