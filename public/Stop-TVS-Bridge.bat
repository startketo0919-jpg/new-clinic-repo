@echo off
title Stop TVS Print Bridge
color 0C
echo Stopping background TVS Print Bridge...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*tvs-print-bridge*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo.
echo TVS Print Bridge has been stopped!
timeout /t 3
