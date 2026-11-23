import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { signatureString, sign, encodePf, checkoutPayload, PAYFAST_LIVE, PAYFAST_SANDBOX } from '../src/lib/payfast.mjs';

test('spaces encode as plus, not %20', () => {
    assert.equal(encodePf('Test Item'), 'Test+Item');
});

test('signature string skips empty fields, keeps order, appends passphrase', () => {
    const s = signatureString({
        merchant_id: '10000100',
        merchant_key: '46f0cd694581a',
        amount: '100.00',
        item_name: 'Test Item',
        item_description: '',
        return_url: 'https://example.com/return',
    }, 'secret pass');
    assert.equal(
        s,
        'merchant_id=10000100&merchant_key=46f0cd694581a&return_url=https%3A%2F%2Fexample.com%2Freturn&amount=100.00&item_name=Test+Item&passphrase=secret+pass',
    );
});

test('sign is the md5 of the signature string', () => {
    const fields = { merchant_id: '10000100', merchant_key: 'abc', amount: '10.00', item_name: 'A' };
    const raw = signatureString(fields, 'p');
    assert.equal(sign(fields, 'p'), createHash('md5').update(raw).digest('hex'));
});

test('checkout payload signs and points at live or sandbox', () => {
    const live = checkoutPayload({
        merchantId: '1', merchantKey: 'k', passphrase: 'p', sandbox: false,
        fields: { amount: '9.00', item_name: 'Kit' },
    });
    assert.equal(live.action, PAYFAST_LIVE);
    assert.equal(live.fields.merchant_id, '1');
    assert.equal(live.fields.signature, sign({ merchant_id: '1', merchant_key: 'k', amount: '9.00', item_name: 'Kit' }, 'p'));
    const sand = checkoutPayload({
        merchantId: '1', merchantKey: 'k', sandbox: true,
        fields: { amount: '9.00', item_name: 'Kit' },
    });
    assert.equal(sand.action, PAYFAST_SANDBOX);
});
