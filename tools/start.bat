@echo off
setlocal

set ROOT=%~dp0..
set BACKEND=%ROOT%\backend
set FRONTEND=%ROOT%\frontend
set VENV=%BACKEND%\.venv\Scripts\activate.bat
set ENV_FILE=%BACKEND%\.env
set ENV_EXAMPLE=%BACKEND%\.env.example

echo.
echo  Nexus LeanSync - Starting...
echo.

:: Check virtualenv
if not exist "%VENV%" (
    echo [ERROR] Backend virtualenv not found at %BACKEND%\.venv
    echo         Run:  python -m venv backend\.venv
    echo               backend\.venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

:: Check node_modules
if not exist "%FRONTEND%\node_modules" (
    echo [ERROR] Frontend node_modules not found.
    echo         Run:  cd frontend ^&^& npm install
    pause
    exit /b 1
)

:: Ensure backend .env exists
if not exist "%ENV_FILE%" (
    if exist "%ENV_EXAMPLE%" (
        echo [INFO] backend\.env not found. Creating it from backend\.env.example ...
        copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
    ) else (
        echo [ERROR] Backend environment file not found.
        echo         Expected: %ENV_FILE%
        echo         Missing template: %ENV_EXAMPLE%
        pause
        exit /b 1
    )
)

:: Prevent startup with the default placeholder MySQL password
findstr /c:"DB_PASSWORD=your_mysql_password_here" "%ENV_FILE%" >nul
if %errorlevel%==0 (
    echo [ERROR] backend\.env still contains the placeholder MySQL password.
    echo         Update DB_PASSWORD in %ENV_FILE% before starting the app.
    pause
    exit /b 1
)

:: Start backend in a new window
echo [1/2] Starting Django backend on http://localhost:8000 ...
start "LeanSync - Backend" cmd /k "cd /d %BACKEND% && call %VENV% && python manage.py runserver"

:: Small delay so backend window opens first
timeout /t 2 /nobreak >nul

:: Start frontend in a new window
echo [2/2] Starting Vite frontend on http://localhost:5173 ...
start "LeanSync - Frontend" cmd /k "cd /d %FRONTEND% && npm run dev"

echo.
echo  Both servers are starting in separate windows.
echo  Backend:  http://localhost:8000/graphql/
echo  Frontend: http://localhost:5173
echo.
endlocal
