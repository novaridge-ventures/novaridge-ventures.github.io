import { provisionalTax, TAX_YEARS } from '../lib/tax.js';
import { $, num, R, pct, live } from './ui.js';
function run() {
    const year = $('year').value;
    const r = provisionalTax({ turnover: num('turnover'), expenses: num('expenses'), otherIncome: num('other'), retirementAnnual: num('ra'), age: num('age') || 30, medicalMembers: num('med'), payeFirstHalf: num('paye1'), payeFullYear: num('paye2'), year });
    const y = TAX_YEARS[year].label;
    const endYear = Number(year);
    $('out').innerHTML = `<div>Estimated income tax for the year</div><div class="big">${R(r.liability)}</div>
<table class="data"><tbody>
<tr><td>Business profit (turnover − expenses)</td><td class="num">${R(r.businessProfit)}</td></tr>
<tr><td>Plus other taxable income</td><td class="num">${R(r.incomeBeforeRa - Math.max(0, r.businessProfit))}</td></tr>
<tr><td>Retirement annuity deduction</td><td class="num">− ${R(r.retirementDeduction)}</td></tr>
<tr><td>Taxable income</td><td class="num">${R(r.taxable)}</td></tr>
<tr><td>Tax before rebates</td><td class="num">${R(r.taxBeforeRebates)}</td></tr>
<tr><td>Rebates and medical credits</td><td class="num">− ${R(r.rebates + r.medicalCredit)}</td></tr>
<tr><th>Estimated tax liability</th><th class="num">${R(r.liability)}</th></tr>
<tr><td>Less PAYE already withheld (full year)</td><td class="num">− ${R(r.payeFullYear)}</td></tr>
<tr><th>1st IRP6 payment (by 31 Aug ${endYear - 1})</th><th class="num">${R(r.first)}</th></tr>
<tr><th>2nd IRP6 payment (by end Feb ${endYear})</th><th class="num">${R(r.second)}</th></tr>
<tr><td>Set aside per month to cover both</td><td class="num">${R(r.monthlySetAside)}</td></tr>
<tr><td>Effective / marginal rate</td><td class="num">${pct(r.effectiveRate * 100)} / ${pct(r.marginalRate * 100, 0)}</td></tr>
</tbody></table><p class="muted">Tax year ${y}. Estimate only, not tax advice. Check figures on SARS eFiling before you submit an IRP6.</p>`;
}
live(['turnover', 'expenses', 'other', 'ra', 'age', 'med', 'paye1', 'paye2', 'year'], run);
