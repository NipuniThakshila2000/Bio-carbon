param([int]$Port=4173)
$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath($PSScriptRoot)
$listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
$listener.Start()
Write-Output "BCF LANKA: http://localhost:$Port (Ctrl+C to stop)"
$types=@{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.png'='image/png';'.svg'='image/svg+xml';'.jpg'='image/jpeg';'.webp'='image/webp';'.ico'='image/x-icon'}
try {
 while($true){
  $client=$listener.AcceptTcpClient()
  $client.ReceiveTimeout=3000
  $stream=$client.GetStream()
  try {
   $reader=[System.IO.StreamReader]::new($stream,[System.Text.Encoding]::ASCII,$false,1024,$true)
   $request=$reader.ReadLine()
   if(-not $request){continue}
   $parts=$request.Split(' ')
   while($reader.ReadLine()){}
   $method=$parts[0]
   $relative=[System.Uri]::UnescapeDataString(($parts[1] -split '\?',2)[0]).TrimStart('/')
   $target=[System.IO.Path]::GetFullPath((Join-Path $root $relative))
   $status='200 OK'
   if($target -ne $root -and -not $target.StartsWith($root+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)){$status='403 Forbidden';$target=Join-Path $root '404.html'}
   elseif(Test-Path -LiteralPath $target -PathType Container){
    # A directory document must have a trailing slash before relative assets load.
    $urlParts=$parts[1] -split '\?',2
    if(-not $urlParts[0].EndsWith('/')){
     $location=$urlParts[0]+'/'
     if($urlParts.Count -gt 1){$location+='?'+$urlParts[1]}
     $redirect=[System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 301 Moved Permanently`r`nLocation: $location`r`nContent-Length: 0`r`nConnection: close`r`n`r`n")
     $stream.Write($redirect,0,$redirect.Length)
     continue
    }
    $target=Join-Path $target 'index.html'
   }
   if(-not(Test-Path -LiteralPath $target -PathType Leaf)){$status='404 Not Found';$target=Join-Path $root '404.html'}
   if($method -notin @('GET','HEAD')){$status='405 Method Not Allowed';$target=Join-Path $root '404.html'}
   $extension=[System.IO.Path]::GetExtension($target).ToLowerInvariant()
   $mime=if($types.ContainsKey($extension)){$types[$extension]}else{'application/octet-stream'}
   $bytes=[System.IO.File]::ReadAllBytes($target)
   $header="HTTP/1.1 $status`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
   $headerBytes=[System.Text.Encoding]::ASCII.GetBytes($header)
   $stream.Write($headerBytes,0,$headerBytes.Length)
   if($method -ne 'HEAD'){$stream.Write($bytes,0,$bytes.Length)}
  }catch{Write-Warning $_.Exception.Message}
  finally{$stream.Dispose();$client.Close()}
 }
}finally{$listener.Stop()}
