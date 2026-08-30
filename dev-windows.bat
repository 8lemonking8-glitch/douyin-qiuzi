@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js not found.& pause & exit /b 1)
where cargo >nul 2>nul || (echo Rust/Cargo not found.& pause & exit /b 1)
if not exist node_modules call npm install
call npm run dev
pause
