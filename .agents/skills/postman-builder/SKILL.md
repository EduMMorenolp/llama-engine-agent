---
name: postman-builder
description: 'Genera, modifica o actualiza colecciones Postman (JSON v2.1) desde el código de un backend Express: detecta prefix, parsea rutas, infiere bodies de schemas Joi/Zod y valida el JSON antes de escribir. Use when the user wants a Postman collection generated or updated from backend code. Triggers: "crear postman", "coleccion postman", "postman de X", "actualizar postman", "generar json postman".'
---

# Postman Builder — colección Postman v2.1 desde el código del backend

**Regla:** la colección se **deriva del código** (rutas + schemas + middlewares), nunca se
escribe de memoria: detectar el prefix, parsear cada `*.routes.*`, inferir bodies de los
schemas Joi/Zod y validar el JSON final con `JSON.parse` antes de escribirlo.

## Cuándo usarla

- "Crear/generar la colección Postman del backend", "postman de X", "actualizar postman".
- Se agregó un endpoint y hay que reflejarlo en la colección.

## Checklist de ejecución

### 1. Detectar backend y prefix

- Buscar `src/**/*.routes.ts` (o `.js`) del backend target.
- Prefix: primer `app.use("/api/...", route)` del entrypoint (`app.ts`/`server.ts` en `src/`
  o `src/core/server/`). Ej.: `app.use("/api/v1/client", r)` → prefix `/api/v1/client`.
  Varios prefixes → documentar cada uno. Sin prefix → asumir `/api/v1/` y preguntar.
- Puerto desde `config.port`, `.env` o scripts de `package.json`.

### 2. Parsear cada archivo de rutas

Por cada `*.routes.*`:

- **method/path**: `router.get/post/put/delete/patch("...", ...)` → `METHOD /path`.
- **auth**: `verifyToken|verifyAccessToken|isAuthenticated` → header `Authorization: Bearer {{token}}`.
- **roles**: `requireRole(ROLES.X, ...)` → roles en la description del request.
- **body**: `validateBody(schema)|validate(schema)` → leer el schema importado (Joi/Zod).
- **rate limit**: middlewares como `loginRateLimit` → documentar ("Rate limit aplicado").

### 3. Bodies realistas desde el schema

| Tipo | Valor ejemplo |
|---|---|
| `z.string().email()` | `"ejemplo@empresa.com"` |
| `z.string().min(3)` | `"texto"` |
| `z.number()` / `z.boolean()` | `1` / `true` |
| `z.enum([...])` | primer valor del enum |
| `z.array(...)` / `z.object({...})` | `[]` / `{...}` anidado |
| `z.coerce.date()` | `"2026-01-15"` |
| `.optional()` | omitir del body |
| sin `.optional()` | **incluir** |

Nombres contextuales: `email` → `"prueba@test.com"`, `password` → `"Test2026##"`,
`name|fullName` → `"Juan Pérez"`, `phone` → `"+54 11 1234-5678"`, `id` → `1`,
`amount` → `1000`, `date` → `"2026-01-15"`, `description` → `"Descripción de ejemplo"`.

### 4. Estructura JSON v2.1

```json
{
  "info": { "_postman_id": "<uuid>", "name": "<Nombre del Backend>",
    "description": "Un solo login genera {{token}} para todos los endpoints.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  "item": [ { "name": "Auth", "description": "Endpoints de autenticación.", "item": [ ... ] },
            { "name": "<Modulo>", "item": [ ... ] } ],
  "variable": [ { "key": "base_url", "value": "http://localhost:<PUERTO>" },
                { "key": "token", "value": "" } ]
}
```

- Carpetas (`item`): agrupar por módulo (`src/app/components/` o agrupación lógica);
  subcarpetas si hay muchos endpoints (CRUD, Reportes).
- **Cada request**: nombre `METHOD /path`; description con qué hace + `Autenticado: Sí/No` +
  `Requiere rol: ...` (+ rate limit); headers `Content-Type: application/json` y
  `Authorization: Bearer {{token}}`; body `mode: "raw"` con `\n`; `url.raw` =
  `{{base_url}}/prefix/path`, `host: ["{{base_url}}"]`, `path` = segmentos del split por `/`.
- Variables: siempre `base_url` y `token`; una `{{<entidad>_id}}` por entidad creada
  (`{{cliente_id}}`, `{{lote_id}}`...).

### 5. Test scripts estándar

```javascript
// login (POST /login): guarda el token para toda la colección
pm.test('200 OK', () => pm.response.code === 200);
if (pm.response.code === 200) {
  var json = JSON.parse(pm.response.text());
  if (json.success && json.data && json.data.token) {
    pm.collectionVariables.set('token', json.data.token);
  }
}
// create: guarda la id de la entidad creada
pm.test('201 Created', () => pm.response.code === 201);
if (pm.response.code === 201) {
  var json = JSON.parse(pm.response.text());
  if (json.id) pm.collectionVariables.set('<entidad>_id', json.id);
}
// GET/PUT/DELETE: pm.test('200 OK', () => pm.response.code === 200);
```

### 6. Verificación (obligatoria): validar y escribir

- Escribir en `docs/postman/<Coleccion>.json` (2 espacios de indentación, descripciones y
  comentarios en español); si existe → reemplazar completo, nunca fusionar a mano.
- Reportar: nombre de la colección, carpetas, requests, variables y ruta escrita.

```bash
# JSON válido (falla si la colección está rota)
node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log('ok')" docs/postman/<Coleccion>.json
# schema v2.1 presente (1), variables y tokens (deben ser >0)
rg -c 'collection/v2\.1\.0' docs/postman/<Coleccion>.json
rg -c 'base_url' docs/postman/<Coleccion>.json
rg -c 'collectionVariables\.set' docs/postman/<Coleccion>.json
# requests con body raw (debe ser >0)
rg -c '"raw"' docs/postman/<Coleccion>.json
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Colección escrita de memoria, no del código | `rg -c 'router\.' src/` vs requests de la colección |
| JSON inválido | `node -e "JSON.parse(...)"` → error |
| Sin `{{base_url}}`/`{{token}}` | `rg -c 'base_url' docs/postman/*.json` → 0 |
| Request sin auth cuando la ruta tiene `verifyToken` | `rg 'verifyToken' src/` vs `rg -c 'Bearer' docs/postman/*.json` |
| Body que ignora el schema (campos `optional()` incluidos) | comparar body contra el schema importado |
| Endpoint nuevo ausente de la colección | rutas del código vs `item` de la colección |

## Solapamiento

- `node-validacion-entrada-backend` — los schemas que alimentan los bodies salen de ahí.
- `node-autenticacion-jwt-backend` — define `verifyToken` y el flujo de `{{token}}`.
- `node-errores-respuestas-backend` — la forma de respuesta que asumen los test scripts.
