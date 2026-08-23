$dest = "$env:LOCALAPPDATA\Programs\Git"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$zip = "$dest\mingit.zip"
Write-Host "Downloading MinGit..."
Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.48.1.windows.1/MinGit-2.48.1-64-bit.zip' -OutFile $zip
Write-Host "Extracting MinGit to $dest..."
Expand-Archive -Path $zip -DestinationPath $dest -Force
Remove-Item -Force $zip

$cmdPath = "$dest\cmd"
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($currentPath -notlike "*$cmdPath*") {
    [Environment]::SetEnvironmentVariable('Path', "$currentPath;$cmdPath", 'User')
}

Write-Host "Git path check: $(Test-Path "$dest\cmd\git.exe")"
& "$dest\cmd\git.exe" --version
