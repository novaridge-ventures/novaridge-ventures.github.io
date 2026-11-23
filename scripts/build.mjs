// Static site builder: src/pages/*.html (+ JSON meta header) -> public/ with layout, SEO tags, JSON-LD, sitemap and robots.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const SITE_URL = (process.env.SITE_URL || cfg.siteUrl).replace(/\/$/, '');
const ADSENSE = process.env.ADSENSE_CLIENT ?? cfg.adsenseClient;
const OUT = join(root, 'public');
const today = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const AFF_DEFAULTS = {
    namecheap: 'https://www.namecheap.com',
    digitalocean: 'https://www.digitalocean.com',
};
function affUrl(key) {
    const u = cfg.affiliates?.[key]?.url;
    return (u && String(u).trim()) || AFF_DEFAULTS[key];
}
function affRel(key) {
    const u = cfg.affiliates?.[key]?.url;
    return (u && String(u).trim()) ? 'sponsored noopener' : 'noopener';
}
function applyPlaceholders(body, meta) {
    let out = body
        .replaceAll('{{AFF_NAMECHEAP}}', esc(affUrl('namecheap')))
        .replaceAll('{{REL_NAMECHEAP}}', affRel('namecheap'))
        .replaceAll('{{AFF_DIGITALOCEAN}}', esc(affUrl('digitalocean')))
        .replaceAll('{{REL_DIGITALOCEAN}}', affRel('digitalocean'));
    if (meta?.shop) {
        const checkout = (cfg.payfast?.checkoutUrl || '').trim();
        const cards = (cfg.products || []).map((x) => {
            const zar = Number(x.priceZar);
            const eft = checkout && Number.isFinite(zar) && zar > 0 && x.id
                ? `<button type="button" class="btn secondary" data-sku="${esc(x.id)}">Pay with Instant EFT</button>`
                : '';
            return `<article class="card"><h2>${esc(x.name)}</h2><p class="price">${esc(x.price)}</p><p>${esc(x.blurb)}</p><p><a class="btn" href="${esc(x.url)}" rel="noopener" target="_blank">View on Payhip</a>${eft}</p></article>`;
        }).join('');
        out = out.replace('<!--shop-products-->', `<div class="product-grid">${cards}</div>`);
    }
    return out;
}

export function parsePage(file) {
    const raw = readFileSync(file, 'utf8');
    const m = /^<!--meta\s*([\s\S]*?)-->\s*/.exec(raw);
    if (!m) throw new Error(`${file}: missing <!--meta {...} --> header`);
    const meta = JSON.parse(m[1]);
    return { meta, body: raw.slice(m[0].length) };
}

const pagesDir = join(root, 'src/pages');
const pages = readdirSync(pagesDir).filter((f) => f.endsWith('.html')).map((f) => {
    const { meta, body } = parsePage(join(pagesDir, f));
    const slug = f.replace(/\.html$/, '');
    const path = slug === 'index' ? '/' : `/${slug}/`;
    return { slug, path, meta, body: applyPlaceholders(body, meta) };
});
const tools = pages.filter((p) => p.meta.tool).sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99));

