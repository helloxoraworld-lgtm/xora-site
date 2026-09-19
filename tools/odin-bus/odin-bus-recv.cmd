@echo off
chcp 65001 >nul
set HERE=%~dp0
if exist "%HERE%odin-bus.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%odin-bus.ps1" recv
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%scripts\odin-bus.ps1" recv
)
pause
