param(
  [string]$RunnerDir = "$env:USERPROFILE\actions-runner"
)

$ErrorActionPreference = "Stop"
$runnerDirPath = Resolve-Path -LiteralPath $RunnerDir
$runCmd = Join-Path $runnerDirPath "run.cmd"
$logDir = Join-Path $runnerDirPath "_diag"
$logPath = Join-Path $logDir "scheduled-runner.log"

if (!(Test-Path -LiteralPath $runCmd)) {
  throw "run.cmd not found in $runnerDirPath"
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$existing = Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match "run\.cmd" -and
    $_.CommandLine -match [regex]::Escape($runnerDirPath.Path)
  }

if ($existing) {
  Add-Content -Path $logPath -Value "$(Get-Date -Format s) Runner already appears to be running."
  exit 0
}

Add-Content -Path $logPath -Value "$(Get-Date -Format s) Starting GitHub runner from $runnerDirPath"

Start-Process `
  -FilePath $env:ComSpec `
  -ArgumentList "/d", "/c", "`"$runCmd`"" `
  -WorkingDirectory $runnerDirPath `
  -WindowStyle Hidden `
  -Wait

Add-Content -Path $logPath -Value "$(Get-Date -Format s) GitHub runner stopped."
