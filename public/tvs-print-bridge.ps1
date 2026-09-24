# TVS & ESC/POS LAN Thermal Printer Bridge
# 1. Local Bridge: Listens on http://127.0.0.1:9101/ for instant PC printing
# 2. Cloud Relay: Polls https://app.drsunilkumarbhms.in for 1-click mobile printing
# Forwards raw ESC/POS binary data to raw TCP socket (192.168.29.2:9100) with ZERO HTTP headers

param(
    [int]$ListenPort = 9101,
    [string]$ServerUrl = "https://app.drsunilkumarbhms.in",
    [string]$BridgeKey = "clinic-tvs-bridge-key-9100"
)

# Ensure TLS 1.2
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

function Send-EscPosToPrinter($targetIp, $targetPort, [byte[]]$rawBytes) {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connectTask = $tcpClient.ConnectAsync($targetIp, $targetPort)
    if (-not $connectTask.Wait(4000)) {
        throw "Connection to printer $targetIp`:$targetPort timed out. Please check LAN cable."
    }
    $stream = $tcpClient.GetStream()
    $stream.Write($rawBytes, 0, $rawBytes.Length)
    $stream.Flush()
    Start-Sleep -Milliseconds 250
    $stream.Close()
    $tcpClient.Close()
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$ListenPort/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Output "=================================================="
    Write-Output "  Clinic Thermal Printer Bridge (TVS-E RP 3230)  "
    Write-Output "=================================================="
    Write-Output "Local PC Bridge   : $prefix (Active)"
    Write-Output "Mobile Cloud Relay: $ServerUrl (Active)"
    Write-Output "Target Printer    : 192.168.29.2:9100"
    Write-Output "Ready! Supports both PC 1-click & Mobile 1-click."
    Write-Output "Press Ctrl+C to stop.`n"

    $contextTask = $listener.GetContextAsync()
    $lastPoll = [DateTime]::MinValue
    $lastHeartbeatLog = [DateTime]::MinValue

    while ($listener.IsListening) {
        # 1. Check local PC print request (Wait up to 300ms)
        if ($contextTask.Wait(300)) {
            try {
                $context = $contextTask.Result
                $request = $context.Request
                $response = $context.Response

                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $response.AddHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
                $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

                if ($request.HttpMethod -eq "OPTIONS") {
                    $response.StatusCode = 200
                    $response.Close()
                }
                elseif ($request.HttpMethod -eq "GET") {
                    $response.ContentType = "application/json"
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ready","bridge":"tvs-rp3230-lan","mode":"dual-pc-and-mobile"}')
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                }
                elseif ($request.HttpMethod -eq "POST" -and $request.Url.AbsolutePath -eq "/print") {
                    try {
                        $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                        $bodyText = $reader.ReadToEnd()
                        $json = $bodyText | ConvertFrom-Json

                        $targetIp = if ($json.printerIp) { $json.printerIp } else { "192.168.29.2" }
                        $targetPort = if ($json.printerPort) { [int]$json.printerPort } else { 9100 }
                        $rawBytes = [System.Convert]::FromBase64String($json.escposBase64)

                        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [LOCAL PC] Received print job ($($rawBytes.Length) bytes) -> Connecting to $targetIp`:$targetPort..."
                        Send-EscPosToPrinter $targetIp $targetPort $rawBytes
                        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [LOCAL PC] SUCCESS: Printed & cut on $targetIp`:$targetPort!`n"

                        $response.StatusCode = 200
                        $response.ContentType = "application/json"
                        $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Printed and cut successfully"}')
                        $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    } catch {
                        $errMsg = $_.Exception.Message
                        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [LOCAL PC ERROR] $errMsg`n"
                        $response.StatusCode = 500
                        $response.ContentType = "application/json"
                        $respBytes = [System.Text.Encoding]::UTF8.GetBytes("{`"success`":false,`"error`":`"$errMsg`"}")
                        $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    } finally {
                        $response.Close()
                    }
                }
                else {
                    $response.StatusCode = 404
                    $response.Close()
                }
            } catch {
                Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Local listener error: $($_.Exception.Message)"
            }
            # Start next async context
            $contextTask = $listener.GetContextAsync()
        }

        # 2. Check mobile/cloud print queue every 2 seconds
        $now = [DateTime]::UtcNow
        if (($now - $lastPoll).TotalSeconds -ge 2) {
            $lastPoll = $now
            try {
                $pollUrl = "$ServerUrl/api/print-jobs/poll?key=$BridgeKey"
                $pollRes = Invoke-RestMethod -Uri $pollUrl -Method Get -TimeoutSec 4 -ErrorAction Stop
                
                if (($now - $lastHeartbeatLog).TotalSeconds -ge 60) {
                    $lastHeartbeatLog = $now
                    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [CLOUD RELAY] Bridge online & listening for mobile prints..."
                }

                if ($pollRes.hasJob -and $pollRes.job) {
                    $job = $pollRes.job
                    $rawBytes = [System.Convert]::FromBase64String($job.escposBase64)
                    $targetIp = if ($job.printerIp) { $job.printerIp } else { "192.168.29.2" }
                    $targetPort = if ($job.printerPort) { [int]$job.printerPort } else { 9100 }

                    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [MOBILE PRINT] Received cloud job '$($job.title)' ($($rawBytes.Length) bytes) -> Connecting to $targetIp`:$targetPort..."
                    
                    try {
                        Send-EscPosToPrinter $targetIp $targetPort $rawBytes
                        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [MOBILE PRINT] SUCCESS: Printed & cut on $targetIp`:$targetPort!`n"

                        $completeUrl = "$ServerUrl/api/print-jobs/$($job.id)/complete?key=$BridgeKey"
                        $body = @{ success = $true } | ConvertTo-Json
                        Invoke-RestMethod -Uri $completeUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
                    } catch {
                        $pErr = $_.Exception.Message
                        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [MOBILE PRINT ERROR] $pErr`n"
                        $completeUrl = "$ServerUrl/api/print-jobs/$($job.id)/complete?key=$BridgeKey"
                        $body = @{ success = $false; error = $pErr } | ConvertTo-Json
                        Invoke-RestMethod -Uri $completeUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
                    }
                }
            } catch {
                # Connection to server timed out or failed (temporary network blip)
            }
        }
    }
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
}
