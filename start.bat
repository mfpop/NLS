@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
for %%I in ("%ROOT%") do set "ROOT=%%~fI"

set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "VENV=%BACKEND%\.venv\Scripts\activate.bat"
set "ENV_FILE=%BACKEND%\.env"
set "ENV_EXAMPLE=%BACKEND%\.env.example"
set "TMP_BACKEND=%TEMP%\leansync_backend_start.bat"
set "TMP_FRONTEND=%TEMP%\leansync_frontend_start.bat"

echo.
echo Nexus LeanSync - Starting...
echo.

if not exist "%BACKEND%" (
    echo [ERROR] Backend folder not found: %BACKEND%
    goto error
)

if not exist "%FRONTEND%" (
    echo [ERROR] Frontend folder not found: %FRONTEND%
    goto error
)

if not exist "%VENV%" (
    echo [ERROR] Missing backend venv: %VENV%
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

echo Creating temporary launchers...

(
    echo @echo off
    echo cd /d "%BACKEND%"
    echo call "%VENV%"
    echo python manage.py runserver
    echo pause
) > "%TMP_BACKEND%"

(
    echo @echo off
    echo cd /d "%FRONTEND%"
    echo npm run dev
    echo pause
) > "%TMP_FRONTEND%"

echo Launching backend and frontend in one Windows Terminal window...

wt ^
  new-tab --title "LeanSync Backend" "%TMP_BACKEND%" ^
  ; new-tab --title "LeanSync Frontend" "%TMP_FRONTEND%"

if errorlevel 1 (
    echo [ERROR] Failed to launch Windows Terminal.
    goto error
)

echo.
echo LeanSync backend and frontend launched.
goto end

:error
echo.
echo Startup failed.
echo Press any key to close...
pause >nul

:end
endlocal
