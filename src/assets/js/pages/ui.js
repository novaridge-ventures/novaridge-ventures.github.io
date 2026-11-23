export const $ = (id) => document.getElementById(id);
export const num = (id) => { const v = parseFloat(String($(id)?.value ?? '').replace(/[\s,]/g, '')); return Number.isFinite(v) ? v : 0; };
export const R = (n) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(Number(n) || 0);
export const money = (n, c = 'ZAR') => { try { return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(Number(n) || 0); } catch { return `${c} ${(+n || 0).toFixed(2)}`; } };
export const pct = (n, d = 1) => `${(Number(n) || 0).toFixed(d)}%`;
export function live(ids, fn) { ids.forEach((id) => { const el = $(id); if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); } }); fn(); }
export function copy(text, btn) {
    navigator.clipboard?.writeText(text).then(() => { if (btn) { const t = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => (btn.textContent = t), 1200); } });
}
export function download(name, text, type = 'text/plain') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
