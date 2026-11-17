# engine-whisper

Servicio de transcripción Speech-to-Text (STT) de alto rendimiento para notas de voz de Telegram.

## Características
- **Imagen base:** `fedirz/faster-whisper-server:latest-cuda`.
- **Aceleración:** NVIDIA CUDA (RTX 5050 8GB VRAM).
- **Modelo:** `Systran/faster-whisper-small` en FP16 (~1.0 GB VRAM).
- **Puerto:** `8000`.
- **API Compatible:** OpenAI Audio Transcriptions (`POST /v1/audio/transcriptions`).

