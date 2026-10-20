param([switch]$Check,[switch]$Release)
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$utf8=[System.Text.UTF8Encoding]::new($false)
function Read-Source([string]$relative){[System.IO.File]::ReadAllText((Join-Path $root $relative))}
. (Join-Path $root 'process-build.ps1')
$sourceStatus=(Read-Source 'content/source-status.json')|ConvertFrom-Json
if($Release -and ($sourceStatus.releaseApproved -ne $true -or @($sourceStatus.pages|Where-Object {$_.verified -ne $true}).Count)){
 throw 'Content release blocked: original wording has not been verified. See content-audit/report.html.'
}
$circularProcess=Get-VerifiedCircularProcess -ProjectRoot $root
if($Release -and -not $circularProcess){throw 'Circular process release blocked: the five original stages and imagery are not verified.'}
$routes=@(
 @{slug='';label='Home';file='home';title='BCF Lanka — Waste. Reimagined.';description='A new purpose for waste. Explore BCF Lanka''s approach to resource recovery, thermal conversion and a circular future for Sri Lanka.'},
 @{slug='about';label='About';file='about';title='About BCF Lanka — A Shared Purpose';description='Discover BCF Lanka''s purpose, environmental mission and approach to recovering value from non-recyclable waste in Sri Lanka.'},
 @{slug='technology';label='Our Technology';file='technology';title='Our Technology — BCF Lanka';description='Explore waste preparation, pyrolysis, resource recovery and reuse, and learn how suitable materials can become useful products.'},
 @{slug='products';label='Products';file='products';title='Recovered Products — BCF Lanka';description='Explore pyrolysis oil, recovered gas and recovered char, their characteristics and potential industrial applications.'},
 @{slug='projects';label='Projects';file='projects';title='Projects & Lindel Industrial Park — BCF Lanka';description='Explore BCF Lanka''s resource-recovery project focus at Lindel Industrial Park in Sri Lanka and request current project information.'},
 @{slug='partnerships';label='Partnerships';file='partnerships';title='Partnership Opportunities — BCF Lanka';description='Explore opportunities for waste generators, industrial customers, investors and project partners to connect with BCF Lanka.'},
 @{slug='contact';label='Contact';file='contact';title='Contact BCF Lanka — Start a Conversation';description='Contact BCF Lanka about materials, recovered products, technology, project information and partnerships. Prepare an enquiry email.'},
 @{slug='privacy';label='Privacy';file='privacy';title='Privacy Notice — BCF Lanka';description='Learn how the BCF Lanka website handles enquiry information, email preparation, browser storage and hosting.'}
)
$cta='<section class="contact wide inner-cta"><div><p class="eyebrow">LET''S BUILD SOMETHING BETTER</p><h2>The next chapter starts<br>with a conversation.</h2></div><div><p>Bring us your waste challenge, industrial fuel requirements, or project opportunity.</p><div class="actions"><a class="button" href="/contact">Talk to our team <span>&rarr;</span></a></div></div></section>'

foreach($route in $routes){
 $nav=(@($routes | Where-Object {$_.slug -ne 'privacy' -and $_.slug -ne 'contact'} | ForEach-Object {
  $url=if($_.slug){'/'+$_.slug}else{'/'}
  $active=if($_.slug -eq $route.slug){' aria-current="page"'}else{''}
  '<a href="'+$url+'"'+$active+'>'+ $_.label+'</a>'
 })) -join ''
 $header=(Read-Source 'partials/header.html').Replace('{{NAV}}',$nav)
 $footer=(Read-Source 'partials/footer.html').Replace('{{NAV}}',$nav)
 $body=(Read-Source ('pages/'+$route.file+'.html')).Replace('{{CTA}}',$cta).Replace('{{CIRCULAR_PROCESS}}',[string]$circularProcess)
 $processAssets=if(-not $route.slug -and $circularProcess){'<link rel="stylesheet" href="/circular-process.css"><script src="/circular-process.js" defer></script>'}else{''}
 $title=[System.Net.WebUtility]::HtmlEncode($route.title)
 $description=[System.Net.WebUtility]::HtmlEncode($route.description)
 $pageClass=if($route.slug){'inner-page page-'+$route.slug}else{'home-page'}
 $html=@"
<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="$description"><meta name="theme-color" content="#003f34"><meta property="og:type" content="website"><meta property="og:title" content="$title"><meta property="og:description" content="$description"><title>$title</title><link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png"><link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png"><link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/inner.css"><script src="/script.js" defer></script></head><body class="$pageClass">$header<main id="main-content">$body</main>$footer</body></html>
"@
 $html=$html.Replace('</head>',$processAssets+'</head>')
 # Resolve from the document, not the drive/domain root. This supports both
 # direct file previews and deployment under a directory prefix.
 $prefix=if($route.slug){'../'}else{'./'}
 $html=[regex]::Replace($html,'(?<attr>\b(?:href|src))="/(?<path>(?!/)[^"]*)"',{
  param($match)
  $local=$match.Groups['path'].Value
  $pieces=[regex]::Match($local,'^([^?#]*)(.*)$')
  $pathname=$pieces.Groups[1].Value
  $suffix=$pieces.Groups[2].Value
  if($pathname -and -not [System.IO.Path]::GetExtension($pathname) -and -not $pathname.EndsWith('/')){$pathname+='/' }
  return $match.Groups['attr'].Value+'="'+$prefix+$pathname+$suffix+'"'
 })
 $target=if($route.slug){Join-Path $root ($route.slug+'/index.html')}else{Join-Path $root 'index.html'}
 if($Check){if(-not(Test-Path -LiteralPath $target) -or [System.IO.File]::ReadAllText($target) -cne $html){throw "Generated page is stale: $target"}}
 else{[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null;[System.IO.File]::WriteAllText($target,$html,$utf8)}
}
Write-Output "PASS: $($routes.Count) pages $(if($Check){'match their sources'}else{'built successfully'})."
