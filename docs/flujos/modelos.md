# Flujo: Modelos (selector, info, parámetros)

Archivos:
- `features/chat/components/ChatView.tsx` (dropdown + info)
- `features/chat/components/ModelInfoModal.tsx`
- `features/chat/components/ModelSettingsModal.tsx`

## 1. Carga de modelos

```
mount de ChatView
  → fetchAvailableModels()  → GET /api/models  (proxy a llama.cpp)
  → si hay models.length > 0:
      setModels(res.models)
      defaultActive = models.find(loaded) || models[0]
      setSelectedModel(defaultActive.id)
  → catch: queda FALLBACK_MODELS (lista estática)
```

### Fallback estático

| id | nombre | notas |
|----|--------|-------|
| `qwen3.5-9b` | Qwen 3.5 9B | Activo, texto |
| `qwen3.5-4b` | Qwen 3.5 4B | Visión |
| `gemma-4-e4b` | Gemma 4 E4B | Visión |
| `mistral-small-7b` | Mistral Small 7B | Texto |
| `phi-4-mini` | Phi 4 Mini | Compacto |

## 2. Selector (dropdown en navbar)

```
Botón model-badge-selector (muestra selectedModel + chevron)
  → setShowModelMenu(toggle)
  → popover "Modelos GGUF (llama.cpp)"
      cada modelo: nombre, badge, desc
      botón Info (stopPropagation) → setSelectedModelInfo(m)
      click item → setSelectedModel(id); cierra menú
      check ✓ si es el activo
Cierre: click outside (mousedown en document, refs modelMenuRef)
```

El modelo seleccionado se envía en cada `handleSend` → `sendMessage({ model: selectedModel })` y se muestra en Composer (badge derecho).

## 3. Info del modelo (`ModelInfoModal`)

```
Botón Info del navbar (modelo activo) o Info dentro del dropdown
  → setSelectedModelInfo(ModelInfo)
  → <ModelInfoModal model={…} onClose={…} />
```

`ModelInfo`: `{ id, name, size?, vision?, loaded?, badge?, desc? }`.

## 4. Parámetros del modelo (`ModelSettingsModal`)

```
Composer botón Sliders → setShowModelSettings(true)
  → <ModelSettingsModal settings={modelSettings} modelName={model}
                         onSave={setModelSettings} onClose={…} />
```

- Estado local en Composer: `modelSettings` (default `DEFAULT_MODEL_SETTINGS`)
- El objeto se pasa al enviar: `options.modelSettings` → payload WS
- El botón Sliders se colorea si `modelSettings.enableReasoning`

## 5. Relación con SettingsModal

Los sliders de Temperature/TopP/RepeatPenalty del SettingsModal (tab Chat) se guardan en `llama_engine_settings` (localStorage) y **no** están conectados automáticamente a `modelSettings` del Composer en esta versión. Son dos estados independientes.

## APIs

| Acción | Endpoint |
|--------|----------|
| Listar modelos | `GET /api/models` |
| Info | dato local del `ModelInfo` |
| Parámetros | payload WS `modelSettings` (no es endpoint REST) |
