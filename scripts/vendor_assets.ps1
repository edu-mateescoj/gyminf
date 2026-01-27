# Requires: Windows PowerShell 5.1+ (ou PowerShell 7)
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\vendor_assets.ps1

$ErrorActionPreference = "Stop"

function Ensure-Dir($path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}

function Download-File($url, $dest) {
  Ensure-Dir (Split-Path $dest -Parent)
  Write-Host "Downloading $url -> $dest"
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

# ---- Root paths ----
$root = Split-Path -Parent $PSScriptRoot
$static = Join-Path $root "static"
$assets = Join-Path $static "assets"

Ensure-Dir $assets

# ---- Bootstrap ----
Ensure-Dir (Join-Path $assets "bootstrap")
Download-File "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" (Join-Path $assets "bootstrap\bootstrap.min.css")
Download-File "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" (Join-Path $assets "bootstrap\bootstrap.bundle.min.js")

# ---- CodeMirror (v5.65.13) ----
Ensure-Dir (Join-Path $assets "codemirror\theme")
Ensure-Dir (Join-Path $assets "codemirror\mode\python")
Download-File "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.css" (Join-Path $assets "codemirror\codemirror.min.css")
Download-File "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/solarized.min.css" (Join-Path $assets "codemirror\theme\solarized.min.css")
Download-File "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/dracula.min.css" (Join-Path $assets "codemirror\theme\dracula.min.css")
Download-File "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.js" (Join-Path $assets "codemirror\codemirror.min.js")
Download-File "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/python/python.min.js" (Join-Path $assets "codemirror\mode\python\python.min.js")

# ---- Font Awesome (6.4.0) ----
# Attention: all.min.css référence des webfonts (woff2/ttf). Il faut aussi les télécharger.
Ensure-Dir (Join-Path $assets "fontawesome\css")
Ensure-Dir (Join-Path $assets "fontawesome\webfonts")
Download-File "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" (Join-Path $assets "fontawesome\css\all.min.css")

# FontAwesome webfonts minimales (les plus courantes)
# (Si ton CSS réclame d’autres fichiers, tu les verras en 404 dans les logs Flask)
Download-File "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2" (Join-Path $assets "fontawesome\webfonts\fa-solid-900.woff2")
Download-File "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2" (Join-Path $assets "fontawesome\webfonts\fa-regular-400.woff2")
Download-File "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2" (Join-Path $assets "fontawesome\webfonts\fa-brands-400.woff2")

# ---- Mermaid ----
Ensure-Dir (Join-Path $assets "mermaid")
Download-File "https://cdn.jsdelivr.net/npm/mermaid@10.2.4/dist/mermaid.min.js" (Join-Path $assets "mermaid\mermaid.min.js")

# ---- Pyodide full/ : téléchargement automatique basé sur listing jsDelivr ----
$pyodideDir = Join-Path $assets "pyodide"
Ensure-Dir $pyodideDir

$api = "https://data.jsdelivr.com/v1/package/gh/pyodide/pyodide@0.24.1"
$flat = Invoke-RestMethod "$api/flat?path=/full"

# Filtrer: on récupère les fichiers utiles (js/wasm/data/zip/json)
$wantedExt = @(".js", ".wasm", ".data", ".zip", ".json")
$files = $flat.files | Where-Object {
  $_.type -eq "file" -and ($wantedExt -contains [System.IO.Path]::GetExtension($_.name))
}

foreach ($f in $files) {
  # $_.name ressemble à "/full/pyodide.js" -> on enlève le préfixe "/full/"
  $rel = $f.name.Substring("/full/".Length)
  $url = "https://cdn.jsdelivr.net/gh/pyodide/pyodide@0.24.1/full/$rel"
  $dest = Join-Path $pyodideDir $rel
  Download-File $url $dest
}

Write-Host ""
Write-Host "Done. Verify Flask logs for any remaining 404 under /static/assets/."
