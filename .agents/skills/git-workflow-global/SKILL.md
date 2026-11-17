---
name: git-workflow-global
description: 'Workflow de ramas de git para trabajar con agentes en paralelo sin pisarse: main protegida, dev como integración, una rama por cambio y merge solo validado. Use when arrancando cualquier trabajo en un repo, con el working tree sucio de cambios ajenos, cuando dos agentes o tareas deben avanzar a la vez, o antes de mergear o de decidir en qué rama va un cambio. Triggers: "ramas", "rama", "branch", "git", "merge", "dev", "trabajar en paralelo", "rebase".'
---

# Git Workflow Global — `main` → `dev` → `feat/*`: una rama por cambio

**Regla:** `main`/`master` solo avanza por merge desde `dev`; cada cambio nace en su propia
rama (`feat/*`, `fix/*`, `chore/*`) con el working tree limpio, se valida antes de mergear
a `dev`, y lo mergea quien valida — nunca el que trabajó solo.

## Cuándo usarla

- Arrancar cualquier trabajo en un repo (propio o de cliente) con agentes de por medio.
- Dos agentes (o vos y un agente) necesitan avanzar en cosas distintas al mismo tiempo.
- El working tree está sucio con cambios que no son tuyos y querés empezar algo nuevo.
- Decidir si un commit va a `main`, `dev` o una rama; o cuándo se libera una versión.
- Una rama acumuló varios temas y ya no se puede revisar ni mergear limpio.
- Aparecen errores "your local changes would be overwritten" al cambiar de rama.

## Checklist de ejecución

### 1. Estado base limpio

- `git status --porcelain` debe dar vacío antes de ramificar. Con cambios sin commitear
  no se crea ninguna rama: **los cambios viajan con vos al checkout** y terminan en una
  rama que quizá no es donde pertenecen.
- Son tuyos del tema actual → commitealos (o stash) en la rama donde estás.
- Son ajenos o no los entendés → `git stash push -m "<qué es>"` y avisá antes de continuar.

### 2. Actualizar la base y ramificar

- `git fetch origin && git switch dev && git pull --ff-only` — ramificar sobre una `dev`
  vieja garantiza conflictos evitables en el merge.
- `git switch -c feat/<tema>` (o `fix/`, `chore/`) — **un problema = una rama**: dos temas
  juntos hacen que review, revert y merge dejen de ser atómicos.
- La rama es de un solo agente. Si otro trabaja en paralelo, cada uno en la suya: el
  working tree es uno solo, por eso la rama también.

### 3. Trabajar y registrar

- Commits chicos y atómicos; cada cambio funcional entra al `CHANGELOG.md` del proyecto
  en el mismo gesto (`changelog-global` define el formato).
- Si `dev` avanzó mientras trabajabas: `git rebase dev` en tu rama — historial lineal y
  conflictos resueltos donde pasaron, no aplastados en el merge final.

### 4. Validar antes de merge

- Siempre en este orden: lint → typecheck → tests, con los comandos reales del proyecto
  (`npm run lint`, `npm run typecheck`, `npm test` o los equivalentes).
- Sumar la `Verificación (obligatoria)` de cada skill que toque en el cambio.
- Si algo falla, se arregla en tu rama: `dev` en rojo paraliza a todos los que salen de ella.

### 5. Merge (lo hace quien valida)

- Quien validó: `git switch dev && git merge --no-ff feat/<tema> && git push`.
  `--no-ff` deja el tema como unidad en el historial (un revert apunta al merge entero).
- El que trabajó no se mergea a sí mismo sin validar: aunque haga auto-review, el merge
  final lo integra el humano o el agente líder.
- Después: `git branch -d feat/<tema>` (y `git push origin --delete` si fue remota).

### 6. Liberar

- `dev` → `main` vía PR solo cuando corresponde liberar versión; `main` nunca recibe
  trabajo directo, ni un "commit chiquito".

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Trabajar sobre `main`/`dev` directo | `git branch --show-current` = `main`/`dev` con `git log origin/dev..HEAD` no vacío |
| Dos problemas en una rama | `git log --oneline dev..HEAD` mezcla temas sin relación |
| Arrastrar cambios ajenos al ramificar | `git status` con cambios antes de `git switch -c` |
| Merge sin validar | rama integrada sin corrida de lint + typecheck + tests |
| Rama larga sin rebasear | `dev..HEAD` con muchos commits viejos → conflictos en cascada al merge |
| Dos agentes peleándose el working tree | error "local changes would be overwritten" al cambiar de rama |

## Solapamiento

- `changelog-global` — la entrada del cambio se escribe desde la rama, en el mismo gesto;
  esta skill dice **dónde** vive el trabajo, aquella **qué** se registra y cómo.
- `tdd-global` — aporta el paso 4 cuando el cambio toca lógica (reproducir antes de arreglar).
- `revision-codigo-global` — puede ejecutar la revisión previa del paso 5.
- `crear-skill-global` — si el cambio es una skill de este repo, su checklist manda y su
  verificación corre dentro del paso 4.

## Verificación (obligatoria)

```bash
# desde la rama del cambio (repo con git):
git status --porcelain       # vacío: nada sin commitear
git branch --show-current    # feat/* | fix/* | chore/* (nunca main ni dev con trabajo activo)
git log --oneline dev..HEAD  # solo commits de ESTE cambio

# validación del proyecto, en orden (los comandos reales del repo):
npm run lint && npm run typecheck && npm test
```

Falla cualquiera → no se mergea: se arregla en la rama.
