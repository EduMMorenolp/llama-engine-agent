---
name: changelog-global
description: 'Formato exigente del CHANGELOG de un proyecto: 5 categorias, entradas auto-contenidas con fecha al final, seccion Unreleased y registro obligatorio de cada cambio. Use when creating or unifying a project changelog, adding a change entry, choosing Added vs Changed vs Fixed, closing a version, or auditing changelog format. Triggers: "changelog", "historial de cambios", "agregar entrada", "added o changed", "unreleased", "liberar version", "keep a changelog", "formato del changelog".'
---

# Changelog Global — una entrada por cambio, auto-contenida y fechada

**Regla:** todo cambio funcional se registra en el `CHANGELOG.md` del servicio **en el mismo
gesto** que el código, con categoría y título en negrita, descripción que se entiende **sin
abrir el código** y fecha `[{YYYY-MM-DD}]` al final de la línea.

## Cuándo usarla

- Crear o unificar el `CHANGELOG.md` de un proyecto nuevo o existente.
- Registrar una alta, modificación o eliminación de funcionalidad (mismo gesto que el commit/PR).
- Elegir categoría: ¿`Added` o `Changed`? ¿dónde va la fecha? ¿cuándo usar el bloque expandido?
- Cerrar una versión: vaciar `## [Unreleased]` en un bloque `## [X.Y.Z] - YYYY-MM-DD`.
- Auditar el historial antes de un release.

## Checklist de ejecución

1. **Estructura del archivo**: `# Changelog` arriba; `## [Unreleased]` siempre al tope (cambios
   sin versionar); debajo, cada versión liberada como `## [X.Y.Z] - YYYY-MM-DD`, más reciente
   primero.
2. **Elegir una categoría**: `Added` (nuevo) · `Changed` (existente que cambió) · `Fixed` (bug) ·
   `Removed` (eliminado) · `Maintenance` (infra, refactor, limpieza).
3. **Escribir la entrada** (formato simple): línea principal
   `- **{Categoría}**: **{Título}**. {QUÉ se hizo, POR QUÉ si no es obvio, CÓMO; nombrar archivos,
   funciones, endpoints, tablas, schemas}. [{YYYY-MM-DD}]` + línea de archivos
   `  * **Files (Archivos)**: {rutas afectadas}. [{YYYY-MM-DD}]` (recomendada si toca varios).
4. **Formato expandido** cuando hay contexto importante: misma línea principal + `* **Problema**:`
   + `* **Solución**:` + `* **Files (Archivos)**:`; la fecha queda al final de la última línea.
5. **Reglas**: auto-contenida · categoría y título en **negrita** · fecha al final de la línea ·
   orden cronológico inverso dentro de cada sección · sin emojis · sin viñetas anidadas que no
   sean `*` · si el cambio cruza frontend y backend, entrada con **mismo título y categoría en
   ambos changelogs** (uno por repo), cada uno con sus archivos.
6. **Verificación (obligatoria)**:

```bash
# entradas = entradas con fecha final (ambos conteos deben ser iguales)
rg -c '^- \*\*(Added|Changed|Fixed|Removed|Maintenance)\*\*:' CHANGELOG.md
rg -c '^- \*\*(Added|Changed|Fixed|Removed|Maintenance)\*\*: .*\[\d{4}-\d{2}-\d{2}\]$' CHANGELOG.md
# categoría sin título en negrita (debe dar 0)
rg '^- \*\*(Added|Changed|Fixed|Removed|Maintenance)\*\*: [^*]' CHANGELOG.md
# fecha con llaves literales (debe dar 0)
rg '\[\{\d{4}' CHANGELOG.md
# emojis (debe dar 0)
rg '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' CHANGELOG.md
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Entrada sin fecha al final | los dos conteos de `rg -c` de arriba dan distinto |
| Fecha con llaves literales `[{2026-01-01}]` | `rg '\[\{\d{4}' CHANGELOG.md` → 0 |
| Categoría sin negrita de título | `rg '^- \*\*(Added\|Changed\|Fixed\|Removed\|Maintenance)\*\*: [^*]' CHANGELOG.md` → 0 |
| Emojis en entradas | `rg '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' CHANGELOG.md` → 0 |
| Descripción no auto-contenida ("fix", "ajuste" sin qué ni dónde) | `rg -i '^- \*\*Fixed\*\*: \*\*[^*]+\*\*\.\s*(fix\|arreglo\|ajuste)' CHANGELOG.md` → 0 |
| Orden ascendente (la versión vieja arriba) | `rg '^## \[' CHANGELOG.md` → la primera fecha debe ser la más reciente |
| Código mergeado sin entrada | `git diff --name-only main...HEAD` y verificar cada archivo: `rg "<archivo>" CHANGELOG.md` |

## Solapamiento

- `vite-ui-bloques-frontend` — el modal "i" de la app muestra el historial en su módulo de datos
  (`APP_VERSION`/`CHANGELOG`); su contenido se deriva del `CHANGELOG.md` del repo: mantenerlos
  sincronizados al liberar una versión.
