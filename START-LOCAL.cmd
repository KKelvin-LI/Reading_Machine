@echo off
setlocal
pushd "%~dp0" || exit /b 1
where node.exe >nul 2>&1
if errorlevel 1 goto :setup
if not exist "node_modules\vite\bin\vite.js" goto :setup
node.exe "node_modules\vite\bin\vite.js" --open --configLoader runner
set "result=%errorlevel%"
if not "%result%"=="0" pause
popd
exit /b %result%

:setup
echo Install Node.js 24 and pnpm 10, then run pnpm.cmd install --frozen-lockfile in this folder.
echo To play without installing anything, visit https://kkelvin-li.github.io/Reading_Machine/
pause
popd
exit /b 1
