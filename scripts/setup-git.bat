@echo off
set "DEST=%LOCALAPPDATA%\Programs\Git"
if not exist "%DEST%" mkdir "%DEST%"
echo Downloading MinGit with curl...
curl.exe -L "https://github.com/git-for-windows/git/releases/download/v2.48.1.windows.1/MinGit-2.48.1-64-bit.zip" -o "%DEST%\mingit.zip"
echo Extracting with tar...
tar.exe -xf "%DEST%\mingit.zip" -C "%DEST%"
del "%DEST%\mingit.zip"
echo Done.
"%DEST%\cmd\git.exe" --version
