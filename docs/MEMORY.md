# Memory — llama-engine-agent

## Estado Actual

| Campo | Valor |
|---|---|
| Versión | 0.2.0 |
| Última actualización | 2026-11-17 |
| Estado | Arquitectura Enfoque B implementada |

---

## Decisiones Tomadas

| Decisión | Fecha | Razón |
|---|---|---|
| Enfoque B (n8n Orquestador) | 2026-11-17 | Centraliza los triggers de Telegram, Crons y Tool Calling de forma visual y robusta |
| PostgreSQL 16 Dedicado | 2026-11-17 | Separa la base de datos del agente en el puerto 5434 sin interferir con otros servicios |
| Faster-Whisper Local (CUDA) | 2026-11-17 | Transcribe audios de Telegram en ~500ms en la RTX 5050 consumiendo apenas ~1 GB VRAM |
| Web Speech API en Frontend | 2026-11-17 | Permite dictado de voz en el navegador con 0 consumo adicional de VRAM |
| Supabase Best Practices | 2026-11-17 | Índices parciales en `agenda_diaria` para que el cron de 5m sea instantáneo |
