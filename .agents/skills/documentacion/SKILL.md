---
name: documentacion
description: 'Genera DOS documentos HTML ejecutivos desde un mismo JSON tipado: uno con detalle técnico (portada, contexto, alcance, flujo, historias de usuario, plan de implementación, impacto técnico) y otro SIN detalle técnico en lenguaje simple (de qué se trata, cómo está hoy vs cómo va a quedar, pasos del trabajo con horas por equipo, cuánto demora, nota aclaratoria), ambos autocontenidos e imprimibles a A4. Use when presenting a feature to a stakeholder or role, documenting an upcoming implementation, creating a presentation document for the administrative or any role, producing an executive HTML briefing, or when someone asks for "uno técnico y otro para no técnicos". Triggers: "documento de presentación", "presentar feature", "presentar implementación", "documento para el rol administrativo", "presentar módulo", "briefing de feature", "documento ejecutivo de X", "armar documento para presentar", "documento con detalle técnico", "documento sin jerga", "versión simple del documento".'
---

# Documentación — documentos ejecutivos de presentación de features (técnico + simple)

**Regla:** cada feature se documenta con **DOS HTML ejecutivos autocontenidos** generados por
`bin/presentador.mjs` desde **un mismo** JSON tipado (`schemas/feature.schema.json`):

- `<slug>.html` — **documento técnico**: contexto, alcance, flujo, historias de usuario,
  plan de implementación con horas, impacto técnico (endpoints, tablas, archivos) y notas.
- `<slug>-simple.html` — **documento sin detalle técnico**: lenguaje simple, sin jerga, con
  la comparación "cómo está hoy vs cómo va a quedar", los pasos del trabajo con las tareas
  y horas de Backend/Frontend/QA, el total en horas y calendario, y la nota aclaratoria
  final (qué queda pendiente y qué queda fuera del alcance).

El agente recolecta el pedido, escribe el candidato y solo da por buenos los dos HTML cuando
`finalize` pasa sus 11 gates (validate + content + deliver técnico + deliver simple).
Documento continuo, imprimible a A4, CSS inline, sin recursos externos.

## Cuándo usarla

- Piden "un documento para presentar la feature X al rol administrativo".
- Piden "uno con detalle técnico y otro sin detalle técnico / en lenguaje simple".
- Documentar una implementación futura de un servicio para stakeholders.
- Presentar un módulo antes de estimarlo o implementarlo (define alcance, equipo y horas).
- Reemplazar a la memoria de conversación: lo que no está en el documento no existe.

## Checklist de ejecución

1. **Recolectar el pedido**: feature, servicio afectado, rol destinatario, estado
   (Propuesta | En implementación | Completada), contexto/objetivo **y su versión en
   lenguaje simple**, qué entra, qué queda fuera y pendiente, flujo paso a paso, historias
   de usuario, impacto técnico (si aplica), pares "hoy vs. nuevo", equipo (rol y nombre),
   pasos del trabajo con tareas y horas por equipo, calendario, qué queda pendiente y qué
   módulos quedan fuera del alcance. Preguntar lo que falte; nunca inventar fechas, montos,
   horas ni reglas de negocio.
2. **Ubicación fija y nombre con fecha**: los HTML siempre se escriben en la **raíz del
   proyecto** que se está trabajando, con el prefijo de fecha `YYYYMMDD-` que la CLI agrega
   **automáticamente** desde `meta.date` (ej.: `20261014-<slug-feature>.html` y
   `20261014-<slug-feature>-simple.html`); el agente pasa la ruta SIN fecha y la CLI la
   estampa (si el nombre ya viene fechado no duplica el prefijo). El candidato JSON queda al
   lado sin prefijo (`<raiz-proyecto>/<slug-feature>.feature.json`) para poder regenerar.
   Los reruns de reparación pisan esos mismos archivos; nunca van a una subcarpeta ni a
   una carpeta oculta.
3. **Escribir el candidato** contra el schema (ejemplo completo en `examples/`):
   `meta` (title, subtitle?, service, role, status, version, date, author?, brandColor?),
   `context` (summary técnico, objective, **plain** para el documento simple), `scope`
   (in/out/pending), `flow.steps`, `stories` (as/want/so), `techImpact` opcional
   (services/endpoints/tables/files — **solo va al documento técnico**),
   `comparison` (pares now/next), `plan` (team, steps con devTasks/qaTasks y horas,
   calendar), `clarification` (pending + outOfScope) y `notes` opcional.
4. **Finalizar** (nunca entregar los HTML sin este paso):

```bash
node bin/presentador.mjs finalize <raiz-proyecto>/<slug>.feature.json <raiz-proyecto>/<slug>.html --json
```

