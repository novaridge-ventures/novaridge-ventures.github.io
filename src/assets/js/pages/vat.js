import { vat } from '../lib/finance.js';
import { $, num, R, live } from './ui.js';
function run() {
    const r = vat(num('amount'), num('rate'), $('mode').value);
    $('out').innerHTML = `<table class="data"><tbody><tr><td>Amount excluding VAT</td><td class="num">${R(r.exclusive)}</td></tr><tr><td>VAT (${num('rate')}%)</td><td class="num">${R(r.vat)}</td></tr><tr><th>Amount including VAT</th><th class="num">${R(r.inclusive)}</th></tr></tbody></table>`;
}
live(['amount', 'rate', 'mode'], run);
