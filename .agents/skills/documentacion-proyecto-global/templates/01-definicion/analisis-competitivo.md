# {{doc.title}}

## Competidores relevantes

| Competidor | Fortaleza | Debilidad | Precio |
|---|---|---|---|
{{#each definicion.competencia.competitors}}| {{name}} | {{strength}} | {{weakness}} | {{price}} |
{{/each}}

## Huecos de mercado

{{#each definicion.competencia.gaps}}- {{this}}
{{/each}}
