import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invoiceTypeRequired, missingFields } from '../src/assets/js/lib/vatinvoice.js';

test('invoice type thresholds follow s20(4)/(5) and the R50 rule', () => {
    assert.equal(invoiceTypeRequired(50).type, 'none');
    assert.equal(invoiceTypeRequired(50.01).type, 'abridged');
    assert.equal(invoiceTypeRequired(5000).type, 'abridged');
    assert.equal(invoiceTypeRequired(5000.01).type, 'full');
    assert.equal(invoiceTypeRequired(100, true).type, 'full');
    assert.throws(() => invoiceTypeRequired(-1));
});

test('missing fields for full and abridged invoices', () => {
    assert.deepEqual(missingFields('abridged', ['words', 'supplier', 'serial', 'description', 'amounts']), []);
    assert.deepEqual(missingFields('full', ['words', 'supplier', 'serial', 'description', 'amounts']), ['recipient', 'quantity']);
    assert.deepEqual(missingFields('none', []), []);
});
