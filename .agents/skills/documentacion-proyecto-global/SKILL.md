---
name: documentacion-proyecto-global
description: 'Genera el set de documentación de gestión y producto de un proyecto (PMBOK adaptado) como documentos Markdown autocontenidos dentro de una carpeta de documentación: acta de constitución, mapa de stakeholders, objetivos SMART, visión de producto, alcance del MVP, ERS, EDT/WBS, cronograma de hitos en Gantt, matriz RACI, plan de riesgos, control de cambios, comunicaciones, arquitectura, modelo de datos, contratos de API, seguridad y privacidad, UX, ADR, pricing y unit economics, go-to-market, plan de sprints, calidad y runbook. Use when starting or documenting a project that needs a formal, traceable document set, when there is no project documentation yet, or when the user asks for an acta, a scope statement, an ERS, a WBS, a Gantt of milestones, a risk plan or a full document pack. Triggers: "documentación del proyecto", "acta de constitución", "alcance del proyecto", "objetivos SMART", "ERS", "requisitos del sistema", "EDT", "WBS", "cronograma de hitos", "gantt", "matriz RACI", "mapa de stakeholders", "plan de riesgos", "control de cambios", "plan de comunicaciones", "visión de producto", "lean canvas", "unit economics", "go to market", "plan de sprints", "set de documentos", "PMBOK".'
---

# Documentación de Proyecto — set PMBOK adaptado en Markdown

**Regla:** el proyecto se documenta como un **set de documentos Markdown** dentro de `docs/`,
organizado en **6 fases** (`00-inicio` … `06-cierre`) y generado por `bin/pmdocs.mjs` desde
**un solo JSON tipado** (`schemas/proyecto.schema.json`). Cada documento lleva **bloque de
metadatos**, **tabla de control de versiones** y los **diagramas Mermaid** que le
corresponden. El framework se **adapta** ("tailoring") al tamaño del equipo: con una persona
se generan los documentos indispensables, no el tomo completo. Nunca se inventan fechas,
montos, horas ni reglas de negocio. Junto con los `.md` se genera un **visor HTML**
(`index.html`) y un **servidor local** (`serve.mjs` + `docs.cmd`) para leer el set en el
navegador, sin recursos externos.

## Cuándo usarla

- Arrancar un proyecto que todavía no tiene documentación formal.
- Piden "el acta de constitución", "el alcance del proyecto", "la ERS", "la EDT", "el Gantt de hitos", "la matriz RACI", "los riesgos".
- Antes de estimar o implementar: el set fija alcance, equipo y criterios de aceptación.
- Se necesita trazabilidad para un patrocinador o un cliente.

## Checklist de ejecución

1. **Recolectar el pedido**: nombre, patrocinador, autor, tamaño de equipo (`solo` |
   `equipo`), justificación y objetivo (25-30 palabras), visión, propuesta de valor y Lean
   Canvas, alcance del MVP con exclusiones explícitas, objetivos SMART, requisitos (RF/RNF y
   criterios de aceptación), stakeholders, épicas/EDT, hitos, RACI, riesgos, decisiones
   técnicas, pricing y unit economics, sprints, calidad y criterios de cierre. Preguntar lo
   que falte; `guide "<escenario>" --json` devuelve el esqueleto y las preguntas.
2. **Elegir el set**: con `teamSize: "solo"` se generan los documentos indispensables; con
   `"equipo"` se suman control de cambios, comunicaciones, go-to-market, runbook y ADR. Los
   documentos `opcional` (análisis competitivo, posicionamiento, UX) se crean solo si el
   candidato trae sus datos.
3. **Escribir el candidato** contra el schema (ejemplo completo en `examples/`): `meta`,
   `inicio`, `definicion`, `planificacion`, `tecnico`, `negocio`, `ejecucion` y `cierre`.
4. **Generar** (nunca entregar sin este paso):

```bash
node bin/pmdocs.mjs finalize <proyecto.json> <ruta>/docs --json
```

Escribe el árbol `<ruta>/docs/<fase>/<documento>.md`, el índice `docs/README.md`, el visor
`docs/index.html`, el servidor `docs/serve.mjs` y el launcher `docs/docs.cmd`, y devuelve
`gates` y `outputs`. Con gates en rojo **no escribe nada**.

5. **Ver en el navegador**: `node bin/pmdocs.mjs serve <ruta>/docs` levanta el servidor y abre
   el visor (o doble clic en `docs/docs.cmd`; `index.html` también se abre solo).
6. **Reparar si falla**: leer `gates[].errors`, corregir SOLO el candidato (nunca el Markdown
   generado, el visor ni las plantillas) y re-correr el mismo `finalize`.
