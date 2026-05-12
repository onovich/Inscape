param(
    [string]$OutFile = "inscape-vscode.vsix"
)

$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot\..
try {
    npx vsce package --out $OutFile

    $codeCmd = (Get-Command code.cmd -ErrorAction Stop).Source
    & $codeCmd --install-extension $OutFile --force
}
finally {
    Pop-Location
}