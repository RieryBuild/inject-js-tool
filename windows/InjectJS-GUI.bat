@echo off
REM ============================================================
REM  Inject JS Tool - GUI buat orang awam (double-click file ini)
REM  Syarat: Node.js 18+ sudah terinstall (dari nodejs.org)
REM ============================================================
cd /d %~dp0\..
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js belum terinstall. Install dulu dari https://nodejs.org lalu coba lagi.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Pertama kali: download bahan-bahannya dulu, tunggu ya... ^(sekali aja^)
  call npm install
)
echo Membuka tampilan Inject JS Tool di browser...
node gui\server.cjs --open
pause
