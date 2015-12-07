Set ArgObj = WScript.Arguments

' cwd = CreateObject("Scripting.FileSystemObject").GetAbsolutePathName(".")
inputZip = ArgObj(0)
outputDir = ArgObj(1)

WScript.Echo ("Input: " & inputZip)
WScript.Echo ("Output: " & outputDir)

On Error Resume Next
Err.Clear

Set objShell = CreateObject("Shell.Application")
Set objSource = objShell.NameSpace(inputZip).Items()
Set objTarget = objShell.NameSpace(outputDir)
intOptions = 4
objTarget.CopyHere objSource, intOptions

If Err.Number <> 0 Then
    WScript.Echo ("Error: " & Err.Number)
    WScript.Echo ("Error (Hex): " & Hex(Err.Number))
    WScript.Echo ("Source: " & Err.Source)
    WScript.Echo ("Description: " & Err.Description)
    WScript.Quit 1
End If
