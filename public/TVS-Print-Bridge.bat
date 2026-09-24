@echo off
title TVS-E RP 3230 Thermal Printer Bridge (PC & Mobile)
color 0A
echo ========================================================
echo   Krishna Homoeopathic Clinic - TVS Printer Bridge
echo ========================================================
echo.
echo Starting print bridge on port 9101 and cloud queue...
echo This connects both your PC and Mobile directly to the LAN printer (192.168.29.2).
echo.
echo DO NOT CLOSE THIS WINDOW WHILE USING DIRECT PRINTING.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "& { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; $script = (New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/startketo0919-jpg/new-clinic-repo/main/public/tvs-print-bridge.ps1'); Invoke-Expression $script }"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Running local fallback...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tvs-print-bridge.ps1"
)

pause
