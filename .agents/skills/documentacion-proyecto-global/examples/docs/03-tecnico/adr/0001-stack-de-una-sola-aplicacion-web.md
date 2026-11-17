> **Documento:** ADR 0001: Stack de una sola aplicacion web · **Fase:** Tecnico · **Versión:** 1.0 · **Fecha:** 2026-10-17 · **Autor:** Equipo de Producto · **Estado:** Borrador

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-10-17 | Equipo de Producto | Versión inicial |

# 0001 — Stack de una sola aplicacion web

- **Estado:** Aceptado

## Contexto

El equipo es chico y necesita desplegar rapido sin sostener microservicios.

## Decisión

Una sola aplicacion web con su base de datos, desplegada como un contenedor.

## Consecuencias

Menos superficie operativa; si crece la escala habra que separar modulos mas adelante.
