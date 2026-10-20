Option Explicit

Dim shell, folder
Set shell = CreateObject("WScript.Shell")
folder = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder
shell.Environment("Process")("NOITE_ETERNA_DATA_DIR") = folder

Dim pythonw
pythonw = folder & "\.venv\Scripts\pythonw.exe"
If Not CreateObject("Scripting.FileSystemObject").FileExists(pythonw) Then
    MsgBox "O ambiente do bot nao foi encontrado." & vbCrLf & _
        "Execute Noite-Eterna-Instalador.exe para preparar o aplicativo.", _
        vbExclamation, "Noite Eterna"
    WScript.Quit 1
End If

shell.Run """" & pythonw & """ """ & folder & "\main.py""", 0, False
