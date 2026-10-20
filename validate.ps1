$ErrorActionPreference='Stop'
$root=$PSScriptRoot
& (Join-Path $root 'build.ps1') -Check
$slugs=@('','about','technology','products','projects','partnerships','contact','privacy')
$titles=@();$descriptions=@();$count=0
foreach($slug in $slugs){
 $file=if($slug){Join-Path $root ($slug+'/index.html')}else{Join-Path $root 'index.html'}
 $html=[System.IO.File]::ReadAllText($file)
 if(([regex]::Matches($html,'<h1[ >]')).Count -ne 1){throw "Expected one h1 in $file"}
 if($html.Contains('{{')){throw "Unresolved template in $file"}
 if($html -match 'id="details"'){throw "Old dialog in $file"}
 $titles+=([regex]::Match($html,'<title>(.*?)</title>')).Groups[1].Value
 $descriptions+=([regex]::Match($html,'name="description" content="([^"]+)"')).Groups[1].Value
 $ids=@([regex]::Matches($html,'\bid="([^"]+)"')|ForEach-Object{$_.Groups[1].Value})
 if(($ids | Group-Object | Where-Object {$_.Count -gt 1})){throw "Duplicate IDs in $file"}
 $current=[regex]::Matches($html,'aria-current="page"')
 $expectedCurrent=if($slug -in @('privacy','contact')){0}else{2}
 if($current.Count -ne $expectedCurrent){throw "Unexpected active header/footer navigation in $file"}
 foreach($match in [regex]::Matches($html,'(?:href|src)="([^"]+)"')){
  $link=$match.Groups[1].Value
  if($link -match '^(?:mailto:|https?:|data:)'){continue}
  if($link.StartsWith('#')){if($link.Substring(1) -notin $ids){throw "Missing anchor $link in $file"};continue}
  if($link.StartsWith('/')){throw "Root-relative local path $link in $file"}
  $pathPart=($link -split '[?#]',2)[0]
  $fragment=if($link.Contains('#')){($link -split '#',2)[1]}else{''}
  $resolved=[System.Uri]::new([System.Uri]::new($file),[System.Net.WebUtility]::HtmlDecode($pathPart))
  $target=$resolved.LocalPath
  if(Test-Path -LiteralPath $target -PathType Container){$target=Join-Path $target 'index.html'}
  if(-not(Test-Path -LiteralPath $target -PathType Leaf)){throw "Missing local target $link in $file"}
  if($fragment){$targetHtml=[System.IO.File]::ReadAllText($target);if(-not $targetHtml.Contains('id="'+$fragment+'"')){throw "Missing destination anchor $link"}}
  $count++
 }
 foreach($img in [regex]::Matches($html,'<img\b[^>]*>')){if($img.Value -notmatch '\balt="[^"]+"'){throw "Missing descriptive image alt in $file"}}
}
if(($titles|Select-Object -Unique).Count -ne $slugs.Count -or ($descriptions|Select-Object -Unique).Count -ne $slugs.Count){throw 'SEO titles/descriptions must be unique'}
foreach($cssFile in @('styles.css','inner.css','circular-process.css')){
 $css=[System.IO.File]::ReadAllText((Join-Path $root $cssFile))
 if(([regex]::Matches($css,'\{')).Count -ne ([regex]::Matches($css,'\}')).Count){throw "Unbalanced CSS in $cssFile"}
}
Write-Output "PASS: $($slugs.Count) routes, SEO, navigation state, headings, IDs, image descriptions, CSS braces and $count local references. Content authenticity remains unverified."
