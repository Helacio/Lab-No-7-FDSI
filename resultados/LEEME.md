# Índice de corridas

Todas las corridas usan `qwen3:8b`, `temperature: 0`, `think: false`, `--no-cache`, `-j 1`.

| Archivo | Config | Qué prueba | Resultado |
|---|---|---|---|
| `baseline.json` | `baseline.yaml` | 6 casos del enunciado, prompt vulnerable | 5/6 (falla inyección indirecta) |
| `baseline_run2.json` | `baseline.yaml` | Repetibilidad | 5/6 · **salidas idénticas** a la corrida 1 |
| `hardened_provided.json` | `prompts/hardened_provided_backup.txt` (política original del kit) | 6 casos del enunciado | 6/6 |
| `hardened_equipo.json` | `hardened.yaml` (nuestros controles 1-5) | 6 casos del enunciado | 6/6 |
| `hardened_final_lab.json` | `hardened_final_lab.yaml` (prompt + guardrails) | 6 casos del enunciado | 6/6 |
| `extra_attacks.json` | `extra_attacks.yaml` (3 prompts, versión previa) | 7 ataques propios | 14/21 · corrida intermedia, superada por `extra_attacks_v3.json` |
| `extra_attacks_v2.json` | `extra_attacks.yaml` (4 prompts, versión previa) | 7 ataques propios | 21/28 · corrida intermedia |
| **`extra_attacks_v3.json`** | `extra_attacks.yaml` (5 prompts) | 7 ataques propios × 5 variantes | **25/35** · matriz definitiva del informe |
| `guardrail_exec_pipe_bug.json` | `hardened_guardrail.yaml` con provider `exec: node` | 7 ataques con guardrails | ⚠️ 7/7 **inválido**: salida ilegible por encoding del pipe. Evidencia del falso PASS. |
| **`guardrail_v2.json`** | `hardened_guardrail.yaml` con provider JS in-process | 7 ataques + 2 controles funcionales | **9/9** · configuración final |
| **`dashboard_matriz.png`** | Captura del dashboard (`promptfoo view`) de `extra_attacks_v3` | Evidencia visual de la matriz 7×5 | 3200×2400 px, captura real vía DevTools |

## Cómo auditar un resultado

```powershell
$j = Get-Content resultados\extra_attacks_v3.json -Raw | ConvertFrom-Json
$j.results.results |
  Select-Object @{n='caso';e={$_.testCase.description}},
                @{n='prompt';e={Split-Path $_.prompt.label -Leaf}},
                success,
                @{n='output';e={$_.response.output}} |
  Format-Table -Wrap
```

Nunca leer solo el `PASS/FAIL`: en este laboratorio hubo **falsos PASS** (respuesta inventada o ilegible) y **falsos positivos** (rechazo a una consulta legítima). El veredicto sale de leer la respuesta completa.
