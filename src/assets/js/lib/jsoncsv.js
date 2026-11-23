// JSON <-> CSV conversion with nested-object flattening (dot paths).
export function flatten(obj, prefix = '', out = {}) {
    if (obj === null || typeof obj !== 'object') { out[prefix || 'value'] = obj; return out; }
    if (Array.isArray(obj)) {
        if (obj.every((v) => v === null || typeof v !== 'object')) { out[prefix || 'value'] = obj.join('; '); return out; }
        obj.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
        return out;
    }
    const keys = Object.keys(obj);
    if (!keys.length && prefix) out[prefix] = '';
    for (const k of keys) flatten(obj[k], prefix ? `${prefix}.${k}` : k, out);
    return out;
}

export function csvEscape(v, delimiter = ',') {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /["\r\n]/.test(s) || s.includes(delimiter) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function jsonToCsv(input, { delimiter = ',', flattenNested = true } = {}) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    let rows = Array.isArray(data) ? data : (data && typeof data === 'object' ? (Object.values(data).find(Array.isArray) || [data]) : [{ value: data }]);
    rows = rows.map((r) => (r !== null && typeof r === 'object' && !Array.isArray(r) ? (flattenNested ? flatten(r) : r) : { value: Array.isArray(r) ? r.join('; ') : r }));
    const headers = [];
    for (const r of rows) for (const k of Object.keys(r)) if (!headers.includes(k)) headers.push(k);
    const lines = [headers.map((h) => csvEscape(h, delimiter)).join(delimiter)];
    for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h], delimiter)).join(delimiter));
    return lines.join('\r\n');
}

/** RFC 4180 parser. */
export function parseCsv(text, delimiter = ',') {
    const rows = []; let row = []; let field = ''; let q = false;
    const s = String(text).replace(/^\uFEFF/, '');
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (q) {
            if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += ch;
        } else if (ch === '"') q = true;
        else if (ch === delimiter) { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
        else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function csvToJson(text, { delimiter = ',', inferTypes = true } = {}) {
    const [head, ...rest] = parseCsv(text, delimiter);
    if (!head) return [];
    const conv = (v) => {
        if (!inferTypes) return v;
        if (v === '') return null;
        if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v)) return Number(v);
        if (v === 'true' || v === 'false') return v === 'true';
        return v;
    };
    return rest.map((r) => Object.fromEntries(head.map((h, i) => [h, conv(r[i] ?? '')])));
}

export function detectDelimiter(text) {
    const first = String(text).split(/\r?\n/)[0] || '';
    const counts = [',', ';', '\t', '|'].map((d) => [d, first.split(d).length - 1]);
    counts.sort((a, b) => b[1] - a[1]);
    return counts[0][1] > 0 ? counts[0][0] : ',';
}
