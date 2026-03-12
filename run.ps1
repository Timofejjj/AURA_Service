# Запуск Python-скриптов: находит python.exe и выполняет переданный скрипт.
# Использование: .\run.ps1 <путь к скрипту> [аргументы]
# Пример: .\run.ps1 ml_part\insert_report_djimfild.py

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ScriptPath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ScriptArgs
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot

# Список путей для поиска Python (сначала явные установки, потом PATH)
$pythonPaths = @(
    "C:\Users\User\AppData\Local\Programs\Python\Python311\python.exe",
    "C:\Users\User\AppData\Local\Programs\Python\Python313\python.exe",
    "C:\Users\User\AppData\Local\Programs\Python\Python312\python.exe",
    "C:\Python311\python.exe",
    "C:\Python313\python.exe",
    "C:\Python312\python.exe"
)

$pythonExe = $null
foreach ($p in $pythonPaths) {
    if (Test-Path -LiteralPath $p) {
        $pythonExe = $p
        break
    }
}

if (-not $pythonExe) {
    $found = Get-Command python -ErrorAction SilentlyContinue
    if ($found) {
        $pythonExe = $found.Source
    }
}

if (-not $pythonExe) {
    Write-Host "Ошибка: Python не найден. Установите Python или добавьте его в PATH." -ForegroundColor Red
    exit 1
}

$fullScript = $ScriptPath
if (-not [System.IO.Path]::IsPathRooted($fullScript)) {
    $fullScript = Join-Path $scriptDir $ScriptPath
}

if (-not (Test-Path -LiteralPath $fullScript)) {
    Write-Host "Ошибка: Скрипт не найден: $fullScript" -ForegroundColor Red
    exit 1
}

& $pythonExe $fullScript @ScriptArgs
exit $LASTEXITCODE
