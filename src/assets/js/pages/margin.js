import { marginMarkup, vat } from '../lib/finance.js';
import { $, num, R, pct, live } from './ui.js';
function run() {
    const mode = $('mode').value;
    const cost = num('cost');
    const v = num('val');
    const r = mode === 'price' ? marginMarkup({ cost, price: v }) : mode === 'margin' ? marginMarkup({ cost, marginPct: v }) : marginMarkup({ cost, markupPct: v });
    $('vlabel').textContent = mode === 'price' ? 'Selling price (R)' : mode === 'margin' ? 'Target gross margin (%)' : 'Markup (%)';
    if (!r || !Number.isFinite(r.price)) { $('out').innerHTML = '<p class="err">Margin must be below 100%.</p>'; return; }
    $('out').innerHTML = `<table class="data"><tbody><tr><td>Cost</td><td class="num">${R(r.cost)}</td></tr><tr><th>Selling price (excl. VAT)</th><th class="num">${R(r.price)}</th></tr><tr><td>Selling price incl. 15% VAT</td><td class="num">${R(vat(r.price, 15).inclusive)}</td></tr><tr><td>Gross profit</td><td class="num">${R(r.profit)}</td></tr><tr><td>Gross margin</td><td class="num">${pct(r.marginPct, 2)}</td></tr><tr><td>Markup</td><td class="num">${pct(r.markupPct, 2)}</td></tr></tbody></table>`;
}
live(['mode', 'cost', 'val'], run);
