import { loanRepayment } from '../lib/finance.js';
import { $, num, R, live } from './ui.js';
function run() {
    const principal = Math.max(0, num('price') - num('deposit'));
    const base = loanRepayment({ principal, annualRatePct: num('rate'), years: num('years') });
    const extra = loanRepayment({ principal, annualRatePct: num('rate'), years: num('years'), extraMonthly: num('extra') });
    const saved = base.totalInterest - extra.totalInterest;
    $('out').innerHTML = `<div>Monthly repayment</div><div class="big">${R(base.monthly)}</div>
<table class="data"><tbody><tr><td>Loan amount</td><td class="num">${R(principal)}</td></tr><tr><td>Total interest</td><td class="num">${R(base.totalInterest)}</td></tr><tr><td>Total repaid</td><td class="num">${R(base.totalPaid)}</td></tr>
${num('extra') > 0 ? `<tr><th colspan="2">Paying ${R(num('extra'))} extra per month</th></tr><tr><td>Paid off in</td><td class="num">${Math.floor(extra.months / 12)} y ${extra.months % 12} m</td></tr><tr><td>Interest saved</td><td class="num">${R(saved)}</td></tr>` : ''}
<tr><td>Gross monthly income banks usually want (30% rule)</td><td class="num">${R(base.monthly / 0.3)}</td></tr></tbody></table>`;
}
live(['price', 'deposit', 'rate', 'years', 'extra'], run);
