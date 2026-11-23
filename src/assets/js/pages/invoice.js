import { invoiceTotals } from '../lib/finance.js';
import { $, money, num } from './ui.js';
const KEY = 'novaridge-invoice-v1';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fields = ['from', 'to', 'number', 'date', 'due', 'cur', 'vatno', 'vatrate', 'discount', 'notes', 'bank'];
function addLine(l = { desc: '', qty: 1, price: 0 }) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input aria-label="Description" class="d" value="${esc(l.desc)}" placeholder="Description"></td><td style="width:80px"><input aria-label="Quantity" class="q" type="number" step="any" value="${esc(l.qty)}"></td><td style="width:130px"><input aria-label="Unit price" class="p" type="number" step="any" value="${esc(l.price)}"></td><td class="num lt" style="width:120px"></td><td style="width:30px"><button class="row-del" title="Remove line" type="button">&times;</button></td>`;
    tr.querySelector('.row-del').onclick = () => { tr.remove(); update(); };
    tr.querySelectorAll('input').forEach((i) => i.addEventListener('input', update));
    $('lines').appendChild(tr);
}
function lines() { return [...$('lines').querySelectorAll('tr')].map((tr) => ({ desc: tr.querySelector('.d').value, qty: tr.querySelector('.q').value, price: tr.querySelector('.p').value })); }
function update() {
    const cur = $('cur').value || 'ZAR';
    const ls = lines();
    [...$('lines').querySelectorAll('tr')].forEach((tr, i) => { tr.querySelector('.lt').textContent = money((+ls[i].qty || 0) * (+ls[i].price || 0), cur); });
    const t = invoiceTotals(ls, { vatRatePct: num('vatrate'), vatEnabled: $('vaton').checked, discountPct: num('discount') });
    $('totals').innerHTML = `<tr><td>Subtotal</td><td class="num">${money(t.subtotal, cur)}</td></tr>${t.discount ? `<tr><td>Discount</td><td class="num">− ${money(t.discount, cur)}</td></tr>` : ''}${$('vaton').checked ? `<tr><td>VAT ${num('vatrate')}%</td><td class="num">${money(t.tax, cur)}</td></tr>` : ''}<tr><th>Total due</th><th class="num">${money(t.total, cur)}</th></tr>`;
    const st = Object.fromEntries(fields.map((f) => [f, $(f).value])); st.vaton = $('vaton').checked; st.lines = ls;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* private mode */ }
    renderPreview(t, cur, ls);
}
function renderPreview(t, cur, ls) {
    const nl = (s) => esc(s).replace(/\n/g, '<br>');
    $('invoice-preview').innerHTML = `<div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap"><div><h2 style="margin:0">${$('vaton').checked ? 'TAX INVOICE' : 'INVOICE'}</h2><p>${nl($('from').value)}${$('vatno').value ? `<br>VAT no: ${esc($('vatno').value)}` : ''}</p></div><div><p><strong>Invoice #</strong> ${esc($('number').value)}<br><strong>Date</strong> ${esc($('date').value)}<br><strong>Due</strong> ${esc($('due').value)}</p></div></div>
<p><strong>Bill to</strong><br>${nl($('to').value)}</p>
<table class="data"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${ls.filter((l) => l.desc || +l.price).map((l) => `<tr><td>${esc(l.desc)}</td><td class="num">${esc(l.qty)}</td><td class="num">${money(l.price, cur)}</td><td class="num">${money((+l.qty || 0) * (+l.price || 0), cur)}</td></tr>`).join('')}</tbody><tfoot>${$('totals').innerHTML}</tfoot></table>
${$('bank').value ? `<p><strong>Payment details</strong><br>${nl($('bank').value)}</p>` : ''}${$('notes').value ? `<p>${nl($('notes').value)}</p>` : ''}`;
}
function load() {
    let st = null; try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { st = null; }
    const today = new Date(); const due = new Date(Date.now() + 14 * 864e5);
    const d = (x) => x.toISOString().slice(0, 10);
    const def = { number: 'INV-0001', date: d(today), due: d(due), cur: 'ZAR', vatrate: 15, discount: 0 };
    fields.forEach((f) => { $(f).value = st?.[f] ?? def[f] ?? ''; $(f).addEventListener('input', update); });
    $('vaton').checked = st?.vaton ?? false; $('vaton').addEventListener('change', update);
    (st?.lines?.length ? st.lines : [{ desc: 'Website development', qty: 10, price: 450 }]).forEach(addLine);
    update();
}
$('add').onclick = () => { addLine(); update(); };
$('print').onclick = () => window.print();
$('clear').onclick = () => { if (confirm('Clear this invoice?')) { localStorage.removeItem(KEY); location.reload(); } };
load();
