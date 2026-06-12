param(
  [int]$Port = 5178,
  [ValidateNotNullOrEmpty()]
  [string]$HostName = '127.0.0.1',
  [ValidateNotNullOrEmpty()]
  [string]$OpenPath = '/',
  [switch]$DryRun,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$editorRoot = Join-Path $projectRoot 'src\ExternalSupport\SelfHostedEditor'
$candidatePorts = @(
  $Port,
  5178, 5179,
  5173, 5174, 5175, 5180,
  3000, 3001,
  4173, 4174,
  8000, 8080, 8090
) | Where-Object { $_ -gt 0 } | Select-Object -Unique

function Get-NpmCommand {
  $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npm) {
    return $npm.Source
  }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) {
    return $npm.Source
  }

  throw 'npm was not found in PATH. Install Node.js or open this from a shell where npm is available.'
}

function Get-LoopbackAddress {
  try {
    return [System.Net.IPAddress]::Parse($HostName)
  } catch {
    if ($HostName -eq 'localhost') {
      return [System.Net.IPAddress]::Parse('127.0.0.1')
    }
  }

  throw "HostName must be an IP address or localhost for local port probing. Received: $HostName"
}

function New-EditorUrl {
  param(
    [int]$PortToUse,
    [string]$UrlPath
  )

  $normalizedPath = if ([string]::IsNullOrWhiteSpace($UrlPath)) {
    '/'
  } elseif ($UrlPath.StartsWith('/')) {
    $UrlPath
  } else {
    "/$UrlPath"
  }

  return ('http://{0}:{1}{2}' -f $HostName, $PortToUse, $normalizedPath)
}

function Test-EditorOnPort {
  param([int]$PortToCheck)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri (New-EditorUrl -PortToUse $PortToCheck -UrlPath '/') -TimeoutSec 2
    if ($response.StatusCode -ne 200) {
      return $false
    }

    $content = [string]$response.Content
    return $content.Contains('/Scripts/Entries/SelfHostedEditorAppEntry.js') -or $content.Contains('SelfHostedEditor')
  } catch {
    return $false
  }
}

function Test-PortAvailable {
  param([int]$PortToCheck)

  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new((Get-LoopbackAddress), $PortToCheck)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Select-EditorPort {
  foreach ($candidatePort in $candidatePorts) {
    if (Test-EditorOnPort -PortToCheck $candidatePort) {
      return [pscustomobject]@{
        Port = $candidatePort
        Existing = $true
      }
    }

    if (Test-PortAvailable -PortToCheck $candidatePort) {
      return [pscustomobject]@{
        Port = $candidatePort
        Existing = $false
      }
    }
  }

  throw "No available SelfHostedEditor port found. Tried: $($candidatePorts -join ', ')"
}

function Test-DependenciesReady {
  return (Test-Path -LiteralPath (Join-Path $editorRoot 'node_modules\monaco-editor'))
}

function Invoke-DependencyInstall {
  param([string]$NpmCommand)

  Write-Host 'SelfHostedEditor dependencies are missing. Running npm install before starting the dev host...'
  Push-Location $projectRoot
  try {
    & $NpmCommand --prefix 'src\ExternalSupport\SelfHostedEditor' install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path -LiteralPath $editorRoot)) {
  throw "SelfHostedEditor package was not found: $editorRoot"
}

$npmCommand = Get-NpmCommand
$selection = Select-EditorPort
$url = New-EditorUrl -PortToUse $selection.Port -UrlPath $OpenPath
$dependenciesReady = Test-DependenciesReady

if ($DryRun) {
  Write-Host "Project root: $projectRoot"
  Write-Host "SelfHostedEditor root: $editorRoot"
  Write-Host "SelfHostedEditor URL: $url"
  Write-Host "Existing SelfHostedEditor server: $($selection.Existing)"
  Write-Host "Dependencies ready: $dependenciesReady"
  if (-not $selection.Existing) {
    Write-Host "Server command: set PORT=$($selection.Port) && npm --prefix src\ExternalSupport\SelfHostedEditor run start"
  }
  if (-not $dependenciesReady -and -not $SkipInstall) {
    Write-Host 'Dependency install: npm --prefix src\ExternalSupport\SelfHostedEditor install'
  }
  exit 0
}

if (-not $selection.Existing -and -not $dependenciesReady -and -not $SkipInstall) {
  Invoke-DependencyInstall -NpmCommand $npmCommand
}

if (-not $selection.Existing) {
  $serverCommand = "title Inscape SelfHostedEditor && cd /d `"$projectRoot`" && set `"PORT=$($selection.Port)`" && npm --prefix src\ExternalSupport\SelfHostedEditor run start"
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $serverCommand) -WorkingDirectory $projectRoot

  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Milliseconds 500
    if (Test-EditorOnPort -PortToCheck $selection.Port) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    throw "SelfHostedEditor did not start on $url within the expected time. Check the server window for details."
  }
}

Start-Process $url
Write-Host "SelfHostedEditor opened: $url"