# {{doc.title}}

## Justificación del proyecto

{{inicio.justification}}

## Objetivo general

{{inicio.objective}}

## Patrocinador

- **Nombre:** {{meta.sponsor}}
- **Autor del documento:** {{meta.author}}

## Equipo del proyecto

| Nombre | Rol |
|---|---|
{{#each inicio.team}}| {{name}} | {{role}} |
{{/each}}

## Entregables de alto nivel

{{#each inicio.deliverables}}- {{this}}
{{/each}}

## Criterios de éxito

{{#each inicio.successCriteria}}- {{this}}
{{/each}}

## Pendiente de definición

{{#each definicion.pending}}- {{this}}
{{/each}}
