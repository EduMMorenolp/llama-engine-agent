---
name: node-testing-backend
description: 'Testing strategy for Express backends — unit, integration, and E2E tests with proper fixtures, mocking, and CI integration. Use when writing tests, setting up Jest/Vitest, mocking services, configuring test DB, or auditing test coverage. Triggers: "test", "jest", "vitest", "supertest", "mock", "cobertura", "coverage", "fixture", "CI falla", "test de integración", "testear endpoint".'
---

# Testing Backend — pirámide de tests con BD aislada y mocks explícitos

**Regla:** muchos tests unitarios de services, tests de integración de rutas con BD real
aislada, y pocos E2E. Cada suite se limpia sola; los tests nunca dependen de orden ni de
datos de otra suite.

## Cuándo usarla

- Escribir tests para un backend nuevo o existente.
- Configurar el runner (Jest/Vitest) y la BD de test.
- Decidir qué mockear y qué no.
- Auditar la cobertura o arreglar tests que fallan en CI.

## Checklist de ejecución

### 1. Pirámide de tests

| Capa | Qué testea | Herramientas | Cantidad |
|---|---|---|---|
| **Unit** | Services, utils, validaciones | Vitest / Jest | Muchos |
| **Integración** | Rutas + middleware + BD | Supertest + BD de test | Moderados |
| **E2E** | Flujos críticos completos | Supertest o Playwright | Pocos |

### 2. BD de test aislada

- Base de datos separada (`_test` suffix o variable `DATABASE_URL_TEST`).
- **Setup por suite:** migraciones → seed mínimo → tests → truncate/rollback.
- Nunca compartir estado entre suites; cada archivo de test es independiente.

```ts
// tests/setup.ts
beforeAll(runMigrations);        // migraciones al inicio
afterEach(truncateAll);          // limpiar datos entre tests
afterAll(() => pool.end());      // devolver conexiones al pool
```

### 3. Tests unitarios de services

```ts
// tests/unit/users.service.test.ts
import { createUser } from "../../src/modules/users/users.service";
describe("createUser", () => {
  it("lanza AppError si el email ya existe", async () => {
    // mock del repository, NO de la BD
    vi.spyOn(usersRepo, "findByEmail").mockResolvedValue({ id: 1 });
    await expect(createUser({ email: "x@x.com" })).rejects.toThrow("ya existe");
  });
});
```

- Mockear la **capa inferior** (repository/db), no la propia lógica; testear happy path, errores esperados y edge cases.

### 4. Tests de integración de rutas

```ts
// tests/integration/users.routes.test.ts
import request from "supertest";
import { app } from "../../src/app";

describe("POST /api/v1/users", () => {
  it("201 con datos válidos", async () => {
    const res = await request(app).post("/api/v1/users")
      .send({ email: "new@test.com", password: "Str0ng!Pass" });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
  });

  it("400 con email inválido", async () => {
    const res = await request(app).post("/api/v1/users")
      .send({ email: "invalid", password: "x" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
```

- Usar `app` (sin `listen`) y BD real de test: valida ruta → middleware → controller → service → db, sin conflictos de puerto.

### 5. Mocking correcto

| Qué mockear | Qué NO mockear |
|---|---|
| Servicios externos (email, pagos, storage) | La propia BD en tests de integración |
| Date/time para tests determinísticos | Lógica de negocio del service bajo test |
| Tokens/auth para acceder a rutas protegidas | El error handler (testear que responde bien) |

- **MSW** (Mock Service Worker) para servicios HTTP externos.
- Auth en integración: generar un token real de test, no bypassear el middleware.

### 6. Fixtures y datos de prueba

```ts
// tests/fixtures/users.ts
export const validUser = { email: "test@test.com", password: "Test123!" };
export const adminUser = { email: "admin@test.com", password: "Admin123!", role: "admin" };
```

- Centralizados en `tests/fixtures/`, nunca inline.
- Nunca usar credenciales reales en fixtures (skill `node-config-env-backend`).

### 7. Cobertura y CI

```json
// package.json (o vitest.config.ts)
{ "scripts": { "test": "vitest run", "test:cov": "vitest run --coverage" } }
```

- Umbral mínimo: ≥ 80% en services, ≥ 60% global como punto de partida.
- CI ejecuta `npm test` en cada PR; PR no se mergea si los tests fallan.

### 8. Verificación (obligatoria)

```bash
# tests existentes (sin archivos = 0 tests)
rg --files -g "*.test.*"
# cobertura (fila "All files" del resumen)
npx vitest run --coverage --reporter=text 2>&1 | rg "All files"
# tests que dependen de orden (imports cruzados entre test files)
rg 'import.*from.*\.test' tests/
# credenciales reales en tests (descarta fixtures conocidas)
rg -i "password.*=.*[\x27\x22]" tests/ | rg -vi "Test|Str0ng|Admin|fake"
# scripts de test en package.json
rg '\x22test\x22:' package.json
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Cero tests en el repo | `rg --files -g "*.test.*"` → sin salida = 0 |
| Tests que dependen de orden de ejecución | `vitest run --shuffle` falla |
| Sin teardown (datos sucios entre suites) | `rg -l -e afterEach -e afterAll tests/` bajo vs `rg --files -g "*.test.*"` total |
| Mock de todo (incluyendo la BD en integración) | `rg "mock\|spy" tests/integration` → excesivo |
| Credenciales reales en fixtures | `rg -i "password\|secret" tests/fixtures` → valores reales |
| Tests que escuchan en un puerto fijo | `rg "listen\|\.port" tests/` |
| Sin script de test en `package.json` | `rg '\x22test\x22' package.json` sin match |

## Solapamiento

- `node-validacion-entrada-backend` — los schemas se testean con inputs válidos e inválidos.
- `node-errores-respuestas-backend` — la integración verifica la shape de error y los códigos HTTP.
- `node-config-env-backend` — la BD de test usa su propia `DATABASE_URL_TEST` en config.
- `node-base-datos-conexion-backend` — el pool de test se cierra en `afterAll`.
- `node-logging-ops-backend` — logger en `silent`; el handler central se spyea para verificar el error real.
- `tdd-global` — allí vive la metodología (red-green, Prove-It); esta skill, la infraestructura.
