param(
  [string]$EnvFile = ".env.vercel",
  [ValidateSet("development", "preview", "production")]
  [string]$Environment = "production"
)

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Error "Vercel CLI not found. Install it with: npm i -g vercel"
  exit 1
}

if (-not (Test-Path $EnvFile)) {
  Write-Error "Env file not found: $EnvFile"
  exit 1
}

Write-Host "Importing env vars from $EnvFile to Vercel environment: $Environment"

$lines = Get-Content $EnvFile
foreach ($line in $lines) {
  $trimmed = $line.Trim()
  if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
    continue
  }

  $parts = $trimmed.Split("=", 2)
  if ($parts.Count -ne 2) {
    Write-Warning "Skip invalid line: $line"
    continue
  }

  $key = $parts[0].Trim()
  $value = $parts[1].Trim()

  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  if ([string]::IsNullOrWhiteSpace($key)) {
    continue
  }

  Write-Host "Setting $key ..."
  $value | vercel env add $key $Environment
}

Write-Host "Done. You can run 'vercel env ls' to verify."
