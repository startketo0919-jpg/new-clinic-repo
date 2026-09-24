' TVS Print Bridge - Completely Silent Background Launcher (No Window, No Taskbar Icon)
Set WshShell = CreateObject("WScript.Shell")
strCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""& { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; $script = (New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/startketo0919-jpg/new-clinic-repo/main/public/tvs-print-bridge.ps1'); Invoke-Expression $script }"""
WshShell.Run strCommand, 0, False
