param(
    [string]$RootUser = 'root',
    [string]$RootPassword = 'Sakthi2005'
)

$mysql = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe'
if (-not (Test-Path $mysql)) {
    Write-Error "The MySQL client was not found at $mysql. Please check the path and install MySQL client if needed."
    exit 1
}

$sqlFile = Join-Path $PSScriptRoot '..\sql\create_ram_user.sql'
if (-not (Test-Path $sqlFile)) {
    Write-Error "SQL file not found: $sqlFile"
    exit 1
}

Write-Host "About to execute: $sqlFile as $RootUser@localhost"
if ($RootPassword -eq '') {
    Write-Host "No root password provided: you will be prompted by mysql if required."
    & $mysql -u $RootUser -p < $sqlFile
} else {
    # Use --password= to avoid interactive prompt. Note: exposing password on command line may be visible to other users.
    & $mysql -u $RootUser --password=$RootPassword < $sqlFile
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "SQL executed successfully. The 'ram' user should now exist with privileges on campus_voice_db."
} else {
    Write-Error "The mysql command returned exit code $LASTEXITCODE. Check output above for errors."
}
