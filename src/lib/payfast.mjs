/**
 * PayFast custom-integration signature.
 * Docs: https://developers.payfast.co.za/docs#step_2_signature
 *
 * Concatenate non-empty fields in the given order as name=urlencode(value) joined by &,
 * append &passphrase=urlencode(passphrase) when a passphrase is set, then MD5 (hex, lowercase).
 * Spaces are encoded as + (application/x-www-form-urlencoded).
 */
import { createHash } from 'node:crypto';

export const PAYFAST_LIVE = 'https://www.payfast.co.za/eng/process';
export const PAYFAST_SANDBOX = 'https://sandbox.payfast.co.za/eng/process';

/** Field order required by PayFast for the signature string. */
export const FIELD_ORDER = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'cell_number',
    'm_payment_id', 'amount', 'item_name', 'item_description',
    'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
    'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
    'email_confirmation', 'confirmation_address', 'payment_method',
];

export function encodePf(value) {
    return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

export function signatureString(fields, passphrase = '') {
    const parts = [];
    for (const key of FIELD_ORDER) {
        const raw = fields[key];
        if (raw === undefined || raw === null) continue;
        const value = String(raw).trim();
        if (!value) continue;
        parts.push(`${key}=${encodePf(value)}`);
    }
    const pass = String(passphrase || '').trim();
    if (pass) parts.push(`passphrase=${encodePf(pass)}`);
    return parts.join('&');
}

export function sign(fields, passphrase = '') {
    return createHash('md5').update(signatureString(fields, passphrase)).digest('hex');
}

export function checkoutPayload({ merchantId, merchantKey, passphrase = '', sandbox = false, fields }) {
    const data = { ...fields, merchant_id: merchantId, merchant_key: merchantKey };
    const signature = sign(data, passphrase);
    const signed = { ...data, signature };
    return {
        action: sandbox ? PAYFAST_SANDBOX : PAYFAST_LIVE,
        fields: signed,
    };
}
