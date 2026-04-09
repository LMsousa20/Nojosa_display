Set WshShell = CreateObject("WScript.Shell")
strStartup = WshShell.SpecialFolders("Startup")
Set oShellLink = WshShell.CreateShortcut(strStartup & "\CFD_Sistema_PDV.lnk")
oShellLink.TargetPath = "c:\ACS\Segunda_tela\auto_iniciar.bat"
oShellLink.WorkingDirectory = "c:\ACS\Segunda_tela"
oShellLink.WindowStyle = 7
oShellLink.Save
