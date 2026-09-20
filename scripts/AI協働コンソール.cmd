@echo off
chcp 65001 >nul
set HERE=%~dp0
set ROOT=%HERE%..
if exist "%USERPROFILE%\Desktop\XORA-BizDev\scripts\odin-bus.ps1" (
  set ROOT=%USERPROFILE%\Desktop\XORA-BizDev
)
start "" explorer "%ROOT%\営業\判断待ち"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\odin-bus.ps1" recv
pause
