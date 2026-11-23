import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taxOnIncome, calculatePaye, rebateFor, medicalCreditAnnual } from '../src/assets/js/lib/tax.js';
import { vat, hourlyRate, loanRepayment, compound, marginMarkup, invoiceTotals } from '../src/assets/js/lib/finance.js';
import { jsonToCsv, csvToJson, parseCsv, flatten, detectDelimiter } from '../src/assets/js/lib/jsoncsv.js';
import { parseCron, describeCron, nextRuns } from '../src/assets/js/lib/cron.js';
import { formatSql, minifySql, tokenize } from '../src/assets/js/lib/sqlformat.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

test('SARS 2026/27 bracket boundaries match published bases', () => {
    near(taxOnIncome(245100), 44118);
    near(taxOnIncome(383100), 79998);
    near(taxOnIncome(530200), 125599);
    near(taxOnIncome(695800), 185215);
    near(taxOnIncome(887000), 259783);
    near(taxOnIncome(1878600), 666339);
    near(taxOnIncome(2000000), 666339 + 0.45 * 121400);
});

test('tax thresholds produce zero tax (rebates cancel tax at threshold)', () => {
    near(taxOnIncome(99000) - rebateFor(30), 0);
    near(taxOnIncome(153250) - rebateFor(70), 0, 1);
    near(taxOnIncome(171300) - rebateFor(80), 0, 1);
    assert.equal(calculatePaye({ grossMonthly: 99000 / 12, age: 30 }).annualTax, 0);
});

test('2025/26 table still available and consistent', () => {
    near(taxOnIncome(237100, '2026'), 42678);
    near(taxOnIncome(95750, '2026') - rebateFor(30, '2026'), 0);
});

test('PAYE example: R35 000/month, age 35', () => {
    const r = calculatePaye({ grossMonthly: 35000, age: 35 });
    // 420 000 taxable: 79 998 + 31% * 36 900 = 91 437 - 17 820 = 73 617
    near(r.annualTax, 73617);
    near(r.monthlyTax, 6134.75);
    near(r.uifMonthly, 177.12);
    assert.equal(r.marginalRate, 0.31);
});

test('retirement deduction capped at 27.5% and medical credits', () => {
    const r = calculatePaye({ grossMonthly: 50000, age: 40, retirementMonthly: 20000 });
    near(r.retirementDeduction, 600000 * 0.275);
    assert.equal(medicalCreditAnnual(3), (376 * 2 + 254) * 12);
    assert.equal(medicalCreditAnnual(0), 0);
});

test('VAT add/remove', () => {
    near(vat(1000, 15, 'add').inclusive, 1150);
    near(vat(1150, 15, 'remove').vat, 150);
});

test('hourly rate', () => {
    const r = hourlyRate({ targetAnnualIncome: 600000, annualExpenses: 60000, taxRatePct: 25, weeksOff: 6, hoursPerWeek: 40, billablePct: 50 });
    near(r.billableHours, 920);
    near(r.hourly, (800000 + 60000) / 920);
});

test('loan repayment matches amortisation formula and extra payments shorten term', () => {
    const r = loanRepayment({ principal: 1000000, annualRatePct: 12, years: 20 });
    near(r.monthly, 11010.86);
    const x = loanRepayment({ principal: 1000000, annualRatePct: 12, years: 20, extraMonthly: 2000 });
    assert.ok(x.months < 240 && x.totalInterest < r.totalInterest);
    near(loanRepayment({ principal: 1200, annualRatePct: 0, years: 1 }).monthly, 100);
});

test('compound growth', () => {
    near(compound({ initial: 1000, annualRatePct: 12, years: 1 }).finalBalance, 1126.83);
    near(compound({ monthly: 100, annualRatePct: 0, years: 2 }).finalBalance, 2400);
});

test('margin and markup', () => {
    const r = marginMarkup({ cost: 60, price: 100 });
    near(r.marginPct, 40); near(r.markupPct, 66.67);
    near(marginMarkup({ cost: 60, marginPct: 40 }).price, 100);
    near(marginMarkup({ cost: 100, markupPct: 50 }).price, 150);
});

