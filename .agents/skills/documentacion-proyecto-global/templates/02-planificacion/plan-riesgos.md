# {{doc.title}}

## Matriz de exposición

{{@riskMatrix}}

## Registro de riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación | Dueño |
|---|---|---|---|---|---|
{{#each planificacion.risks}}| {{id}} | {{description}} | {{probability}} | {{impact}} | {{mitigation}} | {{owner}} |
{{/each}}
