# {{doc.title}}

Cada actividad tiene un único responsable (R) y un único aprobador (A).

| Actividad | Responsable (R) | Aprueba (A) | Consultado (C) | Informado (I) |
|---|---|---|---|---|
{{#each planificacion.raci}}| {{activity}} | {{responsible}} | {{accountable}} | {{consulted}} | {{informed}} |
{{/each}}
