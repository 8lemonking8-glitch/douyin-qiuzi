@echo off
setlocal
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo ========================================
echo Douyin Quiz Tauri MVP - Windows Builder
echo ========================================

where node >nul 2>nul || goto NO_NODE
where npm >nul 2>nul || goto NO_NODE
where cargo >nul 2>nul || goto NO_RUST
where rustc >nul 2>nul || goto NO_RUST

echo [1/3] Installing Tauri CLI dependencies...
call npm install
if errorlevel 1 goto FAILED

echo [2/3] Running game engine test...
call npm test
if errorlevel 1 goto FAILED

echo [3/3] Building Windows executable and NSIS installer...
call npm run build
if errorlevel 1 goto FAILED

echo.
echo BUILD COMPLETE.
echo Portable EXE: src-tauri\target\release\douyin-quiz-tauri-mvp.exe
echo NSIS installer: src-tauri\target\release\bundle\nsis\
echo MSI installer: src-tauri\target\release\bundle\msi\
pause
exit /b 0

:NO_NODE
echo ERROR: Node.js was not found.
echo Install Node.js 20+ from https://nodejs.org/
pause
exit /b 1

:NO_RUST
echo ERROR: Rust toolchain was not found.
echo Install Rust using rustup from https://rustup.rs/
echo After installation, reopen Command Prompt and run this file again.
pause
exit /b 1

:FAILED
echo.
echo BUILD FAILED. Please copy the full error output for debugging.
pause
exit /b 1
