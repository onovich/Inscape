@echo off
setlocal EnableExtensions

set "REPO_ROOT=%~dp0.."
set "SAFE_REPO=D:/LabProjects/Inscape"
set "COMMIT_MESSAGE=%~1"

if "%COMMIT_MESSAGE%"=="" (
  echo Usage: tools\CommitAndPushInscape.cmd "commit message"
  exit /b 2
)

cd /d "%REPO_ROOT%" || exit /b 1

echo [1/11] Repository status
git -c safe.directory=%SAFE_REPO% status --short --branch || exit /b 1

echo [2/11] SelfHostedEditor syntax
cmd /c npm.cmd --prefix src\ExternalSupport\SelfHostedEditor run check:syntax || exit /b 1

echo [3/11] SelfHostedEditor structure
cmd /c npm.cmd --prefix src\ExternalSupport\SelfHostedEditor run check:structure || exit /b 1

echo [4/11] SelfHostedEditor model contracts
cmd /c npm.cmd --prefix src\ExternalSupport\SelfHostedEditor run check:model || exit /b 1

echo [5/11] .NET build
dotnet build Inscape.slnx --no-restore || exit /b 1

echo [6/11] Internal tests
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build || exit /b 1

echo [7/11] VSCode manifest syntax
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js || exit /b 1

echo [8/11] VSCode semantic parity
cmd /c npm.cmd --prefix src\ExternalSupport\VSCode run check:semantic-parity || exit /b 1

echo [9/11] VSCode structure
cmd /c npm.cmd --prefix src\ExternalSupport\VSCode run check:structure || exit /b 1

echo [10/11] Diff whitespace check
git -c safe.directory=%SAFE_REPO% diff --check || exit /b 1

echo [11/11] Commit and push
git -c safe.directory=%SAFE_REPO% add . || exit /b 1
git -c safe.directory=%SAFE_REPO% diff --cached --quiet
if %ERRORLEVEL%==0 (
  echo No staged changes to commit.
  exit /b 0
)

git -c safe.directory=%SAFE_REPO% commit -m "%COMMIT_MESSAGE%" || exit /b 1
git -c safe.directory=%SAFE_REPO% push || exit /b 1
git -c safe.directory=%SAFE_REPO% status --short --branch || exit /b 1
