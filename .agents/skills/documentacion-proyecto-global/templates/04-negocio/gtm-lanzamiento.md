# {{doc.title}}

## Segmentos objetivo

{{#each negocio.gtm.segments}}- {{this}}
{{/each}}

## Canales

{{#each negocio.gtm.channels}}- {{this}}
{{/each}}

## Fases de lanzamiento

| Fase | Semanas | Objetivo |
|---|---|---|
{{#each negocio.gtm.phases}}| {{name}} | {{weeks}} | {{goal}} |
{{/each}}
