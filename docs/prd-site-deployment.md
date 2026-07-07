# PRD Site Deployment Guide

This guide explains how to publish PRD pages to `https://prd.cofeplus.dpdns.org`.

## What This Site Is

The PRD site is a separate Cloudflare Pages direct-upload project:

- Project name: `cofeplus-prd`
- Public domain: `https://prd.cofeplus.dpdns.org`
- Deploy source: `prd-site/`
- Source PRDs: `tasks/`

Important: pushing GitHub `main` updates the production app, but it does not update the PRD site. The PRD site only changes after uploading `prd-site/` with Wrangler.

Do not use `npx wrangler deploy` for this site. Use `wrangler pages deploy`.

## Standard Flow

1. Confirm the updated PRD source files in `tasks/`.

   Typical files:

   ```bash
   tasks/<prd-slug>.md
   tasks/<prd-slug>.html
   ```

2. Run the relevant PRD regression test when one exists.

   Example:

   ```bash
   node --test tests/prd-staff-management-user-flow-html.test.js
   ```

3. Sync the updated PRD into the ignored upload bundle.

   ```bash
   mkdir -p prd-site/tasks
   cp tasks/<prd-slug>.html prd-site/tasks/<prd-slug>.html
   cp tasks/<prd-slug>.md prd-site/tasks/<prd-slug>.md
   ```

   If the PRD has only an HTML artifact, copying only the HTML is acceptable. Prefer standalone HTML PRDs with screenshots inlined as `data:image/...` so the PRD domain does not depend on separate screenshot files.

4. Verify the upload bundle before deploying.

   ```bash
   node - <<'NODE'
   const fs = require('fs');
   const file = 'prd-site/tasks/<prd-slug>.html';
   const html = fs.readFileSync(file, 'utf8');
   const images = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
   console.log({
     file,
     images: images.length,
     dataImages: images.filter(src => src.startsWith('data:image/')).length,
     externalScreenshots: html.includes('src="../screenshots/'),
   });
   NODE
   ```

   For standalone PRD HTML, `externalScreenshots` should normally be `false`.

5. Confirm Cloudflare auth.

   ```bash
   npx wrangler whoami
   ```

6. Deploy `prd-site/`.

   ```bash
   npx wrangler pages deploy prd-site --project-name cofeplus-prd --branch main --commit-dirty=true
   ```

   Wrangler will print a preview URL like `https://<hash>.cofeplus-prd.pages.dev`. That confirms the upload completed, but the final verification should use the custom domain.

7. Verify the custom-domain URL.

   ```bash
   PRD_URL="https://prd.cofeplus.dpdns.org/tasks/<prd-slug>?verify=$(date +%Y%m%d%H%M%S)"
   curl -fsSL "$PRD_URL" >/tmp/prd-page.html
   ```

   Then check expected content:

   ```bash
   rg "expected PRD title or unique phrase" /tmp/prd-page.html
   ```

   For HTML image checks:

   ```bash
   node - <<'NODE'
   const fs = require('fs');
   const html = fs.readFileSync('/tmp/prd-page.html', 'utf8');
   const images = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
   console.log({
     images: images.length,
     dataImages: images.filter(src => src.startsWith('data:image/')).length,
     externalScreenshots: html.includes('src="../screenshots/'),
   });
   NODE
   ```

## Commit And Push

Tracked PRD source changes should be committed and pushed to `main`:

```bash
git add tasks/<prd-slug>.md tasks/<prd-slug>.html tests/<relevant-test>.js
git commit -m "docs(prd): update <topic> PRD"
git push origin main
```

`prd-site/` is ignored by Git, so it will not appear in commits. It is only the upload bundle for Cloudflare Pages.

If `git push` is rejected because remote `main` moved, fetch and rebase before pushing:

```bash
git fetch origin main
git rebase origin/main
node --test tests/<relevant-test>.js
git push origin main
```

## Common Mistakes

- Do not assume a GitHub `main` push updates `prd.cofeplus.dpdns.org`.
- Do not deploy the repo root for the PRD site; deploy `prd-site/`.
- Do not use `npx wrangler deploy`; use `npx wrangler pages deploy`.
- Do not confuse the production app domain `https://cofeplus.pages.dev` with the PRD domain.
- Do not leave standalone PRD HTML pointing at `../screenshots/...` unless those assets are also copied into `prd-site/`.

## Troubleshooting

If `npx wrangler` fails with an `ENOTEMPTY` rename error under `~/.npm/_npx`, the local npx cache is corrupt. Move the broken cache directory aside and retry:

```bash
mv ~/.npm/_npx/<broken-id> ~/.npm/_npx/<broken-id>.broken-$(date +%Y%m%d%H%M%S)
npx wrangler --version
```

If Wrangler is not authenticated, either set `CLOUDFLARE_API_TOKEN` or run:

```bash
npx wrangler login
```

If an agent runs in a restricted sandbox and deployment network calls fail, rerun the Wrangler command with network access enabled.
