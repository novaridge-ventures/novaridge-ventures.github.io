import { formatSql, minifySql } from '../lib/sqlformat.js';
import { $, copy, live } from './ui.js';
function run() {
    try { $('out').textContent = $('mode').value === 'min' ? minifySql($('sql').value) : formatSql($('sql').value, { uppercase: $('upper').checked, indent: $('indent').value === 'tab' ? '\t' : ' '.repeat(Number($('indent').value)) }); $('err').textContent = ''; }
    catch (e) { $('err').textContent = e.message; }
}
live(['sql', 'mode', 'upper', 'indent'], run);
$('copy').addEventListener('click', (e) => copy($('out').textContent, e.target));
