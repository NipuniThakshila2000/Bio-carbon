# BCF LANKA verification log — 2026-10-16

## Result

**Not content-verified and not ready for release.** The original site is the required source of truth, but none of its eight requested routes could be retrieved during this verification. No original copy or five-stage process was reconstructed from guesses.

## Source access attempts

Attempted the homepage, `/technology/`, `sitemap.xml`, and `robots.txt` through the web reader and direct HTTPS requests. Direct requests returned “Unable to connect to the remote server”; the web reader reported that the pages were not accessible. Also tried an exact-domain search and alternate text-reader URL; they did not yield source content. Search results did not expose an indexed copy of the original site. This does not establish whether the website is available from the client's network.

The routes still requiring original copy are `/`, `/about/`, `/technology/`, `/products/`, `/projects/`, `/partnerships/`, `/contact/`, and `/privacy/`. The detailed page-by-page list of generated text and known discrepancies is in [report.html](report.html). The local `current/*.txt` files inventory this project's current text only; they are not original-source captures.

## Circular process

The homepage has an insertion point between the Technology and Products sections, and the circular drag component is implemented behind a source-verification gate. It is currently not rendered. `content/original-process.json` has no stages and remains `verified: false`. The requested five published stage names, explanations, qualifications, order, and suitable approved imagery are unverified. The supplied process equipment illustration does not establish an actual operating BCF LANKA facility. Synthetic stages are used only in the isolated QA fixture.

## Checks run

- `./build.ps1 -Check` — passed; all 8 generated route files match their templates.
- `./validate.ps1` — passed; 8 routes, navigation, metadata, headings, image alt text, CSS syntax balance and 253 local references. The validator explicitly does not verify content authenticity.
- `./checks/process-build.ps1` — passed with synthetic data; verifies that the process gate rejects disabled/unverified source, four stages, paraphrased text, wrong order, checksum mismatch and unapproved imagery. This is gate testing, not verification of BCF LANKA copy.
- `./build.ps1 -Release` — correctly blocked because original wording is unverified.

## Needed to finish

Please provide an export or readable copy of all eight original pages and, for the process section, its exact heading and all five stage headings/descriptions in published order. If the images that accompany those stages are part of the original site, include the corresponding asset files or identify them in the export. Once available, the page copy can be compared verbatim, the audit updated, and the circular animation enabled with verified content.

## Six-state homepage interaction update

The latest request explicitly authorized a six-stage **illustrative** sequence and supplied its headings and section copy. The homepage now includes that interaction between Technology and Products; it is not labelled as the verified original process. Its concise supporting text stays within the provided examples and existing product names. Existing `technology.png` is reused for the thermal-conversion and resource-recovery states (with separate crops); the final state uses the existing oil, gas, and char assets.

There are no matching local images for waste input, sorting/preparation, or shredding. The viewer explicitly identifies each required visual in those states instead of presenting a different facility image as evidence of those operations. Needed assets: (1) discarded plastic bottles, packaging, and used tyres; (2) industrial sorting and material preparation; (3) industrial equipment shredding prepared plastic waste. These are the remaining visual gaps in the requested interaction.

Current checks: the 8-route build, generated-file check, site validator, HTTP route/refresh/asset test, and process-build tests pass. The process-build tests include the six-state config, missing-image rejection, one circle/marker structure in the QA fixture, and existing image mappings. A headless Edge interaction run could not be completed in this environment: Edge's GPU process exits with an access-denied status before emitting a DOM snapshot. Thus mouse/touch/keyboard runtime checks are not claimed as passed here; the isolated browser fixture is ready at `checks/circular-runner.html` for a normal browser session. No live Netlify deploy was performed.
