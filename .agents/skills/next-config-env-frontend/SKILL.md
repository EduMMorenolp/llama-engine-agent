---
name: next-config-env-frontend
description: 'Next.js env rules: NEXT_PUBLIC_ is the only client-visible prefix, everything else is server-only and import "server-only" protects it. Use when adding env vars to a Next project, reviewing .env files, or when a secret might reach the browser bundle. Triggers: "variables de entorno next", "NEXT_PUBLIC_", "server only", "secretos en el front", "env server next", "variables de entorno frontend".'
---

# Config Env Frontend Next — server-only por defecto, público solo con `NEXT_PUBLIC_`

**Regla:** en Next, todo es **server-only** salvo lo que lleva prefijo `NEXT_PUBLIC_`, y eso
que viaja en el bundle es **público por definición**: ningún secreto puede llevar ese prefijo.

## Cuándo usarla

- Agregar o cambiar una variable de entorno en un proyecto Next.
- Revisar higiene: ¿algún secreto quedó expuesto en el cliente?
- Configurar URL de API, feature flags o constantes de entorno.

## Checklist de ejecución

1. **Prefijo `NEXT_PUBLIC_` = decisión de exposición.** El build embebe esas variables en el
   bundle del navegador: cualquiera puede leerlas en DevTools. Todo lo demás existe solo en el
   servidor (Server Components, route handlers, server actions, middleware).
2. **Dos contextos de lectura, distintos:**
   - **Server** (`app/`, `actions/`, `lib/`, `middleware.ts`): `process.env.MI_VAR`.
   - **Cliente** (`'use client'`): **solo** `process.env.NEXT_PUBLIC_X`; una variable sin
     prefijo leída en el cliente es `undefined` **silencioso**.
3. **Criterio de exposición:** si el valor viaja en el bundle, es público. Solo pasa lo
   público: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`, feature flags no sensibles.
   - API keys de terceros (mapas, OCR, IA) → el llamado va **por el backend**.
   - Secretos de servicio (DB, SMTP, pagos) → server-side; proteger con
     `import "server-only"` en el módulo que los lee, para que importarlos en un componente
     cliente **rompa el build** en vez de fallar en producción.
4. **`.env.example` completo** con defaults públicos y comentario; `.env` real gitignored.
   Next usa `.env.local` para lo real (gitignored por defecto).
5. **Verificación (obligatoria):**

   ```bash
   # variables usadas: deben coincidir con el contexto que las lee
   rg "process\.env\.([A-Z_]+)" app/ lib/ actions/ components/ hooks/ middleware.ts -or '$1' | sort -u
   # secretos obvios en el código fuente
   rg -i "api[_-]?key|secret|password|private[_-]?key" app/ lib/ components/ hooks/
   # módulos sensibles protegidos con server-only (debe ser >0 si hay secretos)
   rg -l 'from "server-only"' lib/ actions/
   # .env.example presente y trackeado
   rg --files --hidden --no-ignore -g ".env*"
   ```

   Revisar cada match de `NEXT_PUBLIC_`: si el valor es un secreto, **moverlo al backend**.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Secreto con `NEXT_PUBLIC_` (quedó en el bundle) | `rg "NEXT_PUBLIC_[A-Z_]*" app/ components/ hooks/` y revisar valores |
| Variable sin prefijo leída en un `'use client'` → `undefined` silencioso | `rg "process\.env\.(?!NEXT_PUBLIC)" components/ hooks/` |
| Clave de API de terceros en el front | `rg -i "api[_-]?key" app/ components/ hooks/` |
| Módulo con credenciales importable desde cliente | `rg -l 'server-only' lib/ actions/` → sin matches con secretos adentro |
| `.env.example` desactualizado respecto al código | claves usadas vs declaradas |
| Defaults vacíos que ocultan errores de configuración | `process.env.X ?? ""` para lo obligatorio |

## Solapamiento

- `next-arquitectura-frontend` — la config vive en `lib/`, no repartida en componentes.
- `next-auth-frontend` — el token de sesión no es env: es una cookie httpOnly que se lee en
  el servidor.
- `next-data-fetching-frontend` — `NEXT_PUBLIC_API_URL` la consumen los fetchers de `lib/`.
- `vite-config-env-frontend` — el equivalente en Vite (`VITE_` + `import.meta.env`).
- `node-config-env-backend` — la contraparte del servidor: valida el env al arranque y decide
  qué es secreto.
