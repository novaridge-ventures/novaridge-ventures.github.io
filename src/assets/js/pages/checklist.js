import { $ } from './ui.js';
const KEY = 'nv-backup-checklist';
const box = $('checklist');
const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
const items = [...box.querySelectorAll('input[type=checkbox]')];
function update() {
    const done = items.filter((i) => i.checked).length;
    $('progress').textContent = `${done} of ${items.length} checks done`;
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(items.map((i) => [i.dataset.k, i.checked]))));
}
items.forEach((i) => { i.checked = !!saved[i.dataset.k]; i.addEventListener('change', update); });
$('reset').addEventListener('click', () => { items.forEach((i) => (i.checked = false)); update(); });
update();
