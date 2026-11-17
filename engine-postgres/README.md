# engine-postgres

Servicio de base de datos relacional para el asistente proactivo (`llama-engine-agent`).

## Características
- **Motor:** PostgreSQL 16 Alpine.
- **Puerto:** `5434` (mapeado al `5432` interno).
- **Tablas:**
  - `personalidades`: System prompts y perfiles de tono.
  - `agenda_diaria`: Actividades, citas, horas y estados (`recordado`, `completada`).
  - `habitos_config`: Hábitos recurrentes y horas de disparo.
  - `registro_habitos`: Historial de respuestas en `JSONB`.
  - `memorias`: Memoria semántica y preferencias a largo plazo.
- **Inicialización automática:** Lee los scripts de `init/01_schema.sql` y `init/02_seed.sql` al levantar el contenedor por primera vez.

