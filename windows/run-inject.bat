@echo off
REM run-inject.bat — launcher Windows buat inject-js-tool
REM Syarat: Node.js 18+ terinstall, dan "npm install" sudah pernah dijalankan di folder ini.
set /p TARGET_URL=Masukkan URL target: 
set /p SCRIPT_FILE=File script (default templates\highlight.js): 
if "%SCRIPT_FILE%"=="" set SCRIPT_FILE=templates\highlight.js
cd /d %~dp0\..
node inject.cjs --url "%TARGET_URL%" --file "%SCRIPT_FILE%" --screenshot result.png --out result.json --headful
echo.
echo Selesai. Hasil: result.json + result.png
pause
