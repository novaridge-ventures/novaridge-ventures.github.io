import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triageIndex, maintenanceSql, parseRows } from '../src/assets/js/lib/indexmaint.js';

const base = { schema: 'dbo', object: 'Orders', index: 'IX_Orders_Date', type: 'NONCLUSTERED' };

test('triage: small, healthy, candidate, heap, columnstore', () => {
    assert.equal(triageIndex({ ...base, fragPct: 90, densityPct: 40, pages: 200 }).action, 'ignore-small');
    assert.equal(triageIndex({ ...base, fragPct: 10, densityPct: 95, pages: 50000 }).action, 'healthy');
    const c = triageIndex({ ...base, fragPct: 45, densityPct: 95, pages: 50000 });
    assert.equal(c.action, 'candidate'); assert.equal(c.method, 'reorganize');
    assert.equal(triageIndex({ ...base, fragPct: 5, densityPct: 60, pages: 50000 }).method, 'reorganize');
    assert.equal(triageIndex({ ...base, fragPct: 45, pages: 50000, allowPageLocks: false }).method, 'rebuild');
    assert.equal(triageIndex({ ...base, index: null, type: 'HEAP', fragPct: 80, pages: 50000 }).action, 'heap');
    assert.equal(triageIndex({ ...base, type: 'CLUSTERED COLUMNSTORE', fragPct: 80, pages: 50000 }).action, 'columnstore');
    assert.equal(triageIndex({ ...base, fragPct: 20, pages: 5000 }, { fragPct: 15 }).action, 'candidate');
    assert.throws(() => triageIndex({ ...base, fragPct: 120, pages: 10 }));
    assert.throws(() => triageIndex({ ...base, fragPct: 10, pages: -1 }));
});

test('maintenance SQL quotes names and adds options', () => {
    assert.equal(maintenanceSql({ ...base, index: 'IX]x' }, 'rebuild', { online: true, maxdop: 4 }), 'ALTER INDEX [IX]]x] ON [dbo].[Orders] REBUILD WITH (ONLINE = ON, MAXDOP = 4);');
    assert.match(maintenanceSql(base, 'reorganize'), /^ALTER INDEX \[IX_Orders_Date\] ON \[dbo\]\.\[Orders\] REORGANIZE;\nUPDATE STATISTICS/);
    assert.equal(maintenanceSql(base, null), '');
});

test('parseRows reads SSMS tab output with headers, and headerless CSV', () => {
    const tsv = 'schema_name\tobject_name\tindex_name\tindex_type\tavg_fragmentation_in_percent\tavg_page_space_used_in_percent\tpage_count\talloc_unit_type_desc\n'
        + 'dbo\tFactProductInventory\tPK_FactProductInventory\tCLUSTERED\t0.39\t99.72\t3846\tIN_ROW_DATA\n'
        + 'dbo\tFactFinance\tNULL\tHEAP\t0\t99.79\t239\tIN_ROW_DATA';
    const r = parseRows(tsv);
    assert.equal(r.length, 2);
    assert.deepEqual(r[0], { schema: 'dbo', object: 'FactProductInventory', index: 'PK_FactProductInventory', type: 'CLUSTERED', fragPct: 0.39, densityPct: 99.72, pages: 3846 });
    assert.equal(r[1].index, null);
    const csv = parseRows('sales,Orders,IX_A,NONCLUSTERED,42.5,,12000');
    assert.equal(csv[0].densityPct, null); assert.equal(csv[0].pages, 12000); assert.equal(csv[0].schema, 'sales');
    assert.deepEqual(parseRows(''), []);
});
