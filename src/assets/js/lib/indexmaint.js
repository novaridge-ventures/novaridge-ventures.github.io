// SQL Server rowstore index maintenance triage.
// Follows Microsoft Learn "Optimize index maintenance to improve query performance and reduce resource consumption":
// reorganize is the preferred (cheaper, always online) method; small indexes rarely benefit; decisions should not rest on
// fixed thresholds alone, so thresholds here are user-chosen review triggers, not rules.

export const DEFAULTS = Object.freeze({ minPages: 1000, fragPct: 30, densityPct: 75 });

const quote = (name) => `[${String(name).replace(/]/g, ']]')}]`;

/**
 * @param {{schema?:string, object?:string, index?:string|null, type?:string, fragPct:number, densityPct?:number|null, pages:number, allowPageLocks?:boolean}} row
 * @param {{minPages?:number, fragPct?:number, densityPct?:number}} [opts]
 */
export function triageIndex(row, opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    const frag = Number(row.fragPct), pages = Number(row.pages);
    const density = row.densityPct == null || row.densityPct === '' ? null : Number(row.densityPct);
    if (!Number.isFinite(frag) || frag < 0 || frag > 100) throw new RangeError('fragmentation must be 0-100');
    if (!Number.isFinite(pages) || pages < 0) throw new RangeError('page count must be >= 0');
    if (density != null && (!Number.isFinite(density) || density < 0 || density > 100)) throw new RangeError('page density must be 0-100');
    const type = String(row.type || '').toUpperCase();
    if (type.includes('COLUMNSTORE')) return { action: 'columnstore', method: null, reasons: ['Columnstore fragmentation is measured by deleted rows per row group, not by this DMV. Use sys.dm_db_column_store_row_group_physical_stats.'] };
    if (type === 'HEAP' || row.index == null || /^null$/i.test(String(row.index))) return { action: 'heap', method: null, reasons: ['Heaps have no index to reorganize. ALTER TABLE ... REBUILD rebuilds a heap if you have a measured reason.'] };
    if (pages < o.minPages) return { action: 'ignore-small', method: null, reasons: [`Only ${pages} pages (below your ${o.minPages}-page floor). Rebuilding or reorganizing small indexes usually doesn't reduce fragmentation or help queries.`] };
    const reasons = [];
    if (frag >= o.fragPct) reasons.push(`Fragmentation ${frag.toFixed(1)}% is at or above your ${o.fragPct}% review trigger.`);
    if (density != null && density < o.densityPct) reasons.push(`Page density ${density.toFixed(1)}% is below your ${o.densityPct}% review trigger.`);
    if (!reasons.length) return { action: 'healthy', method: null, reasons: ['Below your review triggers. Leave it alone.'] };
    if (row.allowPageLocks === false) return { action: 'candidate', method: 'rebuild', reasons: [...reasons, 'ALLOW_PAGE_LOCKS is OFF, so REORGANIZE is not possible; use REBUILD.'] };
    return { action: 'candidate', method: 'reorganize', reasons: [...reasons, 'REORGANIZE is less resource intensive and always online, so it is the preferred first step. Update statistics and measure first.'] };
}

/** T-SQL for a triage result. */
export function maintenanceSql(row, method, { online = false, maxdop = 0 } = {}) {
    const target = `${quote(row.index)} ON ${quote(row.schema || 'dbo')}.${quote(row.object)}`;
    if (method === 'reorganize') return `ALTER INDEX ${target} REORGANIZE;\nUPDATE STATISTICS ${quote(row.schema || 'dbo')}.${quote(row.object)} ${quote(row.index)};`;
    if (method === 'rebuild') {
        const w = [];
        if (online) w.push('ONLINE = ON');
        if (maxdop > 0) w.push(`MAXDOP = ${Math.floor(maxdop)}`);
        return `ALTER INDEX ${target} REBUILD${w.length ? ` WITH (${w.join(', ')})` : ''};`;
    }
    return '';
}

const COLS = { schema: /schema/i, object: /object|table/i, index: /index_name|^index$/i, type: /type/i, fragPct: /frag/i, densityPct: /page_space|density/i, pages: /page_count|pages/i };

/** Parse tab- or comma-separated rows pasted from SSMS/Azure Data Studio (header row optional). */
export function parseRows(text) {
    const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^-+(\s+-+)*$/.test(l));
    if (!lines.length) return [];
    const sep = lines[0].includes('\t') ? '\t' : ',';
    const split = (l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    let order = ['schema', 'object', 'index', 'type', 'fragPct', 'densityPct', 'pages'];
    const head = split(lines[0]);
    let start = 0;
    if (head.some((h) => /frag/i.test(h))) {
        start = 1;
        order = head.map((h) => {
            if (/alloc/i.test(h)) return null;
            for (const [k, re] of Object.entries(COLS)) if (re.test(h)) return k;
            return null;
        });
        // "index_type" matches both index and type: resolve by exact names
        order = head.map((h, i) => (/^index_type$/i.test(h) ? 'type' : /^index_name$/i.test(h) ? 'index' : order[i]));
    }
    const rows = [];
    for (const line of lines.slice(start)) {
        const cells = split(line);
        if (cells.length < 5) continue;
        const r = {};
        order.forEach((k, i) => { if (k) r[k] = cells[i]; });
        if (r.index === undefined || /^null$/i.test(r.index)) r.index = null;
        r.fragPct = parseFloat(r.fragPct); r.pages = parseInt(r.pages, 10);
        r.densityPct = r.densityPct === undefined || r.densityPct === '' || /^null$/i.test(r.densityPct) ? null : parseFloat(r.densityPct);
        if (!Number.isFinite(r.fragPct) || !Number.isFinite(r.pages)) continue;
        rows.push(r);
    }
    return rows;
}
