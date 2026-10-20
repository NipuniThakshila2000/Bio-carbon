param([string]$Origin='http://localhost:4173')
$ErrorActionPreference='Stop'
$slugs=@('','about','technology','products','projects','partnerships','contact','privacy')
$seen=@{};$checked=0
foreach($slug in $slugs){
 $url=$Origin+'/'+$slug
 # Make a fresh document request twice, including the extensionless direct URL.
 foreach($visit in 1..2){
  $page=Invoke-WebRequest $url -UseBasicParsing
  if($page.StatusCode -ne 200 -or $page.Headers['Content-Type'] -notmatch '^text/html'){throw "Bad document $url"}
  $document=$page.BaseResponse.ResponseUri
  if($slug -and -not $document.AbsolutePath.EndsWith('/')){throw "Missing directory redirect $url"}
  foreach($match in [regex]::Matches($page.Content,'<(?:link|script|img)\b[^>]*\b(?:src|href)="([^"]+)"')){
   $asset=[System.Uri]::new($document,$match.Groups[1].Value)
   if($seen.ContainsKey($asset.AbsoluteUri)){continue}
   $response=Invoke-WebRequest $asset.AbsoluteUri -UseBasicParsing
   if($response.StatusCode -ne 200){throw "Asset failed: $asset"}
   $extension=[System.IO.Path]::GetExtension($asset.AbsolutePath)
   $expected=switch($extension){'.css'{'text/css'} '.js'{'text/javascript'} '.png'{'image/png'} '.svg'{'image/svg+xml'} default{throw "Unexpected resource: $asset"}}
   if(-not $response.Headers['Content-Type'].StartsWith($expected)){throw "Wrong MIME for $asset : $($response.Headers['Content-Type'])"}
   if($extension -eq '.css'){
    foreach($background in [regex]::Matches($response.Content,'url\([''"]?([^''")]+)')){
     $image=[System.Uri]::new($asset,$background.Groups[1].Value)
     $imageResponse=Invoke-WebRequest $image.AbsoluteUri -UseBasicParsing
     if($imageResponse.StatusCode -ne 200 -or $imageResponse.Headers['Content-Type'] -notmatch '^image/'){throw "Broken CSS image: $image"}
     $checked++
    }
   }
   $seen[$asset.AbsoluteUri]=$true;$checked++
  }
 }
 Write-Output "PASS: direct visit + refresh + linked assets /$slug"
}
$query=Invoke-WebRequest ($Origin+'/contact?topic=Pyrolysis%20oil') -UseBasicParsing
if($query.BaseResponse.ResponseUri.AbsolutePath -ne '/contact/' -or $query.BaseResponse.ResponseUri.Query -notmatch 'topic=Pyrolysis'){throw 'Query was lost during redirect'}
try{Invoke-WebRequest ($Origin+'/not-a-real-bcf-page') -UseBasicParsing | Out-Null;throw 'Missing real 404'}catch{if($_.Exception.Response.StatusCode.value__ -ne 404){throw}}
Write-Output "PASS: $checked asset/background requests, correct MIME types, query-preserving directory redirects, refreshes and real 404."
