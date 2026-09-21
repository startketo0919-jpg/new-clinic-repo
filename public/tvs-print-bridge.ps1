# TVS & ESC/POS LAN Thermal Printer Bridge
# Listens on http://127.0.0.1:9101/
# Forwards raw ESC/POS binary data to raw TCP socket (e.g. 192.168.29.2:9100) with ZERO HTTP headers

param(
    [int]$ListenPort = 9101
)

$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$ListenPort/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Output "=================================================="
    Write-Output "  Clinic Thermal Printer Bridge (TVS-E RP 3230)  "
    Write-Output "=================================================="
    Write-Output "Listening for print jobs on: $prefix"
    Write-Output "Ready! Keep this window open while printing."
    Write-Output "Press Ctrl+C to stop.`n"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers to allow app.drsunilkumarbhms.in to send print requests
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        if ($request.HttpMethod -eq "GET") {
            $response.ContentType = "application/json"
            $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ready","bridge":"tvs-rp3230-lan"}')
            $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            $response.Close()
            continue
        }

        if ($request.HttpMethod -eq "POST" -and $request.Url.AbsolutePath -eq "/print") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyText = $reader.ReadToEnd()
                $json = $bodyText | ConvertFrom-Json

                $targetIp = if ($json.printerIp) { $json.printerIp } else { "192.168.29.2" }
                $targetPort = if ($json.printerPort) { [int]$json.printerPort } else { 9100 }
                $rawBytes = [System.Convert]::FromBase64String($json.escposBase64)

                Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Received print job ($($rawBytes.Length) bytes) -> Connecting to $targetIp`:$targetPort..."

                $tcpClient = New-Object System.Net.Sockets.TcpClient
                $connectTask = $tcpClient.ConnectAsync($targetIp, $targetPort)
                
                # Timeout after 4 seconds if printer is unreachable
                if (-not $connectTask.Wait(4000)) {
                    throw "Connection to printer $targetIp`:$targetPort timed out. Please check LAN cable."
                }

                $stream = $tcpClient.GetStream()
                $stream.Write($rawBytes, 0, $rawBytes.Length)
                $stream.Flush()
                
                # Small 250ms delay to let hardware cutter cycle finish
                Start-Sleep -Milliseconds 250

                $stream.Close()
                $tcpClient.Close()

                Write-Output "[$(Get-Date -Format 'HH:mm:ss')] SUCCESS: Print job sent & cutter fired on $targetIp`:$targetPort!`n"

                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Printed and cut successfully"}')
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            } catch {
                $errMsg = $_.Exception.Message
                Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ERROR: $errMsg`n"
                $response.StatusCode = 500
                $response.ContentType = "application/json"
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes("{`"success`":false,`"error`":`"$errMsg`"}")
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            } finally {
                $response.Close()
            }
        } else {
            $response.StatusCode = 404
            $response.Close()
        }
    }
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
}