function jsonLd(p) {
    const url = SITE_URL + p.path;
    const graph = [];
    if (p.meta.tool) {
        graph.push({ '@type': 'WebApplication', name: p.meta.h1 || p.meta.title, url, description: p.meta.description, applicationCategory: p.meta.appCategory || 'UtilitiesApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: cfg.brand } });
        graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Tools', item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: p.meta.h1 || p.meta.title, item: url }] });
    }
    if (p.meta.faq?.length) graph.push({ '@type': 'FAQPage', mainEntity: p.meta.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    if (p.slug === 'index') graph.push({ '@type': 'WebSite', name: cfg.siteName, url: `${SITE_URL}/`, publisher: { '@type': 'Organization', name: cfg.brand, email: cfg.contactEmail } });
    return graph.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>` : '';
}

const adSlot = () => (ADSENSE ? `<div class="ad-slot no-print"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ADSENSE)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>` : '');

const promo = () => `<div class="card promo"><h2>From the Novaridge shop</h2>${cfg.products.map((x) => `<a class="p" href="${esc(x.url)}" rel="noopener" target="_blank">${esc(x.name)} &middot; ${esc(x.price)}</a><small>${esc(x.blurb)}</small>`).join('')}<p class="muted"><a href="/shop/">See all products &rarr;</a></p></div>`;

function sidebar(p) {
    const related = tools.filter((t) => t.slug !== p.slug).slice(0, 8);
    return `<aside>
${promo()}
<div class="card"><h2>More free tools</h2><ul>${related.map((t) => `<li><a href="${t.path}">${esc(t.meta.h1 || t.meta.title)}</a></li>`).join('')}</ul></div>
</aside>`;
}

function faqHtml(p) {
    if (!p.meta.faq?.length) return '';
    return `<h2>Frequently asked questions</h2>${p.meta.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}`;
}

function render(p) {
    const url = SITE_URL + p.path;
    const title = p.slug === 'index' ? `${cfg.siteName}: ${p.meta.title}` : `${p.meta.title} | ${cfg.siteName}`;
    const toolGrid = p.meta.listTools ? `<div class="tools-grid">${tools.map((t) => `<a class="card" href="${t.path}"><span class="tag">${esc(t.meta.category || 'Tool')}</span><h3>${esc(t.meta.h1 || t.meta.title)}</h3><p>${esc(t.meta.short || t.meta.description)}</p></a>`).join('')}</div>` : '';
    const main = p.meta.tool
        ? `<div class="crumbs"><a href="/">Tools</a> &rsaquo; ${esc(p.meta.category || '')}</div>
<h1>${esc(p.meta.h1 || p.meta.title)}</h1><p class="lead">${esc(p.meta.lead || p.meta.description)}</p>
<div class="layout"><div>${p.body}${adSlot()}<div class="prose">${p.meta.prose || ''}${faqHtml(p)}</div></div>${sidebar(p)}</div>`
        : `<h1>${esc(p.meta.h1 || p.meta.title)}</h1>${p.meta.lead ? `<p class="lead">${esc(p.meta.lead)}</p>` : ''}${toolGrid}<div class="prose">${p.body}</div>${p.meta.listTools ? promo() : ''}`;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.meta.description)}">
<link rel="canonical" href="${esc(url)}">
${p.meta.noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(cfg.siteName)}"><meta property="og:title" content="${esc(p.meta.title)}"><meta property="og:description" content="${esc(p.meta.description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${SITE_URL}/assets/og.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.meta.title)}"><meta name="twitter:description" content="${esc(p.meta.description)}">
<meta name="theme-color" content="#0b2530">
${cfg.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">` : ''}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/site.css">
${ADSENSE ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ADSENSE)}" crossorigin="anonymous"></script>` : ''}
${jsonLd(p)}
</head>
<body>
<header class="site"><div class="wrap"><a class="logo" href="/">Novaridge<span>Tools</span></a>
<nav class="top" aria-label="Main"><a href="/sa-income-tax-calculator/">SA Tax</a><a href="/vat-calculator/">VAT</a><a href="/invoice-generator/">Invoice</a><a href="/sql-formatter/">SQL</a><a href="/shop/">Shop</a><a href="/">All tools</a></nav></div></header>
<main><div class="wrap">${main}</div></main>
<footer class="site"><div class="wrap"><p>&copy; ${new Date().getFullYear()} ${esc(cfg.brand)}. Free tools that run entirely in your browser; nothing you type is uploaded.</p>
<p><a href="/about/">About</a><a href="/libraries/">Libraries</a><a href="/shop/">Shop</a><a href="/hosting-and-domains/">Hosting</a><a href="/dmarc-spf-dkim-checklist/">Email DNS guide</a><a href="/sa-government-tenders-guide/">Tenders guide</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms &amp; disclaimer</a><a href="mailto:${esc(cfg.contactEmail)}">Contact</a></p></div></footer>
${p.meta.shop ? `<script>window.NOVARIDGE_SHOP=${JSON.stringify({ checkoutUrl: (cfg.payfast?.checkoutUrl || '') })}</script>` : ''}
${p.meta.script ? `<script type="module" src="/assets/js/pages/${esc(p.meta.script)}"></script>` : ''}
</body>
</html>
`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(root, 'src/assets'), join(OUT, 'assets'), { recursive: true });
for (const p of pages) {
    const dir = p.slug === 'index' ? OUT : join(OUT, p.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), render(p));
}
// 404 page (served by Cloudflare Pages / Netlify / GitHub Pages)
const notFound = { slug: '404', path: '/404.html', meta: { title: 'Page not found', description: 'This page does not exist.', noindex: true, listTools: true, lead: 'That page does not exist, but one of these tools might help.' }, body: '' };
writeFileSync(join(OUT, '404.html'), render(notFound));

const indexable = pages.filter((p) => !p.meta.noindex);
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((p) => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${today}</lastmod><changefreq>${p.meta.tool ? 'monthly' : 'yearly'}</changefreq><priority>${p.slug === 'index' ? '1.0' : p.meta.tool ? '0.8' : '0.3'}</priority></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
if (ADSENSE) writeFileSync(join(OUT, 'ads.txt'), `google.com, ${ADSENSE.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
if (existsSync(join(root, 'src/_headers'))) cpSync(join(root, 'src/_headers'), join(OUT, '_headers'));
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`Built ${pages.length} pages (${tools.length} tools) + 404, sitemap (${indexable.length} URLs) -> public/  [SITE_URL=${SITE_URL}${ADSENSE ? ', AdSense on' : ''}]`);
