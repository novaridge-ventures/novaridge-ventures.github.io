// Which SA tax invoice is required for a supply (VAT Act 89 of 1991, s20 and SARS VAT 404).
// consideration: amount in rand including VAT. zeroRated: true for zero-rated supplies (e.g. exports).
export function invoiceTypeRequired(consideration, zeroRated = false) {
    const c = Number(consideration);
    if (!Number.isFinite(c) || c < 0) throw new Error('consideration must be a non-negative number');
    if (zeroRated) return { type: 'full', section: '20(4)', reason: 'Zero-rated supplies need a full tax invoice even below R5 000 (proviso to s20(5)).' };
    if (c <= 50) return { type: 'none', section: '20(6)', reason: 'R50 or less: no tax invoice required, but keep a till slip or sales docket showing the VAT.' };
    if (c <= 5000) return { type: 'abridged', section: '20(5)', reason: 'R5 000 or less: an abridged tax invoice is enough (a full one is also fine).' };
    return { type: 'full', section: '20(4)', reason: 'More than R5 000: a full tax invoice is required.' };
}

export const FULL_FIELDS = ['words', 'supplier', 'recipient', 'serial', 'description', 'quantity', 'amounts'];
export const ABRIDGED_FIELDS = ['words', 'supplier', 'serial', 'description', 'amounts'];

// Returns the required fields missing from a set of fields present on the invoice.
export function missingFields(type, present) {
    const need = type === 'full' ? FULL_FIELDS : type === 'abridged' ? ABRIDGED_FIELDS : [];
    const have = new Set(present);
    return need.filter((f) => !have.has(f));
}
