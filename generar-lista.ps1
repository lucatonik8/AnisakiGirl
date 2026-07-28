# Genera photos.json con todas las imagenes de la carpeta "fotos".
# Ejecutalo (o usa ACTUALIZAR.bat) cada vez que anadas fotos nuevas.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dir  = Join-Path $root 'fotos'

if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
    Write-Host "Se ha creado la carpeta 'fotos'. Mete ahi tus imagenes." -ForegroundColor Yellow
}

$exts = '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp'

# Si has dejado fotos sueltas en la carpeta principal, se mueven solas a "fotos".
$sueltas = Get-ChildItem $root -File | Where-Object { $exts -contains $_.Extension.ToLower() }
if ($sueltas) {
    $sueltas | Move-Item -Destination $dir -Force
    Write-Host "Movidas $($sueltas.Count) foto(s) sueltas a la carpeta 'fotos'." -ForegroundColor Cyan
}

$files = Get-ChildItem $dir -File |
         Where-Object { $exts -contains $_.Extension.ToLower() } |
         Sort-Object Name

$data = [ordered]@{
    generado = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    total    = $files.Count
    fotos    = @($files | ForEach-Object { 'fotos/' + $_.Name })
}

$utf8 = New-Object System.Text.UTF8Encoding $false

# photos.json -> lo lee la web al arrancar
$json = $data | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText((Join-Path $root 'photos.json'), $json, $utf8)

# photos.js -> misma lista, pero funciona incluso abriendo index.html sin servidor
$lista = ($data.fotos | ForEach-Object { '  ' + ($_ | ConvertTo-Json) }) -join ",`r`n"
$js = "/* Generado automaticamente por generar-lista.ps1 - no lo edites a mano. */`r`n" +
      "self.FOTOS_INICIALES = [`r`n$lista`r`n];`r`n"
[System.IO.File]::WriteAllText((Join-Path $root 'photos.js'), $js, $utf8)

Write-Host "Lista actualizada: $($files.Count) fotos." -ForegroundColor Green