7. **Delegar el contenido**: este set es dueño del **mapa y de la gestión**; el contenido
   técnico fino lo definen las skills del dominio (contrato de API, arquitectura, datos,
   testing) y las horas quedan para la skill de estimaciones.
8. **Entrega**: informar la ruta absoluta de `docs/README.md` y de `docs/index.html`, y el
   resumen de gates.

## Fases y documentos

| Fase | Documentos |
|---|---|
| `00-inicio` | acta-constitucion · stakeholders · objetivos-smart |
| `01-definicion` | vision-producto · alcance-mvp · requisitos-ers · analisis-competitivo¹ · posicionamiento¹ |
| `02-planificacion` | edt-epicas · cronograma-hitos · roles-raci · plan-riesgos · control-cambios² · plan-comunicaciones² |
| `03-tecnico` | arquitectura · modelo-datos · api-contratos · seguridad-privacidad · ux-wireframes¹ · adr/² |
| `04-negocio` | modelo-negocio-pricing · unit-economics · gtm-lanzamiento² |
| `05-ejecucion` | plan-sprints · calidad-testing · runbook-ops² |
| `06-cierre` | acta-cierre · retrospectiva · lecciones-aprendidas |

¹ opcional (solo con datos) · ² requerido cuando `teamSize` es `equipo`. El índice
`docs/README.md` lista el catálogo completo con el estado de cada documento.

## Convenciones de cada documento

- Nombres y carpetas en **kebab-case** en español; `.md` autocontenido y sin enlaces externos.
- **Bloque de metadatos** al inicio: documento · fase · versión · fecha · autor · estado.
- **Tabla `## Control de versiones`** (versión, fecha, autor, cambios).
- **Mermaid** donde aporta: Gantt (cronograma), `erDiagram` (datos), `flowchart` (arquitectura
  y UX) y `mindmap` (EDT).
- **Visor** `index.html`: autocontenido (sin CDN, sin CSS/JS externos) con sidebar por fase,
  búsqueda, tema claro/oscuro e impresión; delega los diagramas a Mermaid del editor.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Entregar documentos sin correr `finalize` | gates sin correr o en rojo → no es entregable |
| Copiar el framework completo a un equipo de una persona | sin `teamSize: "solo"` se generan documentos que nadie mantiene |
| Inventar fechas, montos u horas | valores que el usuario no dio → volver al paso 1 |
| Objetivos que no son SMART | cinco criterios repetidos → gate `smart-check` |
| Documento sin metadatos ni versiones | gate `metadata-block` |
| Diagrama ausente donde corresponde | gate `mermaid-required` |
| Enlaces externos o tokens sin reemplazar | gates `no-external-links` y `no-template-tokens` |
| Editar el Markdown generado a mano | el rerun de `finalize` lo pisa → corregir el candidato |
| Índice desincronizado del set | gate `index-complete` |
| Visor que carga CSS/JS de un CDN | gate `viewer-self-contained` |
| Faltan el visor, el servidor o el `.cmd` | gate `serve-included` |

## Solapamiento

- `documentacion` — esa genera el par de HTML ejecutivos de **una feature**; ésta genera el
  **set de documentos del proyecto** en Markdown. Feature para presentar → esa; arranque o
  documentación del proyecto → ésta.
- `generador-estimaciones-global` — las **horas por rol** son suyas; acá el cronograma es de
  hitos y el plan describe alcance, sin estimar esfuerzo.
- `contrato-api-global` — define la forma de cada contrato; `api-contratos.md` solo los lista.
- `changelog-global` — registra lo hecho; este set describe lo acordado y lo que va a hacerse.
- `archify` — un diagrama suelto es suyo; los Mermaid de estos documentos son parte del texto.
- `tdd-global` — define la estrategia de pruebas; `calidad-testing.md` solo la resume.

## Verificación (obligatoria)

```bash
# desde la raíz del repo de skills: estructura, triggers y sincronización
npm test
# el ecosistema sigue descubriendo la skill (desde la raíz)
npx skills add . -l
# desde la carpeta de la skill: doctor + finalize real sobre el ejemplo (12 gates ok)
node bin/pmdocs.mjs doctor
node bin/pmdocs.mjs finalize examples/gestor-pedidos.proyecto.json /tmp/docs --json
node --test test/pmdocs.test.mjs
# el set sale con visor y servidor listos para ver
ls examples/docs/index.html examples/docs/serve.mjs examples/docs/docs.cmd
# name = carpeta, tamaño y secciones fijas
rg "^name: documentacion-proyecto-global" SKILL.md
rg -c '^' SKILL.md
rg "^## " SKILL.md
```
