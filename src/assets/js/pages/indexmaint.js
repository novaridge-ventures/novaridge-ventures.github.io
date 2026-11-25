import { triageIndex, maintenanceSql, parseRows } from '../lib/indexmaint.js';
import { $, num, copy, live } from './ui.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LABEL = { candidate: 'Review', healthy: 'Leave', 'ignore-small': 'Too small', heap: 'Heap', columnstore: 'Columnstore' };
function run() {
    const rows = parseRows($('rows').value);
    const opts = { minPages: num('minPages'), fragPct: num('fragPct'), densityPct: num('densityPct') };
    if (!rows.length) { $('out').innerHTML = '<p class="muted">Paste rows from the query above (tab-separated with headers from SSMS, or comma-separated).</p>'; $('sqlout').textContent = ''; return; }
    const sql = []; let n = 0;
    const body = rows.map((r) => {
        let t; try { t = triageIndex(r, opts); } catch (e) { return `<tr><td>${esc(r.object)}.${esc(r.index)}</td><td colspan="4">${esc(e.message)}</td></tr>`; }
        if (t.method) { n++; sql.push(`-- ${r.schema}.${r.object}.${r.index}: ${t.reasons[0]}\n${maintenanceSql(r, t.method, { online: $('online').checked })}`); }
        return `<tr><td>${esc(r.schema)}.${esc(r.object)}<br><small>${esc(r.index ?? '(heap)')}</small></td><td class="num">${r.fragPct.toFixed(1)}%</td><td class="num">${r.densityPct == null ? '-' : r.densityPct.toFixed(1) + '%'}</td><td class="num">${r.pages.toLocaleString('en-ZA')}</td><td><strong>${LABEL[t.action]}</strong>${t.method ? ` (${t.method})` : ''}<br><small>${esc(t.reasons.join(' '))}</small></td></tr>`;
    }).join('');
    $('out').innerHTML = `<p><strong>${n} of ${rows.length}</strong> indexes are worth a closer look against your triggers.</p><table class="data"><thead><tr><th>Index</th><th class="num">Frag.</th><th class="num">Density</th><th class="num">Pages</th><th>Suggestion</th></tr></thead><tbody>${body}</tbody></table>`;
    $('sqlout').textContent = sql.length ? `-- Measure first (Query Store before/after). Run in a quiet window.\n${sql.join('\n\n')}` : '-- Nothing to do against your triggers.';
}
live(['rows', 'minPages', 'fragPct', 'densityPct', 'online'], run);
$('copy').addEventListener('click', (e) => copy($('sqlout').textContent, e.target));
