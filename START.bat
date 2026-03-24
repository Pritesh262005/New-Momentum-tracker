@echo off
echo ========================================
echo ALMTS - Starting Development Servers
echo ========================================
echo.

echo Starting Backend Server...
start "ALMTS Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "ALMTS Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak > nul

start http://localhost:5173

echo.
echo ========================================
echo ALMTS is ready!
echo ========================================
echo.
echo Press any key to exit this window...
pause > nul
