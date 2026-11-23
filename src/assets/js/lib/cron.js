// Standard 5-field cron (minute hour day-of-month month day-of-week) parser, explainer and next-run calculator.
const FIELDS = [
    { name: 'minute', min: 0, max: 59 },
    { name: 'hour', min: 0, max: 23 },
    { name: 'day of month', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12, names: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] },
    { name: 'day of week', min: 0, max: 7, names: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
];
const MACROS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseValue(v, f) {
    const up = v.toUpperCase();
    if (f.names) { const i = f.names.indexOf(up); if (i >= 0) return i + (f.name === 'month' ? 1 : 0); }
    if (!/^\d+$/.test(v)) throw new Error(`Invalid value "${v}" in ${f.name}`);
    const n = Number(v);
    if (n < f.min || n > f.max) throw new Error(`${f.name} value ${n} out of range ${f.min}-${f.max}`);
    return n;
}

function parseField(expr, f) {
    const set = new Set();
    for (const part of expr.split(',')) {
        if (!part) throw new Error(`Empty list item in ${f.name}`);
        const [rangePart, stepPart] = part.split('/');
        const step = stepPart === undefined ? 1 : Number(stepPart);
        if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step "${stepPart}" in ${f.name}`);
        let lo; let hi;
        if (rangePart === '*') { lo = f.min; hi = f.name === 'day of week' ? 6 : f.max; }
        else if (rangePart.includes('-')) { const [a, b] = rangePart.split('-'); lo = parseValue(a, f); hi = parseValue(b, f); if (lo > hi) throw new Error(`Range ${rangePart} is backwards in ${f.name}`); }
        else { lo = parseValue(rangePart, f); hi = stepPart === undefined ? lo : (f.name === 'day of week' ? 6 : f.max); }
        for (let i = lo; i <= hi; i += step) set.add(f.name === 'day of week' && i === 7 ? 0 : i);
    }
    return [...set].sort((a, b) => a - b);
}

export function parseCron(expression) {
    let expr = String(expression || '').trim();
    if (MACROS[expr.toLowerCase()]) expr = MACROS[expr.toLowerCase()];
    if (expr.toLowerCase() === '@reboot') throw new Error('@reboot runs once at startup and has no schedule.');
    const parts = expr.split(/\s+/);
    if (parts.length !== 5) throw new Error(`Expected 5 fields (minute hour day month weekday), got ${parts.length}.`);
    const values = parts.map((p, i) => parseField(p, FIELDS[i]));
    return { expr, parts, minute: values[0], hour: values[1], dom: values[2], month: values[3], dow: values[4], domStar: parts[2] === '*', dowStar: parts[4] === '*' };
}

const pad = (n) => String(n).padStart(2, '0');
const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10 < 4 ? n % 10 : 0] || 'th'}`;

function describeStep(part, unit, f) {
    const m = /^(\*|\d+)\/(\d+)$/.exec(part);
    if (m) return `every ${m[2]} ${unit}s${m[1] !== '*' && Number(m[1]) !== f.min ? ` starting at ${unit} ${m[1]}` : ''}`;
    return null;
}

export function describeCron(expression) {
    const c = parseCron(expression);
    const [mi, ho, dm, mo, dw] = c.parts;
    let time;
    if (mi === '*' && ho === '*') time = 'every minute';
    else if (describeStep(mi, 'minute', FIELDS[0]) && ho === '*') time = describeStep(mi, 'minute', FIELDS[0]);
    else if (describeStep(mi, 'minute', FIELDS[0]) && /^\d+-\d+$/.test(ho)) time = `${describeStep(mi, 'minute', FIELDS[0])} between ${pad(c.hour[0])}:00 and ${pad(c.hour[c.hour.length - 1])}:59`;
    else if (c.minute.length === 1 && c.hour.length === 1) time = `at ${pad(c.hour[0])}:${pad(c.minute[0])}`;
    else if (c.minute.length === 1 && ho === '*') time = `at minute ${c.minute[0]} of every hour`;
    else if (c.minute.length === 1 && describeStep(ho, 'hour', FIELDS[1])) time = `at minute ${c.minute[0]}, ${describeStep(ho, 'hour', FIELDS[1])}`;
    else if (c.minute.length === 1 && c.hour.length <= 6) time = `at ${list(c.hour.map((h) => `${pad(h)}:${pad(c.minute[0])}`))}`;
    else time = `${mi === '*' ? 'every minute' : `at minute ${list(c.minute.map(String))}`}${ho === '*' ? '' : ` past hour ${list(c.hour.map(String))}`}`;

    const bits = [time];
    if (!c.domStar) bits.push(`on the ${list(c.dom.map(ordinal))} of the month`);
    if (!c.dowStar) {
        const consecutive = c.dow.length >= 3 && c.dow.every((d, i) => i === 0 || d === c.dow[i - 1] + 1);
        const days = consecutive ? `${DAYS[c.dow[0]]} through ${DAYS[c.dow[c.dow.length - 1]]}` : list(c.dow.map((d) => DAYS[d]));
        bits.push(`${c.domStar ? 'on' : 'or on'} ${days}`);
    }
    if (mo !== '*') bits.push(`in ${list(c.month.map((m) => MONTHS[m - 1]))}`);
    const s = bits.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

/** Next n run times after `from` (Date), evaluated in local time of the Date object (or UTC if utc=true). */
export function nextRuns(expression, n = 5, from = new Date(), { utc = false } = {}) {
    const c = parseCron(expression);
    const get = (d) => (utc
        ? { mi: d.getUTCMinutes(), h: d.getUTCHours(), dm: d.getUTCDate(), mo: d.getUTCMonth() + 1, dw: d.getUTCDay() }
        : { mi: d.getMinutes(), h: d.getHours(), dm: d.getDate(), mo: d.getMonth() + 1, dw: d.getDay() });
    const out = [];
    const d = new Date(from.getTime());
    d.setSeconds(0, 0);
    d.setTime(d.getTime() + 60000);
    const limit = 60 * 24 * 366 * 5; // search up to ~5 years
    for (let i = 0; i < limit && out.length < n; i++) {
        const t = get(d);
        const dayOk = c.domStar && c.dowStar ? true
            : c.domStar ? c.dow.includes(t.dw)
            : c.dowStar ? c.dom.includes(t.dm)
            : c.dom.includes(t.dm) || c.dow.includes(t.dw); // POSIX: OR when both are restricted
        if (c.month.includes(t.mo) && dayOk && c.hour.includes(t.h) && c.minute.includes(t.mi)) out.push(new Date(d.getTime()));
        // Skip ahead quickly when hour/day doesn't match.
        if (!c.month.includes(t.mo) || !dayOk) { d.setTime(d.getTime() + (60 - t.mi) * 60000 + (23 - t.h) * 3600000); continue; }
        if (!c.hour.includes(t.h)) { d.setTime(d.getTime() + (60 - t.mi) * 60000); continue; }
        d.setTime(d.getTime() + 60000);
    }
    return out;
}
