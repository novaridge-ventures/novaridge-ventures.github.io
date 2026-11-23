import { calculatePaye, TAX_YEARS } from '../lib/tax.js';
import { $, num, R, pct, live } from './ui.js';
function run() {
    const period = $('period').value;
    const gross = num('gross');
    const r = calculatePaye({ grossMonthly: period === 'annual' ? gross / 12 : gross, annualBonus: num('bonus'), age: num('age') || 30, retirementMonthly: num('ra'), medicalMembers: num('med'), year: $('year').value });
    $('out').innerHTML = `<div>Estimated tax (PAYE) per month</div><div class="big">${R(r.monthlyTax)}</div>
<table class="data"><tbody>
<tr><td>Gross income (annual)</td><td class="num">${R(r.grossAnnual)}</td></tr>
<tr><td>Retirement deduction</td><td class="num">− ${R(r.retirementDeduction)}</td></tr>
<tr><td>Taxable income</td><td class="num">${R(r.taxable)}</td></tr>
<tr><td>Tax before rebates</td><td class="num">${R(r.taxBeforeRebates)}</td></tr>
<tr><td>Rebates (age-based)</td><td class="num">− ${R(r.rebates)}</td></tr>
<tr><td>Medical scheme fees tax credit</td><td class="num">− ${R(r.medicalCredit)}</td></tr>
<tr><th>Income tax per year</th><th class="num">${R(r.annualTax)}</th></tr>
<tr><td>UIF (employee 1%) per month</td><td class="num">${R(r.uifMonthly)}</td></tr>
<tr><th>Take-home pay per month</th><th class="num">${R(r.netMonthly)}</th></tr>
<tr><td>Effective / marginal tax rate</td><td class="num">${pct(r.effectiveRate * 100)} / ${pct(r.marginalRate * 100, 0)}</td></tr>
</tbody></table><p class="muted">Tax year ${TAX_YEARS[r.year].label}. Estimate only; your payslip may differ because of fringe benefits, travel allowances and how your employer annualises bonuses.</p>`;
}
live(['gross', 'period', 'bonus', 'age', 'ra', 'med', 'year'], run);
