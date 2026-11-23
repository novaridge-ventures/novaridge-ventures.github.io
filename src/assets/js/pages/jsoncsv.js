import { jsonToCsv, csvToJson, detectDelimiter } from '../lib/jsoncsv.js';
import { $, copy, download, live } from './ui.js';
function delim() { const d = $('delim').value; return d === 'tab' ? '\t' : d === 'auto' ? detectDelimiter($('in').value) : d; }
function run() {
    const dir = $('dir').value;
    $('inlabel').textContent = dir === 'j2c' ? 'Paste JSON (array of objects)' : 'Paste CSV (first row = headers)';
    if (!$('in').value.trim()) { $('out').textContent = ''; $('err').textContent = ''; return; }
    try {
        $('out').textContent = dir === 'j2c' ? jsonToCsv($('in').value, { delimiter: delim() === 'auto' ? ',' : delim(), flattenNested: $('flat').checked }) : JSON.stringify(csvToJson($('in').value, { delimiter: delim() }), null, 2);
        $('err').textContent = '';
    } catch (e) { $('err').textContent = `Could not convert: ${e.message}`; }
}
live(['in', 'dir', 'delim', 'flat'], run);
$('copy').addEventListener('click', (e) => copy($('out').textContent, e.target));
$('dl').addEventListener('click', () => { const j = $('dir').value === 'j2c'; download(j ? 'data.csv' : 'data.json', ($('dir').value === 'j2c' ? '\uFEFF' : '') + $('out').textContent, j ? 'text/csv' : 'application/json'); });
$('file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) { $('in').value = await f.text(); if (/\.csv$/i.test(f.name)) $('dir').value = 'c2j'; if (/\.json$/i.test(f.name)) $('dir').value = 'j2c'; run(); } });
