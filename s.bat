@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "VENV_BAT=%BACKEND%\.venv\Scripts\activate.bat"
set "VENV_PS1=%BACKEND%\.venv\Scripts\Activate.ps1"
set "ENV_FILE=%BACKEND%\.env"
set "ENV_EXAMPLE=%BACKEND%\.env.example"
set "TMP_BACKEND_PS1=%TEMP%\leansync_backend_start.ps1"
set "TMP_FRONTEND_PS1=%TEMP%\leansync_frontend_start.ps1"
set "TMP_FREEBUFF_PS1=%TEMP%\leansync_freebuff_start.ps1"
set "TMP_OPENCODE_PS1=%TEMP%\leansync_opencode_start.ps1"

cls
echo.
echo Nexus LeanSync - Starting in 4 colored PowerShell tabs...
echo.

if not exist "%BACKEND%" (
    echo [ERROR] Backend folder not found: %BACKEND%
    goto error
)

if not exist "%FRONTEND%" (
    echo [ERROR] Frontend folder not found: %FRONTEND%
    goto error
)

if not exist "%VENV_BAT%" (
    echo [ERROR] Missing backend venv: %VENV_BAT%
    goto error
)

if not exist "%VENV_PS1%" (
    echo [ERROR] Missing PowerShell venv activator: %VENV_PS1%
    goto error
)

if not exist "%FRONTEND%\node_modules" (
    echo [ERROR] Missing frontend node_modules.
    echo Run: cd /d "%FRONTEND%" ^&^& npm install
    goto error
)

if not exist "%ENV_FILE%" (
    if exist "%ENV_EXAMPLE%" (
        echo Creating backend\.env from .env.example...
        copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
    ) else (
        echo [ERROR] Missing backend .env and .env.example
        goto error
    )
)

findstr /c:"DB_PASSWORD=your_mysql_password_here" "%ENV_FILE%" >nul 2>nul
if not errorlevel 1 (
    echo [ERROR] Update DB_PASSWORD in backend\.env
    goto error
)

where wt >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Windows Terminal command 'wt' was not found.
    echo Install Windows Terminal or make sure wt.exe is available in PATH.
    goto error
)

where powershell >nul 2>nul
if errorlevel 1 (
    echo [ERROR] powershell.exe was not found.
    goto error
)

echo Creating PowerShell launch scripts...

> "%TMP_BACKEND_PS1%" echo $Host.UI.RawUI.WindowTitle = 'LeanSync Backend'
>> "%TMP_BACKEND_PS1%" echo Set-Location -LiteralPath '%BACKEND%'
>> "%TMP_BACKEND_PS1%" echo . '%VENV_PS1%'
>> "%TMP_BACKEND_PS1%" echo python manage.py runserver

> "%TMP_FRONTEND_PS1%" echo $Host.UI.RawUI.WindowTitle = 'LeanSync Frontend'
>> "%TMP_FRONTEND_PS1%" echo Set-Location -LiteralPath '%FRONTEND%'
>> "%TMP_FRONTEND_PS1%" echo npm run dev

> "%TMP_FREEBUFF_PS1%" echo $Host.UI.RawUI.WindowTitle = 'Freebuff'
>> "%TMP_FREEBUFF_PS1%" echo Set-Location -LiteralPath '%ROOT%'
>> "%TMP_FREEBUFF_PS1%" echo freebuff

> "%TMP_OPENCODE_PS1%" echo $Host.UI.RawUI.WindowTitle = 'OpenCode'
>> "%TMP_OPENCODE_PS1%" echo Set-Location -LiteralPath '%ROOT%'
>> "%TMP_OPENCODE_PS1%" echo opencode

echo Launching one Windows Terminal window with 4 colored PowerShell tabs...

wt ^
  new-tab -p "Windows PowerShell" --title "LeanSync Backend" --tabColor "#6B6F14" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%TMP_BACKEND_PS1%" ^
  ; new-tab -p "Windows PowerShell" --title "LeanSync Frontend" --tabColor "#B91C1C" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%TMP_FRONTEND_PS1%" ^
  ; new-tab -p "Windows PowerShell" --title "Freebuff" --tabColor "#1D4ED8" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%TMP_FREEBUFF_PS1%" ^
  ; new-tab -p "Windows PowerShell" --title "OpenCode" --tabColor "#92400E" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%TMP_OPENCODE_PS1%"

if errorlevel 1 (
    echo [ERROR] Failed to launch Windows Terminal.
    goto error
)

echo.
echo LeanSync backend, frontend, Freebuff, and OpenCode launched in 4 colored PowerShell tabs.
goto end

:error
echo.
echo Startup failed.
echo Press any key to close...
pause >nul

:end
endlocal
