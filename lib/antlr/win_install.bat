set ANTLR=%ProgramFiles%\antlr
mkdir "%ANTLR%"
copy "%~dp0\antlr-4.7.1-complete.jar" "%ANTLR%"
echo java org.antlr.v4.Tool %%* > "%ANTLR%\antlr4.bat"
echo java org.antlr.v4.gui.TestRig %%* > "%ANTLR%\grun.bat"
if not CLASSPATH == "%ANTLR%" (
  setx CLASSPATH "%ANTLR%" /m
  setx PATH "%PATH%;%ANTLR%"
)

@echo off
ping 127.0.0.1 -n 5 > nul