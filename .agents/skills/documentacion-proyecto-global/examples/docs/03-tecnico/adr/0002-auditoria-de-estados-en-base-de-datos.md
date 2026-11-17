> **Documento:** ADR 0002: Auditoria de estados en base de datos · **Fase:** Tecnico · **Versión:** 1.0 · **Fecha:** 2026-10-17 · **Autor:** Equipo de Producto · **Estado:** Borrador

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-10-17 | Equipo de Producto | Versión inicial |

# 0002 — Auditoria de estados en base de datos

- **Estado:** Aceptado

## Contexto

La direccion exige trazabilidad completa del estado de cada pedido.

## Decisión

Registrar cada cambio de estado en una tabla de auditoria con usuario y fecha.

## Consecuencias

Consultas de trazabilidad inmediatas; la tabla crece con cada cambio.
