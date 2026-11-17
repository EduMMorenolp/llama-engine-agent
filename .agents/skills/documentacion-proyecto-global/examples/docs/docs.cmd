@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js no esta instalado. Instalalo y volve a intentar. & pause & exit /b 1)
echo Sirviendo la documentacion en el navegador... (cerra esta ventana para detener el servidor)
node "serve.mjs" %*
endlocal
