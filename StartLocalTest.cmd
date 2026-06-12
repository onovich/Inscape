@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0StartLocalTest.ps1" %*
set "START_LOCAL_TEST_EXIT=%ERRORLEVEL%"

if not "%START_LOCAL_TEST_EXIT%"=="0" (
  echo.
  echo StartLocalTest failed with exit code %START_LOCAL_TEST_EXIT%.
  pause
)

endlocal & exit /b %START_LOCAL_TEST_EXIT%