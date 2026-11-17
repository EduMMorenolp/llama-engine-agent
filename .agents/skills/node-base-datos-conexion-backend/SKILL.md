---
name: node-base-datos-conexion-backend
description: 'Database connection pool, repository pattern, migrations, and transactions for Node.js backends. Use when setting up the database for the first time, optimizing the pool, adding migrations, handling transactions, or debugging connection leaks. Triggers: "conexión a la base", "pool", "migraciones", "transacción", "sequelize", "drizzle", "knex", "prisma", "connection leak", "base de datos", "query", "repository".'
---

# Base de Datos Conexión — un pool, un patrón de acceso, migraciones versionadas

**Regla:** un único pool creado al arranque, acceso a datos aislado en la capa `db/` (o
repositories), migraciones versionadas con rollback, y cierre explícito en shutdown.

## Cuándo usarla

- Configurar la conexión a BD por primera vez.
- El pool se agota, hay leaks, o queries lentos sin explicación.
- Agregar migraciones o manejar transacciones.
- Refactorear queries que están en controllers o services.

## Checklist de ejecución

### 1. Pool único al arranque

```ts
// src/db/pool.ts (o src/db/index.ts)
import { Pool } from "pg";        // ejemplo con pg; adaptar a tu driver
import { config } from "../config";

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX || 10,   // (CPU_CORES × 2) + 1 como base
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
```

- **Un solo pool** por proceso. Nunca crear conexiones por request.
- Pool size inicial: `(CPU cores del servidor de BD × 2) + 1`; ajustar con métricas.
- `connectionTimeoutMillis` para fallar rápido si la BD no responde.
- `DATABASE_URL` desde `config` (skill `node-config-env-backend`), nunca `process.env` directo.

### 2. Capa de acceso a datos

Queries viven en `src/db/` o `src/modules/<dominio>/<dominio>.repository.ts`, **nunca** en
controllers ni en services directamente:

```ts
// src/modules/users/users.repository.ts
export const findById = (id: number) =>
  pool.query("SELECT id, email, role FROM users WHERE id = $1", [id])
    .then(r => r.rows[0] ?? null);
```

- **Parámetros siempre con placeholders** (`$1`, `?`); nunca interpolación de strings.
- El service importa el repository; el controller importa el service (ver `node-arquitectura-backend`).
- Si usas un ORM (Drizzle, Prisma, Sequelize): el ORM **es** la capa de acceso; no
  envolverlo en otro wrapper innecesario, pero sí aislar la instancia en `db/`.

### 3. Transacciones

```ts
export const transferFunds = async (from: number, to: number, amount: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, from]);
    await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, to]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;                       // el error handler central lo atrapa
  } finally {
    client.release();                // SIEMPRE devolver al pool
  }
};
```

- `finally { client.release() }` es **obligatorio**; sin él, el pool se agota.
- Con ORMs: usar su API de transacciones (`prisma.$transaction`, `sequelize.transaction`).

### 4. Migraciones

- **Versionadas y secuenciales:** `001_create_users.sql`, `002_add_role.sql`.
- **Idempotentes:** `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- **Con rollback:** cada migración `up` tiene su `down` (o un script de reversión).
- Herramientas: `knex migrate`, `prisma migrate`, `drizzle-kit`, o scripts SQL manuales.
- **Nunca** alterar una migración ya ejecutada en producción; crear una nueva.

### 5. Cierre limpio

```ts
// en el handler de SIGTERM/SIGINT
await pool.end();       // pg
// o: await prisma.$disconnect();
// o: await sequelize.close();
```

Sin cierre explícito, connections quedan huérfanas tras cada restart/deploy.

### 6. Verificación (obligatoria)

```bash
# queries fuera de db/repositories
rg "pool\.query|\.findOne|\.findAll|\.create\b" src/controllers src/routes
# interpolación de strings en queries (SQL injection)
rg -e 'query\(\x60' -e 'query\(\x22.*\$\{' src/
# pool sin cleanup en shutdown
rg "pool\.end|disconnect|sequelize\.close" src/
# múltiples pools creados
rg "new Pool|new Client|createPool" src/ -l   # esperado: 1 archivo
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Conexión nueva por request | `rg "new Pool\|new Client\|createConnection" src/` en controllers/routes |
| Pool size excesivo (50+) | `rg "max:" src/db` → valor > 30 sin justificación |
| `client.release()` faltante en transacciones | `rg "pool\.connect" src/ -A20` → buscar `finally.*release` |
| SQL injection por interpolación | `rg "query\(\x60.*\$\{" src/` |
| Migración editada post-producción | `git log --oneline -- src/db/migrations/` → cambios en archivos antiguos |
| Queries directas en controllers | `rg "query\|findOne\|findAll" src/controllers` |
| Sin cierre de pool en shutdown | `rg "SIGTERM\|SIGINT" src/` sin `pool.end` cercano |

## Solapamiento

- `node-arquitectura-backend` — define que `db/` es una capa y qué puede importar.
- `arquitectura-drizzle-backend` — cuando el ORM es Drizzle, el árbol interno de `db/`
  (un schema por tabla, barrel, seeds, `drizzle/` en la raíz) está en esa skill.
- `node-config-env-backend` — `DATABASE_URL` y `DB_POOL_MAX` viven en el módulo único de config.
- `node-logging-ops-backend` — health check verifica la BD con un query simple.
- `node-errores-respuestas-backend` — errores de BD (constraint violation, timeout) los atrapa el handler
  central; los services no deben traducir errores de BD a HTTP directamente.
- `node-autenticacion-jwt-backend` — el flujo de login/register consume esta capa para leer hashes y
  rota el refresh token con una transacción (leer → revocar → insertar); nunca desde el controller.
