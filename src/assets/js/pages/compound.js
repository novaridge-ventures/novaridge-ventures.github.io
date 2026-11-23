import { compound } from '../lib/finance.js';
import { $, num, money, live } from './ui.js';
function run() {
    const c = $('cur').value;
    const r = compound({ initial: num('initial'), monthly: num('monthly'), annualRatePct: num('rate'), years: num('years'), escalationPct: num('esc') });
    const rows = r.yearly.filter((y, i, a) => a.length <= 15 || y.year % 5 === 0 || i === a.length - 1).map((y) => `<tr><td>${y.year}</td><td class="num">${money(y.contributed, c)}</td><td class="num">${money(y.balance, c)}</td></tr>`).join('');
    $('out').innerHTML = `<div>Future value</div><div class="big">${money(r.finalBalance, c)}</div><p>You contribute ${money(r.contributed, c)} and earn ${money(r.growth, c)} in growth.</p>
<table class="data"><thead><tr><th>Year</th><th class="num">Contributed</th><th class="num">Balance</th></tr></thead><tbody>${rows}</tbody></table>`;
}
live(['initial', 'monthly', 'rate', 'years', 'esc', 'cur'], run);
