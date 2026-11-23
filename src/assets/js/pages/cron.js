import { describeCron, nextRuns } from '../lib/cron.js';
import { $, live } from './ui.js';
function run() {
    try {
        const e = $('expr').value;
        const utc = $('tz').value === 'utc';
        const runs = nextRuns(e, 8, new Date(), { utc });
        const fmt = (d) => utc ? d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : d.toLocaleString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        $('out').innerHTML = `<div class="big" style="font-size:1.3rem">${describeCron(e)}</div><h3>Next runs</h3><ol>${runs.map((d) => `<li>${fmt(d)}</li>`).join('') || '<li>No run in the next 5 years</li>'}</ol>`;
    } catch (err) { $('out').innerHTML = `<p class="err">${err.message.replace(/</g, '&lt;')}</p>`; }
}
live(['expr', 'tz'], run);
document.querySelectorAll('[data-cron]').forEach((b) => b.addEventListener('click', () => { $('expr').value = b.dataset.cron; run(); }));
