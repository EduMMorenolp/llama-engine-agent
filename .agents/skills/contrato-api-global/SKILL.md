---
name: contrato-api-global
description: 'Define interfaces estables y difíciles de mal-usar: contract-first, una sola estrategia de errores, validación solo en los bordes, adición antes que modificación y naming predecible en REST y TypeScript. Use when designing new API endpoints, defining module boundaries or type contracts between frontend and backend, or changing existing public interfaces. Triggers: "contrato de la api", "contract first", "diseñar endpoint", "interface typescript", "definir tipos compartidos", "cambiar la api", "versionar api", "borrar endpoint".'
---

# Contrato API — interfaces estables y difíciles de mal-usar

**Regla:** el contrato (interfaz, forma de errores, naming) se define **antes** de implementar
y todo comportamiento observable es contrato potencial: lo que los consumidores pueden ver,
dependerán de ello — no exponer detalles internos ni cambiar lo público sin plan.

## Cuándo usarla

- Diseñar endpoints nuevos o cambiar interfaces públicas existentes.
- Definir tipos/contratos entre frontend y backend o entre módulos.
- Antes de tocar un `interface`/`type` que consume más de un equipo o feature.

## Checklist de ejecución

### 1. Contract-first

Escribir la interfaz primero; la implementación la sigue:

```ts
interface TaskAPI {
  createTask(input: CreateTaskInput): Promise<Task>;          // 201 + campos del server
  listTasks(params: ListTasksParams): Promise<Paginated<Task>>; // paginado
  getTask(id: string): Promise<Task>;                          // o NotFoundError
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>; // solo campos provistos
  deleteTask(id: string): Promise<void>;                       // idempotente
}
```

### 2. Una estrategia de errores, en todo el API

Body de error único (`{ error: { code, message, details? } }` con `code` legible por máquina)
y mapeo fijo de status:

| Status | Significado |
|---|---|
| 400 | request malformado |
| 401 | no autenticado |
| 403 | autenticado sin permiso |
| 404 | recurso inexistente |
| 409 | conflicto (duplicado, versión) |
| 422 | validación fallida |
| 500 | error del server (**nunca** exponer detalles internos/stack) |

**No mezclar patrones**: si unos endpoints tiran `throw`, otros devuelven `null` y otros
`{ error }`, el consumidor no puede predecir nada.

### 3. Validar solo en los bordes

- **Se valida:** rutas de API (input de usuario), handlers de formulario, respuesta de
  servicios externos (**siempre no confiable**), carga de env vars.
- **No se valida:** entre funciones internas que comparten contrato, utilidades llamadas por
  código ya validado, datos que acaban de salir de la propia BD.
- Después de validar, el interior **confía en los tipos** (cero re-chequeos defensivos).

### 4. Adición antes que modificación

Extender sin romper: campos nuevos **opcionales** (`priority?: 'low'|...`); nunca cambiar el
tipo de un campo público ni borrarlo (rompe consumidores). Todo lo observable — quirks no
documentados, textos, orden — se vuelve contrato en cuanto alguien depende de ello (Hyrum):
pensar la deprecación en el diseño, no después.

### 5. Naming predecible

| Superficie | Convención | Ejemplo |
|---|---|---|
| Endpoints REST | sustantivos plurales, sin verbos | `GET /api/tasks` |
| Query params / campos | camelCase | `?sortBy=createdAt` |
| Booleanos | prefijo `is/has/can` | `isComplete` |
| Enums | UPPER_SNAKE | `"IN_PROGRESS"` |

### 6. Verificación (obligatoria)

```bash
# endpoints con verbos (debe dar 0)
rg 'router\.(get|post|put|delete)\("[^"]*/(get|create|update|delete)' src/
# formas de error armadas a mano fuera del helper central (deben ser 0)
rg 'status\(500\)' src/ -g '!src/middlewares/**'
# cambios en interfaces públicas: revisar diff antes de merge
git diff | rg '^[+-].*(interface|type) '
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Cambiar/borrar un campo público sin plan | diff con `-` sobre campos de un `interface` exportado |
| Estrategias de error mezcladas | `rg 'res\.status' src/` → shapes distintos |
| Validar dos veces o en el medio de la capa interna | `safeParse`/`validate` fuera de rutas/formularios |
| 500 con stack trace o mensaje interno | `rg 'stack' src/controllers` |
| Endpoint con verbo o singular | `rg 'router\.\w+\("[^"]*(/get|/user")' src/` |
| `any`/casts que esconden una frontera unclear | `rg -c ':\s*any' src/` |

## Solapamiento

- `node-errores-respuestas-backend` — implementa el body de error y el handler central que este contrato exige.
- `node-validacion-entrada-backend` — el middleware de Joi/Zod **es** la validación de borde.
- `node-arquitectura-backend` — define las capas donde el contrato vive y fluye.
- `vite-formularios-frontend` / `vite-data-fetching-frontend` — consumen este contrato del lado del SPA.
