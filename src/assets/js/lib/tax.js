// South African personal income tax (PAYE estimate) — 2026/27 tax year (1 Mar 2026 – 28 Feb 2027).
// Source: SARS "Rates of Tax for Individuals" and Budget 2026 tax guide (published 25 Feb 2026).
export const TAX_YEARS = {
    '2027': {
        label: '2026/27 (1 Mar 2026 – 28 Feb 2027)',
        brackets: [
            { upTo: 245100, base: 0, rate: 0.18, over: 0 },
            { upTo: 383100, base: 44118, rate: 0.26, over: 245100 },
            { upTo: 530200, base: 79998, rate: 0.31, over: 383100 },
            { upTo: 695800, base: 125599, rate: 0.36, over: 530200 },
            { upTo: 887000, base: 185215, rate: 0.39, over: 695800 },
            { upTo: 1878600, base: 259783, rate: 0.41, over: 887000 },
            { upTo: Infinity, base: 666339, rate: 0.45, over: 1878600 },
        ],
        rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
        thresholds: { under65: 99000, '65to74': 153250, '75plus': 171300 },
        medicalCredit: { firstTwo: 376, additional: 254 },
        retirementCap: { pct: 0.275, max: 350000 },
    },
    '2026': {
        label: '2025/26 (1 Mar 2025 – 28 Feb 2026)',
        brackets: [
            { upTo: 237100, base: 0, rate: 0.18, over: 0 },
            { upTo: 370500, base: 42678, rate: 0.26, over: 237100 },
            { upTo: 512800, base: 77362, rate: 0.31, over: 370500 },
            { upTo: 673000, base: 121475, rate: 0.36, over: 512800 },
            { upTo: 857900, base: 179147, rate: 0.39, over: 673000 },
            { upTo: 1817000, base: 251258, rate: 0.41, over: 857900 },
            { upTo: Infinity, base: 644489, rate: 0.45, over: 1817000 },
        ],
        rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
        thresholds: { under65: 95750, '65to74': 148217, '75plus': 165689 },
        medicalCredit: { firstTwo: 364, additional: 246 },
        retirementCap: { pct: 0.275, max: 350000 },
    },
};

// UIF: 1% employee contribution on remuneration up to R17 712 per month (max R177.12).
export const UIF = { rate: 0.01, monthlyCeiling: 17712 };

export function taxOnIncome(taxable, year = '2027') {
    const t = TAX_YEARS[year];
    if (!t) throw new Error(`Unknown tax year ${year}`);
    const x = Math.max(0, taxable);
    const b = t.brackets.find((br) => x <= br.upTo);
    return b.base + (x - b.over) * b.rate;
}

export function rebateFor(age, year = '2027') {
    const r = TAX_YEARS[year].rebates;
    return r.primary + (age >= 65 ? r.secondary : 0) + (age >= 75 ? r.tertiary : 0);
}

export function medicalCreditAnnual(members, year = '2027', months = 12) {
    const m = Math.max(0, Math.floor(members || 0));
    if (!m) return 0;
    const c = TAX_YEARS[year].medicalCredit;
    return (Math.min(m, 2) * c.firstTwo + Math.max(0, m - 2) * c.additional) * months;
}

/**
 * Estimate annual and monthly tax.
 * @param {object} p { grossMonthly, annualBonus, age, retirementMonthly, medicalMembers, year }
 */
export function calculatePaye(p) {
    const year = p.year || '2027';
    const t = TAX_YEARS[year];
    const grossMonthly = Math.max(0, Number(p.grossMonthly) || 0);
    const bonus = Math.max(0, Number(p.annualBonus) || 0);
    const age = Number(p.age) || 30;
    const grossAnnual = grossMonthly * 12 + bonus;
    const retirementAnnual = Math.max(0, Number(p.retirementMonthly) || 0) * 12;
    const retirementDeduction = Math.min(retirementAnnual, grossAnnual * t.retirementCap.pct, t.retirementCap.max);
    const taxable = Math.max(0, grossAnnual - retirementDeduction);
    const taxBeforeRebates = taxOnIncome(taxable, year);
    const rebates = rebateFor(age, year);
    const medical = medicalCreditAnnual(p.medicalMembers, year);
    const annualTax = Math.max(0, taxBeforeRebates - rebates - medical);
    const uifMonthly = Math.min(grossMonthly, UIF.monthlyCeiling) * UIF.rate;
    const marginal = taxable > 0 ? t.brackets.find((br) => taxable <= br.upTo).rate : 0;
    const net = grossAnnual - annualTax - uifMonthly * 12 - retirementAnnual;
    return {
        year, grossAnnual, taxable, retirementDeduction, taxBeforeRebates, rebates, medicalCredit: medical,
        annualTax, monthlyTax: annualTax / 12, uifMonthly, uifAnnual: uifMonthly * 12,
        netAnnual: net, netMonthly: net / 12,
        effectiveRate: grossAnnual ? annualTax / grossAnnual : 0, marginalRate: marginal,
    };
}

/**
 * Provisional tax (IRP6) estimate for freelancers / sole proprietors.
 * Payment 1 (end Aug): 50% of the estimated annual liability less employees' tax (PAYE) for the first 6 months.
 * Payment 2 (end Feb): full estimated liability less PAYE for the full year and less payment 1.
 * @param {object} p { turnover, expenses, otherIncome, retirementAnnual, age, medicalMembers, payeFirstHalf, payeFullYear, year }
 */
export function provisionalTax(p) {
    const year = p.year || '2027';
    const t = TAX_YEARS[year];
    const n = (v) => Math.max(0, Number(v) || 0);
    const businessProfit = Number(p.turnover || 0) - n(p.expenses);
    const incomeBeforeRa = Math.max(0, businessProfit + n(p.otherIncome));
    const retirementDeduction = Math.min(n(p.retirementAnnual), incomeBeforeRa * t.retirementCap.pct, t.retirementCap.max);
    const taxable = Math.max(0, incomeBeforeRa - retirementDeduction);
    const taxBeforeRebates = taxOnIncome(taxable, year);
    const rebates = rebateFor(Number(p.age) || 30, year);
    const medical = medicalCreditAnnual(p.medicalMembers, year);
    const liability = Math.max(0, taxBeforeRebates - rebates - medical);
    const payeFirstHalf = n(p.payeFirstHalf);
    const payeFullYear = Math.max(n(p.payeFullYear), payeFirstHalf);
    const first = Math.max(0, liability / 2 - payeFirstHalf);
    const second = Math.max(0, liability - payeFullYear - first);
    const marginal = taxable > 0 ? t.brackets.find((br) => taxable <= br.upTo).rate : 0;
    return {
        year, businessProfit, incomeBeforeRa, retirementDeduction, taxable, taxBeforeRebates, rebates, medicalCredit: medical,
        liability, payeFullYear, first, second, totalProvisional: first + second,
        monthlySetAside: (first + second) / 12, effectiveRate: incomeBeforeRa ? liability / incomeBeforeRa : 0, marginalRate: marginal,
    };
}
