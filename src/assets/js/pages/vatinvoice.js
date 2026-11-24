import { invoiceTypeRequired } from '../lib/vatinvoice.js';
import { $, num, R, live } from './ui.js';
import './checklist.js';
const LABEL = { full: 'Full tax invoice', abridged: 'Abridged tax invoice (or a full one)', none: 'No tax invoice required' };
function run() {
    const amt = num('amount');
    const r = invoiceTypeRequired(Math.max(0, amt), $('zero').value === 'yes');
    $('out').innerHTML = `<p><strong>${LABEL[r.type]}</strong> for ${R(amt)} including VAT (section ${r.section} of the VAT Act).</p><p>${r.reason}</p>`;
    document.querySelectorAll('[data-full-only]').forEach((el) => { el.style.opacity = r.type === 'full' ? '1' : '0.55'; });
}
live(['amount', 'zero'], run);
