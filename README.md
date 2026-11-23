# Novaridge Tools — free calculators & developer tools (static site)

10 tools + home/about/privacy/terms, zero runtime dependencies, everything runs client-side.

| Tool | URL path |
|---|---|
| SA Income Tax & PAYE 2026/27 (SARS tables, UIF, medical credits, RA deduction) | `/sa-income-tax-calculator/` |
| VAT calculator (add/remove 15%) | `/vat-calculator/` |
| Freelancer hourly rate | `/freelancer-hourly-rate-calculator/` |
| Invoice generator (print/PDF, VAT, localStorage) | `/invoice-generator/` |
| Home loan / bond repayment (+ extra payments) | `/home-loan-calculator/` |
| Compound interest & savings | `/compound-interest-calculator/` |
| Profit margin & markup | `/profit-margin-calculator/` |
| SQL formatter & minifier | `/sql-formatter/` |
| JSON ⇄ CSV converter | `/json-to-csv/` |
| Cron expression explainer + next runs | `/cron-expression-explainer/` |

## Build / test

```bash
npm run build      # src/ -> public/ (pages, sitemap.xml, robots.txt, 404.html, _headers, ads.txt if AdSense set)
npm test           # 15 unit tests for every calculation library
npm run check      # build + tests + SEO/link/sitemap/id/JSON-LD checks (CI uses this)
npm run serve      # http://localhost:8080
```

Config: `site.config.json` (`siteUrl`, `adsenseClient`, `googleSiteVerification`, Payhip product links). Env overrides: `SITE_URL`, `ADSENSE_CLIENT`.
Pages are `src/pages/<slug>.html` with a JSON `<!--meta … -->` header (title, description, FAQ → FAQPage JSON-LD, etc.); logic lives in `src/assets/js/lib/*.js` (pure ES modules shared by browser and tests).

## Deploy (all free)

- **Cloudflare Pages**: connect the GitHub repo → Framework preset *None* → Build command `npm run check` → Output directory `public` → env var `SITE_URL=https://<project>.pages.dev`.
- **Netlify**: connect repo; `netlify.toml` already sets build + publish.
- **GitHub Pages**: push to `main`; `.github/workflows/pages.yml` builds and deploys (set repo variable `SITE_URL`, and Settings → Pages → Source: GitHub Actions).

## Monetisation switches

1. After the site has real traffic and content, apply for AdSense, then put the publisher id (`ca-pub-…`) in `adsenseClient` and rebuild — the loader script, responsive ad slots under each tool, and `ads.txt` are generated automatically. Privacy page already contains the Google-required advertising disclosure.
2. Affiliate links: add to page `prose` meta when an approved programme exists (disclosure is already in the privacy policy).
3. Payhip products are promoted on every page (sidebar) and in context (SQL formatter → DBA toolkit).

Maintenance: update `src/assets/js/lib/tax.js` after each February Budget (tests pin the published bracket bases).
