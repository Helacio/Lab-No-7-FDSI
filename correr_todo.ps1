# Corre las 5 evaluaciones del laboratorio desde cualquier directorio.
# Uso:  .\correr_todo.ps1
#       .\correr_todo.ps1 -Solo baseline      # corre una sola config

param(
    [string]$Solo = ''
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot   # siempre ejecuta desde la carpeta del proyecto

Write-Host "Directorio de trabajo: $(Get-Location)" -ForegroundColor Cyan

# 1) Ollama tiene que estar arriba y el modelo descargado.
$modelos = & ollama list 2>$null
if (-not $modelos) {
    Write-Host "Ollama no responde. Abri otra terminal y ejecuta: ollama serve" -ForegroundColor Red
    exit 1
}
if (-not ($modelos -match 'qwen3:8b')) {
    Write-Host "Falta el modelo. Ejecuta: ollama pull qwen3:8b" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path resultados | Out-Null

# 2) Configuraciones en orden: antes -> despues.
$corridas = @(
    @{ config = 'baseline.yaml';            salida = 'resultados/baseline.json' },
    @{ config = 'hardened.yaml';            salida = 'resultados/hardened_equipo.json' },
    @{ config = 'extra_attacks.yaml';       salida = 'resultados/extra_attacks_v3.json' },
    @{ config = 'hardened_final_lab.yaml';  salida = 'resultados/hardened_final_lab.json' },
    @{ config = 'hardened_guardrail.yaml';  salida = 'resultados/guardrail_v2.json' }
)

if ($Solo) {
    $corridas = $corridas | Where-Object { $_.config -like "*$Solo*" }
    if (-not $corridas) {
        Write-Host "No hay ninguna config que coincida con '$Solo'." -ForegroundColor Red
        exit 1
    }
}

foreach ($c in $corridas) {
    Write-Host "`n=== $($c.config) ===" -ForegroundColor Yellow
    # -c se pasa con ruta absoluta: no depende del directorio actual.
    $ruta = Join-Path $PSScriptRoot $c.config
    # promptfoo sale con codigo 1 cuando hay tests fallidos: eso es un RESULTADO, no un error.
    & npx promptfoo@latest eval -c $ruta --no-cache -j 1 -o (Join-Path $PSScriptRoot $c.salida) 2>&1 |
        Select-String -Pattern 'Results:|passed|failed|errors|\[ERROR\]'
}

Write-Host "`nListo. Resultados en .\resultados\  ·  Dashboard: npx promptfoo@latest view" -ForegroundColor Green