test('invoice totals', () => {
    const t = invoiceTotals([{ qty: 2, price: 100 }, { qty: 1, price: 50.5 }], { vatRatePct: 15, vatEnabled: true, discountPct: 10 });
    assert.deepEqual(t, { subtotal: 250.5, discount: 25.05, net: 225.45, tax: 33.82, total: 259.27 });
});

test('JSON to CSV with nesting, quotes and commas', () => {
    const csv = jsonToCsv('[{"a":1,"b":{"c":"x, y"},"t":["p","q"]},{"a":2,"d":"say \\"hi\\""}]');
    assert.equal(csv, 'a,b.c,t,d\r\n1,"x, y",p; q,\r\n2,,,"say ""hi"""');
    assert.deepEqual(flatten({ a: { b: [1, { c: 2 }] } }), { 'a.b.0': 1, 'a.b.1.c': 2 });
    assert.equal(jsonToCsv({ data: [{ x: 1 }] }), 'x\r\n1');
});

test('CSV parsing round trip', () => {
    assert.deepEqual(parseCsv('a,b\r\n"1,2","x""y"\n3,\n'), [['a', 'b'], ['1,2', 'x"y'], ['3', '']]);
    assert.deepEqual(csvToJson('id;name;ok\n1;Thabo;true\n2;;false', { delimiter: ';' }), [{ id: 1, name: 'Thabo', ok: true }, { id: 2, name: null, ok: false }]);
    assert.equal(detectDelimiter('a;b;c\n1;2;3'), ';');
    assert.deepEqual(csvToJson(jsonToCsv([{ id: 7, n: 'a,b' }])), [{ id: 7, n: 'a,b' }]);
});

test('cron parsing, description and next runs', () => {
    assert.deepEqual(parseCron('*/15 * * * *').minute, [0, 15, 30, 45]);
    assert.deepEqual(parseCron('0 0 * * 7').dow, [0]);
    assert.deepEqual(parseCron('0 0 * jan-mar mon').month, [1, 2, 3]);
    assert.equal(describeCron('0 9 * * 1-5'), 'At 09:00 on Monday through Friday.');
    assert.equal(describeCron('*/15 9-17 * * 1-5'), 'Every 15 minutes between 09:00 and 17:59 on Monday through Friday.');
    assert.throws(() => parseCron('60 * * * *'));
    assert.throws(() => parseCron('* * *'));
    const runs = nextRuns('30 2 1 * *', 2, new Date('2026-11-23T10:00:00Z'), { utc: true });
    assert.deepEqual(runs.map((d) => d.toISOString()), ['2026-12-01T02:30:00.000Z', '2027-01-01T02:30:00.000Z']);
    const either = nextRuns('0 0 13 * 5', 3, new Date('2026-11-23T10:00:00Z'), { utc: true }).map((d) => d.toISOString().slice(0, 10));
    assert.deepEqual(either, ['2026-11-27', '2026-12-04', '2026-12-11']);
    assert.equal(nextRuns('0 0 29 2 *', 1, new Date('2026-03-01T00:00:00Z'), { utc: true })[0].toISOString().slice(0, 10), '2028-02-29');
});

test('SQL formatter keeps strings/identifiers and breaks clauses', () => {
    const out = formatSql("select a, 'it''s from x' as [Weird Name] from t where x=1 and y between 1 and 2 -- c");
    assert.match(out, /^SELECT a,\n {4}'it''s from x' AS \[Weird Name\]\nFROM t\nWHERE x = 1\n {4}AND y BETWEEN 1 AND 2 -- c$/);
    assert.equal(minifySql('select a,\n b -- x\n from t'), 'select a, b from t');
    assert.ok(tokenize('/* a */ select 1').some((t) => t.type === 'blockcomment'));
    assert.match(formatSql('select * from (select id from t) s'), /FROM \(\n {4}SELECT id\n {4}FROM t\n\) s/);
});
