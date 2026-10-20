# Bio-carbon

BCF LANKA is a static, eight-page website. The visible copy was adapted from [the BCF LANKA reference site](https://bcf-lanka.netlify.app/) while retaining this site's design. The homepage also includes a five-stage circular process viewer.

## Development

- Edit `pages/*.html`, `partials/*.html`, `content/process-interaction.json`, and the CSS or JavaScript files.
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1` to regenerate the published HTML pages.
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\validate.ps1` to check routes, links, headings, metadata, and local assets.
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1` to preview at `http://localhost:4173`.

The generated `index.html` and route folders are committed so the site can be deployed without a build step. Vercel and Netlify can serve this directory as a static site. The contact form prepares an email draft; it does not send or store enquiries on a server.

The content audit in `content-audit/` predates the October 2026 reference fetch. Its release gate has not been updated to certify every adapted phrase or image, although the current site builds and passes structural validation.
