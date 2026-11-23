// Post-build checks: every page has title/description/canonical/h1, internal links and assets resolve,
// sitemap lists every indexable page, page scripts and their imports exist.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const errors = [];
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(pub);
const html = files.filter((f) => f.endsWith('.html'));

const resolveUrl = (u) => {
    const path = u.split(/[?#]/)[0];
    const p = join(pub, path);
    return existsSync(p) && statSync(p).isFile() ? p : existsSync(join(p, 'index.html')) ? join(p, 'index.html') : null;
};

for (const f of html) {
    const s = readFileSync(f, 'utf8');
    const rel = f.slice(pub.length);
    const title = /<title>([^<]+)<\/title>/.exec(s)?.[1];
    const desc = /<meta name="description" content="([^"]+)"/.exec(s)?.[1];
    if (!title) errors.push(`${rel}: missing <title>`);
    else if (title.length > 75) errors.push(`${rel}: title too long (${title.length})`);
    const noindex = /content="noindex"/.test(s);
    if (!desc) errors.push(`${rel}: missing meta description`);
    else if (!noindex && (desc.length < 50 || desc.length > 170)) errors.push(`${rel}: description length ${desc.length} (want 50-170)`);
    if (!/<link rel="canonical"/.test(s)) errors.push(`${rel}: missing canonical`);
    if ((s.match(/<h1[\s>]/g) || []).length !== 1) errors.push(`${rel}: must have exactly one <h1>`);
    for (const m of s.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!resolveUrl(m[1])) errors.push(`${rel}: broken internal link ${m[1]}`);
    const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dup.length) errors.push(`${rel}: duplicate ids ${[...new Set(dup)].join(', ')}`);
    for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { errors.push(`${rel}: invalid JSON-LD`); } }
    // Page script must reference ids that exist in the page.
    const sm = /<script type="module" src="(\/assets\/js\/pages\/[^"]+)"/.exec(s);
    if (sm) {
        const js = readFileSync(join(pub, sm[1]), 'utf8');
        for (const m of js.matchAll(/\$\('([\w-]+)'\)/g)) if (!ids.includes(m[1])) errors.push(`${rel}: script uses #${m[1]} which is not in the page`);
    }
}
// JS imports resolve
for (const f of files.filter((x) => x.endsWith('.js'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/from '(\.[^']+)'/g)) if (!existsSync(resolve(dirname(f), m[1]))) errors.push(`${f.slice(pub.length)}: import ${m[1]} not found`);
}
const sitemap = readFileSync(join(pub, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
for (const l of locs) if (!resolveUrl(l)) errors.push(`sitemap: ${l} does not exist`);
for (const f of html) {
    const s = readFileSync(f, 'utf8');
    if (/noindex/.test(s)) continue;
    const path = f.slice(pub.length).replace(/index\.html$/, '');
    if (!locs.includes(path)) errors.push(`sitemap: missing ${path}`);
}
if (!existsSync(join(pub, 'robots.txt'))) errors.push('robots.txt missing');
if (!existsSync(join(pub, 'privacy', 'index.html'))) errors.push('privacy page missing');

if (errors.length) { console.error(`CHECK FAILED (${errors.length}):\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Checks passed: ${html.length} HTML files, ${locs.length} sitemap URLs, all links/assets/ids/JSON-LD OK.`);
