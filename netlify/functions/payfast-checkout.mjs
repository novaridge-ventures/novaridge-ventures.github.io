/**
 * Signs a PayFast checkout for one shop product. Deploy this repo (or this function)
 * to Netlify, then set PAYFAST_* environment variables and put the function URL in
 * site.config.json as payfast.checkoutUrl (for example https://<site>.netlify.app/.netlify/functions/payfast-checkout).
 *
 * Never put the merchant key or passphrase in the static GitHub Pages site.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkoutPayload } from '../../src/lib/payfast.mjs';

function loadProducts() {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
    const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
    return cfg.products || [];
}

const headers = {
    'Access-Control-Allow-Origin': 'https://novaridge-ventures.github.io',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };

    const merchantId = process.env.PAYFAST_MERCHANT_ID || '';
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || '';
    const passphrase = process.env.PAYFAST_PASSPHRASE || '';
    if (!merchantId || !merchantKey) {
        return { statusCode: 503, headers, body: JSON.stringify({ error: 'PayFast is not configured yet.' }) };
    }

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const product = loadProducts().find((p) => p.id && p.id === body.sku);
    if (!product) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Unknown product' }) };
    const amount = Number(product.priceZar);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'This product does not have a ZAR price yet.' }) };
    }

    const site = (process.env.SITE_URL || 'https://novaridge-ventures.github.io').replace(/\/$/, '');
    const payload = checkoutPayload({
        merchantId,
        merchantKey,
        passphrase,
        sandbox: process.env.PAYFAST_SANDBOX === 'true',
        fields: {
            return_url: `${site}/shop/?paid=${encodeURIComponent(product.id)}`,
            cancel_url: `${site}/shop/?cancelled=${encodeURIComponent(product.id)}`,
            notify_url: process.env.PAYFAST_NOTIFY_URL || '',
            m_payment_id: `${product.id}-${Date.now()}`,
            amount: amount.toFixed(2),
            item_name: product.name.slice(0, 100),
            item_description: (product.blurb || '').slice(0, 255),
            email_confirmation: '1',
            confirmation_address: process.env.PAYFAST_CONFIRMATION_EMAIL || 'novaridgeventures@gmail.com',
            custom_str1: product.id,
        },
    });
    return { statusCode: 200, headers, body: JSON.stringify(payload) };
}
