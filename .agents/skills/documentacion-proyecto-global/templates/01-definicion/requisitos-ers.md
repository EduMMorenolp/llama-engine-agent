# {{doc.title}}

## Requerimientos funcionales (RF)

| ID | Descripción | Prioridad |
|---|---|---|
{{#each definicion.requirements.functional}}| {{id}} | {{description}} | {{priority}} |
{{/each}}

## Requerimientos no funcionales (RNF)

| ID | Descripción | Categoría |
|---|---|---|
{{#each definicion.requirements.nonFunctional}}| {{id}} | {{description}} | {{category}} |
{{/each}}

## Criterios de aceptación (Gherkin)

{{#each definicion.requirements.acceptance}}### {{id}} — {{scenario}}

- **Dado** {{given}}
- **Cuando** {{when}}
- **Entonces** {{then}}

{{/each}}
