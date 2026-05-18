param(
    [ValidateSet("off", "click", "selection")]
    [string]$Mode = "click",
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$sampleFile = Join-Path $repoRoot "samples\court-loop.inscape"
$workspaceFile = Join-Path $env:TEMP ("inscape-preview-source-sync-{0}.code-workspace" -f $Mode)

if (-not (Test-Path $sampleFile)) {
    throw "Smoke sample not found: $sampleFile"
}

$workspaceJson = @{
    folders = @(
        @{
            path = $repoRoot
        }
    )
    settings = @{
        "inscape.preview.sourceSyncMode" = $Mode
    }
}

$workspaceJson | ConvertTo-Json -Depth 8 | Set-Content -Path $workspaceFile -Encoding UTF8

$gotoTarget = "{0}:1:1" -f $sampleFile
$codeCommand = Get-Command code -ErrorAction SilentlyContinue

if (-not $codeCommand) {
    throw "VSCode command-line launcher 'code' was not found in PATH."
}

$argumentList = @(
    "--reuse-window"
    $workspaceFile
    "--goto"
    $gotoTarget
)

Write-Output ("Preview source sync smoke workspace: {0}" -f $workspaceFile)
Write-Output ("Mode: {0}" -f $Mode)
Write-Output "Expected checks:"

switch ($Mode) {
    "off" {
        Write-Output "- Ctrl+Hover / Ctrl+Click on dialogue and choice text should not reveal preview."
        Write-Output "- Explicit 'Inscape: Reveal Current Selection In Preview' should still work."
    }
    "click" {
        Write-Output "- Ctrl+Click on dialogue and choice text should reveal preview."
        Write-Output "- Plain caret movement should not auto-follow in preview."
    }
    "selection" {
        Write-Output "- Once preview is open, caret movement should send lightweight follow updates."
        Write-Output "- Selection changes must not open preview panels implicitly or trigger a re-render."
    }
}

Write-Output ("Open command: {0} {1}" -f $codeCommand.Source, ($argumentList -join " "))

if ($NoOpen) {
    exit 0
}

Start-Process -FilePath $codeCommand.Source -ArgumentList $argumentList | Out-Null
