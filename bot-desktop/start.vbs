Option Explicit

Dim shell, folder
Set shell = CreateObject("WScript.Shell")
folder = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder
shell.Environment("Process")("NOITE_ETERNA_DATA_DIR") = folder
shell.Run """" & folder & "\.venv\Scripts\pythonw.exe"" """ & folder & "\main.py""", 0, False
