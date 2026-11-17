---
name: arquitectura-drizzle-backend
description: 'Canonical file architecture for the Drizzle ORM data layer: one file per table, schema barrel, single client, relations, seeds and drizzle-kit migrations. Use when creating or reorganizing a Drizzle project, splitting a large schema file, deciding where a schema/seed/migration file goes, or when the layout of src/db is unclear — even if Drizzle is not named. Triggers: "estructura de drizzle", "organizar schemas", "donde va el schema", "un archivo por tabla", "schema drizzle", "estructura de la capa db", "drizzle.config", "drizzle migrations", "seed", "barrel".'
---

# Arquitectura Drizzle — un archivo por tabla, un cliente, un barrel

**Regla:** la capa `src/db/` tiene estructura fija: 1 tabla = 1 archivo en `schema/`, un
único cliente `db`, un barrel que lo exporta todo, seeds en `seed/` y migraciones
generadas en `drizzle/` (raíz). Se define al arranque; reorganizar después rompe imports
y fuerza migraciones truchas.

## Cuándo usarla

- Proyecto Drizzle nuevo: decidir dónde vive cada archivo desde el inicio.
- Agregar una tabla, un seed o una migración y saber su ubicación.
- Un `schema.ts` único creció y hay que dividirlo.
- "¿dónde va este schema?", "¿cómo organizo el db/?", "¿se puede tener todo en un archivo?".
- Revisión de estructura de la capa de datos antes de merge.

## Checklist de ejecución

### 1. Árbol canónico

```
src/db/
├── index.ts               # ÚNICO cliente: drizzle(pool, { schema, relations })
├── schema/
│   ├── index.ts           # barrel: re-exporta TODOS los archivos de tabla
│   ├── shared.ts          # enums, timestamps(), helpers — sin tablas
│   ├── users.ts           # 1 archivo = 1 tabla (= nombre de la tabla)
│   └── posts_tags.ts      # junction: archivo propio con sus FKs
├── relations.ts           # defineRelations centralizado (importa el barrel)
└── seed/
    ├── index.ts           # runner: guard de ambiente, lotes, transacción
    ├── users.seed.ts      # exporta seedUsers(tx)
    └── posts.seed.ts

drizzle/                   # raíz: salida de drizzle-kit (commiteada, nunca a mano)
drizzle.config.ts          # raíz
```

```ts
// drizzle.config.ts
export default defineConfig({
  dialect: "postgresql",
  schema: "src/db/schema/index.ts",  // SIEMPRE el barrel, nunca un glob
  out: "drizzle",
});
```

Por qué el barrel y no un glob `src/db/schema/**/*.ts`: el glob también importa el
barrel y drizzle-kit ve cada tabla dos veces; con una única entrada el `generate` es
determinista. **Gotcha clásica:** una tabla nueva sin exportar en el barrel no la ve
`drizzle-kit generate` (queda sin diffs) y el error estalla en runtime — crear el
archivo y sumarlo al barrel en el mismo gesto. `drizzle.config.ts` corre fuera del
proceso de la app (CLI de drizzle-kit) y puede leer `process.env` con dotenv; dentro de
`src/`, solo `config/` (skill `node-config-env-backend`).

### 2. Una tabla = un archivo

| Pieza | Vive en |
|---|---|
| Tabla | `src/db/schema/<tabla>.ts` → exporta `<tabla>` |
| Junction table | archivo propio con sus FKs (`posts_tags.ts`) |
| Enums/defaults compartidos | `src/db/schema/shared.ts` (0 tablas) |
| Export de todo | `src/db/schema/index.ts` (barrel, 0 tablas) |
| Relations (`defineRelations`) | `src/db/relations.ts` |
| Cliente único | `src/db/index.ts` |
| Seeds (runner + 1 por tabla sembrada) | `src/db/seed/<tabla>.seed.ts` |
| Migraciones SQL | `drizzle/` en la raíz, solo generadas |
| Queries/repositories | `modules/<dominio>/<dominio>.repository.ts` (ver `node-arquitectura-backend`) |

