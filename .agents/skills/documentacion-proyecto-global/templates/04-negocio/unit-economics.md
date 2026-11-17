# {{doc.title}}

## Métricas

| Métrica | Valor | Notas |
|---|---|---|
{{#each negocio.unitEconomics.metrics}}| {{metric}} | {{value}} | {{notes}} |
{{/each}}

## Supuestos

{{#each negocio.unitEconomics.assumptions}}- {{this}}
{{/each}}

## Punto de equilibrio

{{negocio.unitEconomics.breakeven}}
