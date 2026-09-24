# TVS & ESC/POS LAN Thermal Printer Bridge
# 1. Local Bridge: Listens on http://127.0.0.1:9101/ for instant PC printing
# 2. Instant Push Stream: Keeps open event channel to https://app.drsunilkumarbhms.in for 0-second mobile push
# Forwards raw ESC/POS binary data to raw TCP socket (192.168.29.2:9100) with ZERO HTTP headers

param(
    [int]$ListenPort = 9101,
    [string]$ServerUrl = "https://app.drsunilkumarbhms.in",
    [string]$BridgeKey = "clinic-tvs-bridge-key-9100"
)

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
    Write-Output "Local PC Bridge    : $prefix (Active)"
    Write-Output "Instant Push Stream: $ServerUrl (Connecting...)"
    Write-Output "Target Printer     : 192.168.29.2:9100"
    Write-Output "Mode               : Instant Event-Driven (Zero Polling)"
    Write-Output "Ready! Supports both PC 1-click & Mobile 1-click."
    Write-Output "Press Ctrl+C to stop.`n"

    $contextTask = $listener.GetContextAsync()

    # Stream connection variables
    $streamConnTask = $null
    $streamReq = $null
    $streamResp = $null
    $streamReader = $null
    $readLineTask = $null
    $lastConnectAttempt = [DateTime]::MinValue

    function Start-StreamConnection() {
        try {
            $streamUrl = "$ServerUrl/api/print-jobs/stream?key=$BridgeKey"
            $req = [System.Net.HttpWebRequest]::Create($streamUrl)
            $req.Method = "GET"
            $req.KeepAlive = $true
            $req.Timeout = [System.Threading.Timeout]::Infinite
            $req.ReadWriteTimeout = [System.Threading.Timeout]::Infinite
            return @{
                Request = $req
                Task = $req.GetResponseAsync()
            }
        } catch {
            return $null
        }
    }

    # Initiate first stream connection
    $init = Start-StreamConnection
    if ($init) {
        $streamReq = $init.Request
        $streamConnTask = $init.Task
    }
    $lastConnectAttempt = [DateTime]::UtcNow

    while ($listener.IsListening) {
        # Build list of active tasks to wait on
        $tasksToWait = @($contextTask)
        $streamIndex = -1

        if ($readLineTask -ne $null) {
            $streamIndex = $tasksToWait.Count
            $tasksToWait += $readLineTask
        } elseif ($streamConnTask -ne $null) {
            $streamIndex = $tasksToWait.Count
            $tasksToWait += $streamConnTask
        }

        # Wait on any task with 500ms timeout
        $completedIndex = [System.Threading.Tasks.Task]::WaitAny($tasksToWait, 500)

        # -------------------------------------------------------------
        # 1. LOCAL PC HTTP REQUEST COMPLETED
        # -------------------------------------------------------------
        if ($completedIndex -eq 0) {
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
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ready","bridge":"tvs-rp3230-lan","mode":"instant-push"}')
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

                        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [LOCAL PC] Print request ($($rawBytes.Length) bytes) -> $targetIp`:$targetPort..."
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

            # Restart local listener task
            $contextTask = $listener.GetContextAsync()
        }

        # -------------------------------------------------------------
        # 2. STREAM EVENT OR CONNECTION COMPLETED
        # -------------------------------------------------------------
        elseif ($completedIndex -eq $streamIndex -and $streamIndex -gt 0) {
            # Case A: Connection established!
            if ($streamConnTask -ne $null -and $streamConnTask.IsCompleted) {
                try {
                    if ($streamConnTask.IsFaulted) {
                        throw $streamConnTask.Exception
                    }
                    $streamResp = $streamConnTask.Result
                    $respStream = $streamResp.GetResponseStream()
                    $streamReader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
                    $readLineTask = $streamReader.ReadLineAsync()
                    $streamConnTask = $null
                    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [PUSH CHANNEL] CONNECTED! Listening for instant mobile prints.`n"
                } catch {
                    # Connection failed, cleanup and schedule reconnect
                    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [PUSH CHANNEL] Connecting to server... (Auto-retry)"
                    if ($streamResp) { try { $streamResp.Close() } catch {} }
                    $streamConnTask = $null
                    $streamResp = $null
                    $streamReader = $null
                    $readLineTask = $null
                }
            }
            # Case B: Line received on the open stream!
            elseif ($readLineTask -ne $null -and $readLineTask.IsCompleted) {
                try {
                    if ($readLineTask.IsFaulted) {
                        throw $readLineTask.Exception
                    }
                    $line = $readLineTask.Result
                    if ($line -eq $null) {
                        # End of stream (server closed connection)
                        throw "Stream closed by server"
                    }

                    # Check for data payload
                    if ($line.StartsWith("data: ")) {
                        $jsonStr = $line.Substring(6).Trim()
                        try {
                            $eventData = $jsonStr | ConvertFrom-Json
                            if ($eventData.type -eq "print_job" -and $eventData.job) {
                                $job = $eventData.job
                                $rawBytes = [System.Convert]::FromBase64String($job.escposBase64)
                                $targetIp = if ($job.printerIp) { $job.printerIp } else { "192.168.29.2" }
                                $targetPort = if ($job.printerPort) { [int]$job.printerPort } else { 9100 }

                                Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [INSTANT PUSH] Received mobile print '$($job.title)' ($($rawBytes.Length) bytes)!"
                                Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [INSTANT PUSH] Connecting to $targetIp`:$targetPort..."

                                try {
                                    Send-EscPosToPrinter $targetIp $targetPort $rawBytes
                                    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [INSTANT PUSH] SUCCESS: Printed & cut on $targetIp`:$targetPort!`n"

                                    # Notify server completed
                                    $completeUrl = "$ServerUrl/api/print-jobs/$($job.id)/complete?key=$BridgeKey"
                                    $body = @{ success = $true } | ConvertTo-Json
                                    Invoke-RestMethod -Uri $completeUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
                                } catch {
                                    $pErr = $_.Exception.Message
                                    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [INSTANT PUSH ERROR] $pErr`n"
                                    $completeUrl = "$ServerUrl/api/print-jobs/$($job.id)/complete?key=$BridgeKey"
                                    $body = @{ success = $false; error = $pErr } | ConvertTo-Json
                                    Invoke-RestMethod -Uri $completeUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
                                }
                            }
                        } catch {
                            # Not a print job JSON or keepalive
                        }
                    }

                    # Read next line asynchronously
                    $readLineTask = $streamReader.ReadLineAsync()
                } catch {
                    # Stream disconnected or error
                    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] [PUSH CHANNEL] Stream disconnected. Reconnecting in background..."
                    if ($streamResp) { try { $streamResp.Close() } catch {} }
                    $streamConnTask = $null
                    $streamResp = $null
                    $streamReader = $null
                    $readLineTask = $null
                    $lastConnectAttempt = [DateTime]::UtcNow
                }
            }
        }

        # -------------------------------------------------------------
        # 3. RECONNECT HANDLING (IF STREAM DISCONNECTED)
        # -------------------------------------------------------------
        if ($readLineTask -eq $null -and $streamConnTask -eq $null) {
            $now = [DateTime]::UtcNow
            if (($now - $lastConnectAttempt).TotalSeconds -ge 4) {
                $lastConnectAttempt = $now
                $init = Start-StreamConnection
                if ($init) {
                    $streamReq = $init.Request
                    $streamConnTask = $init.Task
                }
            }
        }
    }
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
    if ($streamResp) {
        try { $streamResp.Close() } catch {}
    }
}
