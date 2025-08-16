# moshano.in — static site

Modern, minimalist site for **moshano technologies** (payment gateway).

## Local preview
Open `index.html` in a browser, or serve with any static server.

## Deploy to GitHub Pages
1. Create a new repo on GitHub, e.g. `moshano-in` under your account.
2. Add these files to the repo root (keep `CNAME` as `moshano.in`).
3. Commit & push to the `main` branch.
4. In **Settings → Pages**, set **Source** to **Deploy from a branch** and pick `main` / root.
5. Wait for the build to finish. Pages will serve your site.

### DNS for apex domain (`moshano.in`)
Point the following **A records** to GitHub Pages IPs at your DNS provider:
```
@  A  185.199.108.153
@  A  185.199.109.153
@  A  185.199.110.153
@  A  185.199.111.153
```
Optionally, add a `www` CNAME:
```
www  CNAME  yourusername.github.io
```

> Keep the `CNAME` file (with `moshano.in`) in the repo so GitHub recognizes the custom domain.

## Customize
- Update pricing in `index.html` → `#pricing`.
- Replace contact email/phone in `#contact` section.
- Swap the logo in `assets/img/logo.svg` if you have a brand mark.
- Flesh out `privacy.html` and `terms.html` before going live.
