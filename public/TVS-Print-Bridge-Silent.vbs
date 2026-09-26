' TVS Print Bridge - Completely Silent Background Launcher (No Window, No Taskbar Icon)
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
strBat = strDir & "\TVS-Print-Bridge.bat"

If fso.FileExists(strBat) Then
    ' Run TVS-Print-Bridge.bat in completely hidden mode (0 = hide window)
    WshShell.Run "cmd.exe /c """ & strBat & """", 0, False
Else
    strPs = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\tvs-print-bridge.ps1"
    If fso.FileExists(strPs) Then
        WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPs & """", 0, False
    Else
        MsgBox "Please place TVS-Print-Bridge.bat in the same folder first.", 16, "TVS Print Bridge"
    End If
End If
