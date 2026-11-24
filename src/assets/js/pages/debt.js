import { compareStrategies } from '../lib/debt.js';
import { $, num, R, live } from './ui.js';
const ROWS = 5;
const when = (m) => (m == null ? 'not within 50 years' : m < 12 ? `${m} month${m === 1 ? '' : 's'}` : `${Math.floor(m / 12)} yr ${m % 12} mo`);
function run() {
    const debts = [];
    for (let i = 1; i <= ROWS; i++) debts.push({ name: $(`n${i}`).value.trim() || `Debt ${i}`, balance: num(`b${i}`), aprPct: num(`r${i}`), minPayment: num(`m${i}`) });
    const budget = num('budget');
    const c = compareStrategies(debts, budget);
    const s = c.snowball, a = c.avalanche;
    if (!s.feasible && s.reason === 'budget-below-minimums') { $('out').innerHTML = `<p><strong>Your monthly budget (${R(budget)}) is below the total of your minimum payments (${R(s.minTotal)}).</strong> Raise the budget to at least the minimums to see a payoff plan.</p>`; return; }
    if (!s.feasible || !a.feasible) { $('out').innerHTML = `<p><strong>At ${R(budget)} a month these debts are not paid off within 50 years.</strong> Interest is growing faster than you are paying. Increase the monthly amount.</p>`; return; }
    const better = c.interestSaved > 0 ? `Avalanche saves <strong>${R(c.interestSaved)}</strong> in interest` : c.interestSaved < 0 ? `Snowball costs less here by <strong>${R(-c.interestSaved)}</strong>` : 'Both methods cost the same here';
    const list = (r) => r.payoffs.map((p) => `<li>${p.name.replace(/[<>&]/g, '')}: ${when(p.month)}</li>`).join('');
    $('out').innerHTML = `<div>${better}. Debt-free in <strong>${when(a.months)}</strong> (avalanche) vs <strong>${when(s.months)}</strong> (snowball).</div>
<table class="data"><thead><tr><th></th><th class="num">Snowball</th><th class="num">Avalanche</th></tr></thead><tbody>
<tr><td>Time to debt-free</td><td class="num">${when(s.months)}</td><td class="num">${when(a.months)}</td></tr>
<tr><td>Total interest</td><td class="num">${R(s.totalInterest)}</td><td class="num">${R(a.totalInterest)}</td></tr>
<tr><td>Total paid</td><td class="num">${R(s.totalPaid)}</td><td class="num">${R(a.totalPaid)}</td></tr>
</tbody></table>
<div class="grid2"><div><h3>Snowball payoff order</h3><ol>${list(s)}</ol></div><div><h3>Avalanche payoff order</h3><ol>${list(a)}</ol></div></div>
<p class="muted">Estimate only. Assumes fixed rates, no new borrowing and no fees; real statements calculate interest daily, so expect small differences.</p>`;
}
const ids = ['budget'];
for (let i = 1; i <= ROWS; i++) ids.push(`n${i}`, `b${i}`, `r${i}`, `m${i}`);
live(ids, run);
