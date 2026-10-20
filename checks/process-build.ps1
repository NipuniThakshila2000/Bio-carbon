$ErrorActionPreference='Stop'
$projectRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $projectRoot 'process-build.ps1')
$fixtureRoot=Join-Path $PSScriptRoot 'process-build-fixture'
foreach($directory in @('content/original','assets','partials')){[System.IO.Directory]::CreateDirectory((Join-Path $fixtureRoot $directory))|Out-Null}
Remove-Item -LiteralPath (Join-Path $fixtureRoot 'content/process-interaction.json') -ErrorAction SilentlyContinue
[System.IO.File]::Copy((Join-Path $projectRoot 'assets/technology.png'),(Join-Path $fixtureRoot 'assets/technology.png'),$true)
[System.IO.Directory]::CreateDirectory((Join-Path $fixtureRoot 'assets/process'))|Out-Null
foreach($image in @('waste-input.png','sorting-preparation.png','shredding.png','thermal-conversion.png','resource-recovery.png','recovered-outputs.png')){
 [System.IO.File]::Copy((Join-Path $projectRoot ('assets/process/'+$image)),(Join-Path $fixtureRoot ('assets/process/'+$image)),$true)
}
[System.IO.File]::Copy((Join-Path $projectRoot 'partials/circular-process.html'),(Join-Path $fixtureRoot 'partials/circular-process.html'),$true)
$utf8=[System.Text.UTF8Encoding]::new($false)
$snapshotPath=Join-Path $fixtureRoot 'content/original/technology.txt'
$heading='QA <process>'
$stages=@(1..5|ForEach-Object {@{heading="QA state $_";explanation="Synthetic explanation $_. Not company copy.";images=@('assets/technology.png');imageryApproved=$true}})
$snapshot=$heading+"`n"+(($stages|ForEach-Object {$_.heading+"`n"+$_.explanation}) -join "`n")
[System.IO.File]::WriteAllText($snapshotPath,$snapshot,$utf8)
$baseline=@{verified=$true;sourceSnapshot='content/original/technology.txt';sourceTextSha256=(Get-FileHash $snapshotPath -Algorithm SHA256).Hash;sectionHeading=$heading;stages=$stages}|ConvertTo-Json -Depth 8
function Write-Fixture($configuration){[System.IO.File]::WriteAllText((Join-Path $fixtureRoot 'content/original-process.json'),($configuration|ConvertTo-Json -Depth 8),$utf8)}
$configuration=$baseline|ConvertFrom-Json
Write-Fixture $configuration
$markup=Get-VerifiedCircularProcess -ProjectRoot $fixtureRoot
if(-not $markup.Contains('QA &lt;process&gt;') -or -not $markup.Contains('\u003cprocess\u003e')){throw 'Unsafe section/data escaping'}
Write-Output 'PASS: exact synthetic source, five ordered stages and escaped markup.'
foreach($case in @('disabled','four-stages','paraphrase','wrong-order','wrong-hash','unapproved-image')){
 $configuration=$baseline|ConvertFrom-Json
 switch($case){
  'disabled'{$configuration.verified=$false}
  'four-stages'{$configuration.stages=@($configuration.stages[0..3])}
  'paraphrase'{$configuration.stages[1].explanation='A paraphrase that does not occur in the source.'}
  'wrong-order'{$configuration.stages=@($configuration.stages[1],$configuration.stages[0],$configuration.stages[2],$configuration.stages[3],$configuration.stages[4])}
  'wrong-hash'{$configuration.sourceTextSha256='invalid'}
  'unapproved-image'{$configuration.stages[0].imageryApproved=$false}
 }
 Write-Fixture $configuration
 $rejected=$false
 try{$result=Get-VerifiedCircularProcess -ProjectRoot $fixtureRoot;if($case -eq 'disabled' -and -not $result){$rejected=$true}}catch{$rejected=$true}
 if(-not $rejected){throw "Gate did not reject $case"}
 Write-Output "PASS: gate rejects $case."
}
Write-Output 'All source-gate tests passed with synthetic data only; no original-company verification is implied.'

# Verify the current, explicitly illustrative six-state interaction separately
# from the unverified original-source content gate.
Remove-Item -LiteralPath (Join-Path $fixtureRoot 'content/original-process.json') -ErrorAction SilentlyContinue
$interaction=Get-Content (Join-Path $projectRoot 'content/process-interaction.json') -Raw | ConvertFrom-Json
[System.IO.File]::WriteAllText((Join-Path $fixtureRoot 'content/process-interaction.json'),($interaction|ConvertTo-Json -Depth 10),$utf8)
$markup=Get-VerifiedCircularProcess -ProjectRoot $fixtureRoot
foreach($expected in @('OUR TRANSFORMATION PROCESS','See How Waste Becomes Value','Waste Input','Sorting \u0026 Preparation','Shredding','Thermal Conversion','Resource Recovery','Valuable Outputs','assets/process/waste-input.png','assets/process/sorting-preparation.png','assets/process/resource-recovery.png')){if(-not $markup.Contains($expected)){throw "Illustrative interaction missing $expected"}}
Write-Output 'PASS: six illustrative states, exact requested section text and supplied local process photos.'
foreach($case in @('five-states','missing-visual-brief','missing-image')){
 $interaction=Get-Content (Join-Path $projectRoot 'content/process-interaction.json') -Raw | ConvertFrom-Json
 switch($case){'five-states'{$interaction.stages=@($interaction.stages[0..4])};'missing-visual-brief'{$interaction.stages[0].visualBrief=''};'missing-image'{$interaction.stages[3].images=@('assets/missing.png')}}
 [System.IO.File]::WriteAllText((Join-Path $fixtureRoot 'content/process-interaction.json'),($interaction|ConvertTo-Json -Depth 10),$utf8)
 $rejected=$false;try{$null=Get-VerifiedCircularProcess -ProjectRoot $fixtureRoot}catch{$rejected=$true}
 if(-not $rejected){throw "Illustrative configuration accepted invalid case $case"}
 Write-Output "PASS: illustrative interaction rejects $case."
}