- El nombre del archivo **es** el nombre de la tabla: hallar `users` =
  `rg -l "export const users" src/db/schema`.
- Un archivo de tabla que pasa de ~150 líneas: extraer enums/defaults a `shared.ts`;
  **no** partir la tabla en dos — una tabla definida en dos archivos no se puede
  referenciar desde relations ni repositories.

### 3. Qué puede importar cada archivo

| Archivo | Puede importar | NO puede importar |
|---|---|---|
| `schema/*.ts` | `drizzle-orm`, `schema/shared` | cliente `db`, relations, seed, repositories |
| `schema/index.ts` | `schema/*` | lo que no sea tablas |
| `relations.ts` | barrel `schema/` | seed, repositories |
| `index.ts` (cliente) | `config`, barrel, relations | repositories, services |
| `seed/*` | schema, `tx` del runner | `modules/`, routes |
| `modules/*/**.repository.ts` | `db`, schema, relations | express, `req`/`res` |

El barrel es el único que arma `{ schema }`; el `db` se pasa como parámetro, no se
importa un singleton en módulos profundos (ver `node-base-datos-conexion-backend`).

### 4. Seeds

```ts
// src/db/seed/index.ts
if (process.env.NODE_ENV === "production") throw new Error("seed jamás en producción");
// lotes chicos dentro de una transacción; upsert idempotente (onConflictDoUpdate)
```

- Runner + 1 archivo por tabla sembrada que exporta `seedX(tx)`; se invocan en orden de
  dependencia de FKs, cada lote en su transacción.
- **Idempotente:** correrlo dos veces no duplica filas (upsert por clave natural).
- El seed de un ambiente jamás corre contra otro compartido (ver `node-testing-backend`).

### 5. Migraciones

- `drizzle/` es **salida** de drizzle-kit: se commitea junto al schema, nunca se edita
  a mano ni se reordena.
- Flujo: editar `schema/` → `drizzle-kit generate` → commitear schema + SQL juntos →
  `drizzle-kit migrate`. `push` solo en prototipo local desechable.

### 6. Verificación (obligatoria)

```bash
# cada archivo de schema con tablas imprime 1; index.ts y shared.ts no aparecen
rg -c "pgTable\(|mysqlTable\(|sqliteTable\(" src/db/schema
npx drizzle-kit generate       # debe quedar sin diffs = barrel sincronizado
npx drizzle-kit check          # colisiones entre migraciones
rg -l "drizzle\(" src/         # 1 solo archivo: el cliente único
rg -e "SELECT " -e "INSERT " -e "UPDATE " -e "DELETE " src/ -g '!src/db/**'   # 0 hits
rg --files drizzle             # migraciones presentes y commiteadas
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Todas las tablas en un solo archivo | `rg -c "pgTable\|mysqlTable\|sqliteTable" src/db/schema` → un archivo con >1 |
| Tabla nueva sin exportar en el barrel | `npx drizzle-kit generate` propone diff, o runtime "does not exist" |
| Más de un cliente `drizzle(` | `rg -l "drizzle\(" src/` → más de 1 archivo |
| Seed sin guard de producción | `rg "NODE_ENV" src/db/seed/index.ts` → sin match |
| SQL fuera de la capa de datos | `rg -e "SELECT " src/ -g '!src/db/**'` → hits |
| Migración editada a mano | `git log --oneline -- drizzle/` → toca un archivo ya aplicado |

## Solapamiento

- `node-arquitectura-backend` — define la capa `db/` y dónde viven los repositories; esta
  skill solo ordena **su interior** con Drizzle, no redefine capas.
- `node-base-datos-conexion-backend` — pool único, transacciones y migraciones versionadas;
  acá está el árbol concretado para drizzle-kit.
- `node-config-env-backend` — dentro de `src/` solo `config/` lee env; la excepción es
  `drizzle.config.ts`, que corre como CLI aparte.
- `node-testing-backend` — fixtures y BD de test aislados; el runner de `seed/` no los
  reemplaza.
- Agente `database-drizzle` — la referencia por nombre; su prompt no copia este árbol.
