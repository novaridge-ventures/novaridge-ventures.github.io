const $ = (id) => document.getElementById(id);

function params() {
    return new URLSearchParams(location.search);
}

function notice() {
    const q = params();
    const el = $('checkout-msg');
    if (!el) return;
    if (q.get('paid')) {
        el.hidden = false;
        el.textContent = 'Thank you. If the payment completed, your download link will arrive by email. If it does not, write to novaridgeventures@gmail.com with the payment reference.';
        return;
    }
    if (q.get('cancelled')) {
        el.hidden = false;
        el.textContent = 'The Instant EFT checkout was cancelled. No charge was made. You can try again or use the Payhip link on the product card.';
    }
}

async function startPayfast(sku) {
    const cfg = window.NOVARIDGE_SHOP || {};
    const btn = document.querySelector(`[data-sku="${sku}"]`);
    if (!cfg.checkoutUrl) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Redirecting…'; }
    try {
        const res = await fetch(cfg.checkoutUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout is unavailable.');
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.action;
        for (const [k, v] of Object.entries(data.fields || {})) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = v;
            form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
    } catch (err) {
        const el = $('checkout-msg');
        if (el) { el.hidden = false; el.textContent = err.message || 'Checkout is unavailable right now.'; }
        if (btn) { btn.disabled = false; btn.textContent = 'Pay with Instant EFT'; }
    }
}

document.querySelectorAll('[data-sku]').forEach((btn) => {
    btn.addEventListener('click', () => startPayfast(btn.getAttribute('data-sku')));
});
notice();
