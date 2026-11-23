import { hourlyRate } from '../lib/finance.js';
import { $, num, money, live } from './ui.js';
function run() {
    const c = $('cur').value;
    const r = hourlyRate({ targetAnnualIncome: num('income'), annualExpenses: num('expenses'), taxRatePct: num('tax'), weeksOff: num('weeksoff'), hoursPerWeek: num('hours'), billablePct: num('billable'), profitMarginPct: num('margin') });
    $('out').innerHTML = `<div>Minimum hourly rate</div><div class="big">${money(r.hourly, c)}</div>
<table class="data"><tbody><tr><td>Day rate (8 h)</td><td class="num">${money(r.daily, c)}</td></tr><tr><td>Billable hours per year</td><td class="num">${Math.round(r.billableHours).toLocaleString('en-ZA')}</td></tr><tr><td>Revenue needed per year</td><td class="num">${money(r.grossNeeded, c)}</td></tr><tr><td>Revenue needed per month</td><td class="num">${money(r.monthly, c)}</td></tr></tbody></table>`;
}
live(['income', 'expenses', 'tax', 'weeksoff', 'hours', 'billable', 'margin', 'cur'], run);
