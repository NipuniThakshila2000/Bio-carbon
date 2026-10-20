$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$utf8=[System.Text.UTF8Encoding]::new($false)
$directory=Join-Path $PSScriptRoot 'current'
[System.IO.Directory]::CreateDirectory($directory)|Out-Null
$entries=@()
foreach($slug in @('','about','technology','products','projects','partnerships','contact','privacy')){
 $file=if($slug){Join-Path $root ($slug+'/index.html')}else{Join-Path $root 'index.html'}
 $html=[System.IO.File]::ReadAllText($file)
 $body=[regex]::Match($html,'(?s)<body\b[^>]*>(.*?)</body>').Groups[1].Value
 $body=[regex]::Replace($body,'(?s)<(script|style|svg)\b[^>]*>.*?</\1>','')
 $body=[regex]::Replace($body,'</(?:p|h[1-6]|a|li|label|option|button|section|div)>|<br\s*/?>',"`n")
 $body=[regex]::Replace($body,'<[^>]+>','')
 $text=[System.Net.WebUtility]::HtmlDecode($body)
 $text=($text -split '\r?\n'|ForEach-Object {$_.Trim()}|Where-Object {$_}) -join "`n"
 $name=if($slug){$slug}else{'home'}
 $textPath=Join-Path $directory ($name+'.txt')
 [System.IO.File]::WriteAllText($textPath,$text,$utf8)
 $entries+=@{route=('/'+$(if($slug){$slug+'/'}else{''}));sourceUrl=('https://bcf-lanka.netlify.app/'+$(if($slug){$slug+'/'}else{''}));sourceAccess='unavailable';originalText=$null;comparison='blocked';currentHtmlSha256=(Get-FileHash $file -Algorithm SHA256).Hash;inventorySha256=(Get-FileHash $textPath -Algorithm SHA256).Hash;currentText=$text}
}
$report=@{status='not-verified';inventoryMethod='Local HTML text extraction; not an original-source capture or a rendered sentence-level comparison';pages=$entries;originalProcessStagesVerified=$false;originalProcessStages=@();remainingApproval=@('All eight original page texts','Original five-stage Technology process','Incoming waste imagery and stage mapping','Privacy wording versus existing form behaviour','Original navigation, footer and copyright')}
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'current-inventory.json'),($report|ConvertTo-Json -Depth 8),$utf8)
Write-Output 'Audit inventory created for eight current pages. Exact original-text comparison remains blocked.'
