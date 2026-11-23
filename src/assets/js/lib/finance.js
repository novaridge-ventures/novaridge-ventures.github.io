// Small, dependency-free finance helpers. All functions are pure.
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** VAT: mode 'add' (amount excludes VAT) or 'remove' (amount includes VAT). */
export function vat(amount, ratePct = 15, mode = 'add') {
    const a = Number(amount) || 0;
    const r = (Number(ratePct) || 0) / 100;
    if (mode === 'remove') { const excl = a / (1 + r); return { exclusive: excl, vat: a - excl, inclusive: a }; }
    return { exclusive: a, vat: a * r, inclusive: a * (1 + r) };
}

/** Freelancer rate from desired income, expenses and billable time. */
export function hourlyRate({ targetAnnualIncome, annualExpenses = 0, taxRatePct = 0, weeksOff = 6, hoursPerWeek = 40, billablePct = 70, profitMarginPct = 0 }) {
    const weeks = Math.max(0, 52 - (Number(weeksOff) || 0));
    const billableHours = weeks * (Number(hoursPerWeek) || 0) * ((Number(billablePct) || 0) / 100);
    const tax = Math.min(0.95, (Number(taxRatePct) || 0) / 100);
    const grossNeeded = ((Number(targetAnnualIncome) || 0) / (1 - tax)) + (Number(annualExpenses) || 0);
    const withMargin = grossNeeded * (1 + (Number(profitMarginPct) || 0) / 100);
    const hourly = billableHours > 0 ? withMargin / billableHours : 0;
    return { billableHours, grossNeeded: withMargin, hourly, daily: hourly * 8, weekly: hourly * (Number(hoursPerWeek) || 0) * ((Number(billablePct) || 0) / 100), monthly: withMargin / 12 };
}

/** Amortised loan / home loan (bond) repayment. */
export function loanRepayment({ principal, annualRatePct, years, extraMonthly = 0 }) {
    const P = Math.max(0, Number(principal) || 0);
    const n = Math.round((Number(years) || 0) * 12);
    const r = (Number(annualRatePct) || 0) / 100 / 12;
    if (!n) return { monthly: 0, totalPaid: 0, totalInterest: 0, months: 0 };
    const monthly = r === 0 ? P / n : (P * r) / (1 - (1 + r) ** -n);
    // Simulate to account for extra payments.
    let bal = P; let months = 0; let interest = 0; const pay = monthly + (Number(extraMonthly) || 0);
    while (bal > 0.005 && months < 1200) { const i = bal * r; interest += i; bal = bal + i - pay; months++; }
    return { monthly, totalPaid: P + interest, totalInterest: interest, months };
}

/** Compound growth with monthly contributions (contributions at end of month). */
export function compound({ initial = 0, monthly = 0, annualRatePct = 0, years = 0, escalationPct = 0 }) {
    const r = (Number(annualRatePct) || 0) / 100 / 12;
    const months = Math.round((Number(years) || 0) * 12);
    let bal = Number(initial) || 0; let contributed = bal; let c = Number(monthly) || 0;
    const yearly = [];
    for (let m = 1; m <= months; m++) {
        bal = bal * (1 + r) + c; contributed += c;
        if (m % 12 === 0) { yearly.push({ year: m / 12, balance: bal, contributed }); c *= 1 + (Number(escalationPct) || 0) / 100; }
    }
    return { finalBalance: bal, contributed, growth: bal - contributed, yearly };
}

/** Margin / markup from cost and price. Provide any two of cost, price, marginPct, markupPct. */
export function marginMarkup({ cost, price, marginPct, markupPct }) {
    let c = cost === '' || cost == null ? null : Number(cost);
    let p = price === '' || price == null ? null : Number(price);
    if (c != null && p == null && marginPct != null && marginPct !== '') p = c / (1 - Number(marginPct) / 100);
    if (c != null && p == null && markupPct != null && markupPct !== '') p = c * (1 + Number(markupPct) / 100);
    if (p != null && c == null && marginPct != null && marginPct !== '') c = p * (1 - Number(marginPct) / 100);
    if (p != null && c == null && markupPct != null && markupPct !== '') c = p / (1 + Number(markupPct) / 100);
    if (c == null || p == null) return null;
    const profit = p - c;
    return { cost: c, price: p, profit, marginPct: p ? (profit / p) * 100 : 0, markupPct: c ? (profit / c) * 100 : 0 };
}

export function invoiceTotals(lines, { vatRatePct = 15, vatEnabled = true, discountPct = 0 } = {}) {
    const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
    const discount = subtotal * ((Number(discountPct) || 0) / 100);
    const net = subtotal - discount;
    const tax = vatEnabled ? net * ((Number(vatRatePct) || 0) / 100) : 0;
    return { subtotal: round2(subtotal), discount: round2(discount), net: round2(net), tax: round2(tax), total: round2(net + tax) };
}

export function formatMoney(n, currency = 'ZAR', locale = 'en-ZA') {
    try { return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n) || 0); } catch { return `${currency} ${round2(n).toFixed(2)}`; }
}
