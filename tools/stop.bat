@echo off
setlocal

echo.
echo  Nexus LeanSync - Stopping servers...
echo.

:: Kill process on port 8000 (Django)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo [1/2] Stopping backend  (PID %%p on port 8000)...
    taskkill /PID %%p /F >nul 2>&1
)

:: Kill process on port 5173 (Vite)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo [2/2] Stopping frontend (PID %%p on port 5173)...
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo  Done. Both servers stopped.
echo.
endlocal