`finalize` escribe **ambos** archivos con el prefijo de fecha de `meta.date`:
`<YYYYMMDD>-<slug>.html` y `<YYYYMMDD>-<slug>-simple.html` (las rutas exactas quedan en
`outputs` del JSON). La fecha del nombre SIEMPRE es la de `meta.date`, no la del sistema:
así un rerun pisa el mismo archivo.

5. **Reparar si falla**: leer `gates[].errors` del JSON de salida, corregir SOLO el
   candidato (nunca el HTML a mano ni la plantilla) y re-correr el mismo `finalize`.
6. **Entrega**: informar la ruta absoluta de AMBOS HTML (con su `YYYYMMDD-`), el resumen de
   gates y recordar que el PDF sale con Ctrl+P desde el navegador. `guide "<scenario>" --json`
   devuelve el esqueleto y las preguntas pendientes si el pedido viene incompleto.
7. **Verificación (obligatoria)**:

```bash
# doctor: runtime + ambas plantillas + schema
node bin/presentador.mjs doctor
# finalize real sobre el ejemplo: los 12 gates deben dar ok y salen 2 archivos fechados
node bin/presentador.mjs finalize examples/reserva-admin.feature.json /tmp/reserva-admin.html --json
# tests de la CLI (12 tests)
node --test test/presentador.test.mjs
# name = carpeta, tamaño y secciones fijas
rg "^name: documentacion" SKILL.md
rg -c '^' SKILL.md
rg "^## " SKILL.md
# el ecosistema la descubre (desde la raíz del repo)
npx skills add . -l
```

## Gates

| Gate | Qué valida |
|---|---|
| `validate` | El candidato cumple el schema (campos requeridos, enums, tipos) |
| `placeholders` | Cero `TODO`/`FIXME`/`TBD`/`XXX`/`___`/`{{}}` y sin strings vacíos |
| `stories-shape` | Cada historia tiene `id` sin espacios en blanco |
| `plan-roles` | Cada `devTasks.role` existe en `plan.team` (Backend/Frontend/QA) |
| `tech-self-contained` / `simple-self-contained` | Cero CSS externo, CDN o `url(http…)` |
| `tech-headings` | Secciones técnicas requeridas presentes (incluye Plan e Impacto técnico) |
| `tech-structure` | `@page`, toggle de tema, título de portada, `lang`, total de horas |
| `simple-headings` | Secciones simples requeridas: De qué se trata · Cómo está hoy vs cómo va a quedar · Los pasos del trabajo · Cuánto demora · Nota aclaratoria |
| `simple-structure` | `@page`, toggle de tema, título de portada, `lang`, total de horas |
| `simple-no-tech-leak` | El documento simple NO contiene rutas de endpoints, archivos ni tablas snake_case |

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Entregar HTML sin pasar `finalize` | HTML cuyo `finalize` no corrió o dio error → no es entregable |
| Entregar solo uno de los dos documentos | `finalize` escribe el par; si falta `-simple.html` no se entregó completo |
| Entregar el nombre sin `YYYYMMDD-` | la CLI estampa el prefijo desde `meta.date`; si el archivo carece de fecha es que se renombró a mano → re-correr `finalize` |
| Editar el HTML generado a mano | rerun de `finalize` pisa el archivo → corregir el candidate.json |
| Invented contenido (fechas, montos, horas, reglas) | candidate con datos que el usuario no dio → volver al paso 1 |
| Placeholders en el documento | gate `placeholders` falla |
| CSS externo o CDN en la salida | gate `*-self-contained` falla |
| Jerga técnica filtrada al documento simple | gate `simple-no-tech-leak` falla; si es jerga sin ruta (p. ej. "enum"), reescribir el `context.plain` / tareas en lenguaje simple |
| Tarea de un rol que no está en el equipo | gate `plan-roles` falla |
| Dos skills peleando por "un documento lindo" | ver Solapamiento: estimaciones es por rol y horas; archify es diagrama |

## Solapamiento

- `generador-estimaciones-global` — ese genera horas de esfuerzo por rol en documentos por
  rol; éste genera el par técnico+simple con el plan completo en un solo archivo por feature.
  Si piden horas por rol sueltas, esa; si piden el documento de presentación completo, éste.
- `archify` — si lo que se quiere es un **diagrama** (arquitectura/flujo/sequence), manda
  archify; éste es prosa ejecutiva con listas y tablas, no diagramas.
- `changelog-global` — el documento describe lo que se VA a hacer; el CHANGELOG registra lo
  que se HIZO, en el mismo gesto de la implementación.
