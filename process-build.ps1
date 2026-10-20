# Called by build.ps1. No process copy is supplied by this module.
function Get-VerifiedCircularProcess {
 param([string]$ProjectRoot)
 $illustrativePath=Join-Path $ProjectRoot 'content/process-interaction.json'
 $originalPath=Join-Path $ProjectRoot 'content/original-process.json'
 $illustrative=if(Test-Path -LiteralPath $illustrativePath){[System.IO.File]::ReadAllText($illustrativePath)|ConvertFrom-Json}else{$null}
 $original=if(Test-Path -LiteralPath $originalPath){[System.IO.File]::ReadAllText($originalPath)|ConvertFrom-Json}else{$null}
 # Prefer verified source copy whenever supplied; the illustrative sequence is
 # only a development fallback and must never override the verified process.
 $configuration=if($original -and $original.verified -eq $true){$original}else{$illustrative}
 if(-not $configuration){return $null}
 # The homepage interaction is explicitly illustrative, not a transcript of
 # the unavailable source site's technical process. Keep the user-supplied
 # five-stage sequence separate from the original-copy release gate.
 if($configuration.mode -eq 'illustrative'){
  if(@($configuration.stages).Count -ne 5){throw 'Circular interaction requires five stages.'}
  foreach($stage in $configuration.stages){
   if(-not $stage.heading -or -not $stage.explanation -or -not $stage.visualBrief){throw 'Illustrative process state is incomplete.'}
   foreach($image in @($stage.images)){
    if($image -notmatch '^assets/[^?]+\.(png|jpg|jpeg|webp)$' -or -not(Test-Path -LiteralPath (Join-Path $ProjectRoot $image) -PathType Leaf)){throw 'Illustrative stage image must be an existing local asset.'}
   }
  }
  $partial=[System.IO.File]::ReadAllText((Join-Path $ProjectRoot 'partials/circular-process.html'))
  $slash=[string][char]92; $json=($configuration|ConvertTo-Json -Depth 10 -Compress).Replace('<',($slash+'u003c')).Replace('>',($slash+'u003e')).Replace('&',($slash+'u0026'))
  return $partial.Replace('{{PROCESS_OVERLINE}}',[System.Net.WebUtility]::HtmlEncode($configuration.overline)).Replace('{{PROCESS_HEADING}}',[System.Net.WebUtility]::HtmlEncode($configuration.heading)).Replace('{{PROCESS_SUBTITLE}}',[System.Net.WebUtility]::HtmlEncode($configuration.subtitle)).Replace('{{PROCESS_DATA}}',$json)
 }
 if($configuration.verified -ne $true){return $null}
 $snapshot=Join-Path $ProjectRoot $configuration.sourceSnapshot
 if(-not(Test-Path -LiteralPath $snapshot -PathType Leaf)){throw 'Missing original Technology source snapshot.'}
 if((Get-FileHash -LiteralPath $snapshot -Algorithm SHA256).Hash -ne $configuration.sourceTextSha256){throw 'Original Technology source checksum mismatch.'}
 $original=[System.IO.File]::ReadAllText($snapshot)
 if(-not $configuration.sectionHeading -or -not $original.Contains($configuration.sectionHeading)){throw 'Circular section heading is not verbatim original text.'}
 if(@($configuration.stages).Count -ne 5){throw 'Exactly five original process stages are required.'}
 $cursor=0
 foreach($stage in $configuration.stages){
  if(-not $stage.heading -or -not $stage.explanation){throw 'Missing original stage heading or explanation.'}
  $headingIndex=$original.IndexOf($stage.heading,$cursor,[System.StringComparison]::Ordinal)
  if($headingIndex -lt 0){throw 'Original stage heading missing or out of order.'}
  $descriptionIndex=$original.IndexOf($stage.explanation,$headingIndex+$stage.heading.Length,[System.StringComparison]::Ordinal)
  if($descriptionIndex -lt 0){throw 'Stage explanation is not verbatim original text in published order.'}
  $cursor=$descriptionIndex+$stage.explanation.Length
  if($stage.imageryApproved -ne $true -or -not @($stage.images).Count){throw 'Stage imagery approval is missing.'}
  foreach($image in $stage.images){
   if($image -notmatch '^assets/[^?]+\.(png|jpg|jpeg|webp)$' -or -not(Test-Path -LiteralPath (Join-Path $ProjectRoot $image) -PathType Leaf)){throw 'Stage image must be an approved local asset.'}
  }
 }
 $partial=[System.IO.File]::ReadAllText((Join-Path $ProjectRoot 'partials/circular-process.html'))
 $ui=if($illustrative){$illustrative}else{@{overline='OUR TRANSFORMATION PROCESS';subtitle=''}}
 $configuration|Add-Member -NotePropertyName mode -NotePropertyValue 'verified' -Force
 $slash=[string][char]92; $json=($configuration|ConvertTo-Json -Depth 10 -Compress).Replace('<',($slash+'u003c')).Replace('>',($slash+'u003e')).Replace('&',($slash+'u0026'))
 return $partial.Replace('{{PROCESS_OVERLINE}}',[System.Net.WebUtility]::HtmlEncode([string]$ui.overline)).Replace('{{PROCESS_HEADING}}',[System.Net.WebUtility]::HtmlEncode($configuration.sectionHeading)).Replace('{{PROCESS_SUBTITLE}}',[System.Net.WebUtility]::HtmlEncode([string]$ui.subtitle)).Replace('{{PROCESS_DATA}}',$json)
}
