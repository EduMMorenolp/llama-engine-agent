> **Documento:** Cronograma de Hitos · **Fase:** Planificacion · **Versión:** 1.0 · **Fecha:** 2026-10-17 · **Autor:** Equipo de Producto · **Estado:** Borrador

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-10-17 | Equipo de Producto | Versión inicial |

# Cronograma de Hitos

## Diagrama de Gantt de hitos

```mermaid
gantt
    title Cronograma de hitos — Gestor de Pedidos
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    section Hitos
    Kickoff y alcance :m1, 2026-10-17, 7d
    Alta de pedidos :m2, 2026-10-24, 21d
    Seguimiento y estados :m3, 2026-11-14, 14d
    Piloto con comercios :m4, 2026-11-28, 14d
```

## Hitos

| Hito | Semana de inicio | Duración (semanas) | Entregable |
|---|---|---|---|
| Kickoff y alcance | 1 | 1 | Acta y alcance acordados |
| Alta de pedidos | 2 | 3 | Modulo de alta funcionando |
| Seguimiento y estados | 5 | 2 | Tablero por estado disponible |
| Piloto con comercios | 7 | 2 | Retroalimentacion del piloto |

## Dependencias

- El tablero depende del registro de cambio de estado
- La exportacion depende de los filtros de busqueda
