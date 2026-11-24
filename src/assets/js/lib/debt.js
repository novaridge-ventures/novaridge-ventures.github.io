// Debt payoff simulator: snowball (smallest balance first) vs avalanche (highest rate first).
// Interest accrues monthly at APR/12 on the opening balance; every debt gets its minimum, and whatever is
// left of the fixed monthly budget (including minimums freed up by paid-off debts) goes to the target debt.
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function orderDebts(debts, strategy) {
    const list = debts.map((d, i) => ({ ...d, i }));
    if (strategy === 'avalanche') list.sort((a, b) => b.aprPct - a.aprPct || a.balance - b.balance || a.i - b.i);
    else list.sort((a, b) => a.balance - b.balance || b.aprPct - a.aprPct || a.i - b.i);
    return list.map((d) => d.i);
}

export function simulatePayoff(debtsIn, monthlyBudget, strategy = 'snowball', maxMonths = 600) {
    const debts = debtsIn
        .map((d, i) => ({ name: d.name || `Debt ${i + 1}`, balance: Math.max(0, +d.balance || 0), aprPct: Math.max(0, +d.aprPct || 0), minPayment: Math.max(0, +d.minPayment || 0) }))
        .filter((d) => d.balance > 0);
    const minTotal = debts.reduce((s, d) => s + d.minPayment, 0);
    const base = { strategy, minTotal: r2(minTotal), budget: r2(+monthlyBudget || 0) };
    if (!debts.length) return { ...base, feasible: true, months: 0, totalInterest: 0, totalPaid: 0, payoffs: [] };
    if (monthlyBudget < minTotal) return { ...base, feasible: false, reason: 'budget-below-minimums', months: null, totalInterest: null, totalPaid: null, payoffs: [] };
    const order = orderDebts(debts, strategy);
    const bal = debts.map((d) => d.balance);
    const paidOff = debts.map(() => null);
    let totalInterest = 0, totalPaid = 0, month = 0;
    while (bal.some((b) => b > 0.005) && month < maxMonths) {
        month++;
        for (let k = 0; k < bal.length; k++) if (bal[k] > 0) { const int = r2(bal[k] * debts[k].aprPct / 1200); bal[k] = r2(bal[k] + int); totalInterest += int; }
        let pool = monthlyBudget;
        for (let k = 0; k < bal.length; k++) if (bal[k] > 0) { const p = Math.min(bal[k], debts[k].minPayment, pool); bal[k] = r2(bal[k] - p); pool -= p; totalPaid += p; }
        for (const k of order) { if (pool <= 0.005) break; if (bal[k] > 0) { const p = Math.min(bal[k], pool); bal[k] = r2(bal[k] - p); pool -= p; totalPaid += p; } }
        for (let k = 0; k < bal.length; k++) if (bal[k] <= 0.005 && paidOff[k] === null) { bal[k] = 0; paidOff[k] = month; }
    }
    const done = bal.every((b) => b <= 0.005);
    const payoffs = order.map((k) => ({ name: debts[k].name, month: paidOff[k] })).sort((a, b) => (a.month ?? 1e9) - (b.month ?? 1e9));
    return { ...base, feasible: done, reason: done ? null : 'not-paid-within-limit', months: done ? month : null, totalInterest: r2(totalInterest), totalPaid: r2(totalPaid), payoffs };
}

export function compareStrategies(debts, monthlyBudget) {
    const snowball = simulatePayoff(debts, monthlyBudget, 'snowball');
    const avalanche = simulatePayoff(debts, monthlyBudget, 'avalanche');
    const interestSaved = snowball.feasible && avalanche.feasible ? r2(snowball.totalInterest - avalanche.totalInterest) : null;
    return { snowball, avalanche, interestSaved };
}
