param(
  [string]$RunnerDir = "$env:USERPROFILE\actions-runner",
  [string]$TaskName = "Hotdealspace GitHub Runner"
)

$ErrorActionPreference = "Stop"
$runnerDirPath = Resolve-Path -LiteralPath $RunnerDir
$runCmd = Join-Path $runnerDirPath "run.cmd"
$runnerConfig = Join-Path $runnerDirPath ".runner"
$starterScript = Join-Path $PSScriptRoot "start-github-runner-hidden.ps1"

if (!(Test-Path -LiteralPath $runCmd)) {
  throw "run.cmd not found in $runnerDirPath. Finish GitHub runner download first."
}

if (!(Test-Path -LiteralPath $runnerConfig)) {
  throw ".runner config not found in $runnerDirPath. Run config.cmd from GitHub first."
}

if (!(Test-Path -LiteralPath $starterScript)) {
  throw "Starter script not found: $starterScript"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$starterScript`" -RunnerDir `"$runnerDirPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel LeastPrivilege
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 7) `
  -MultipleInstances IgnoreNew

$task = New-ScheduledTask `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Runs the hotdealspace GitHub self-hosted runner in the background after Windows login."

Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Installed and started scheduled task: $TaskName"
Write-Host "Runner directory: $runnerDirPath"
Write-Host "The runner will start automatically after Windows login."
