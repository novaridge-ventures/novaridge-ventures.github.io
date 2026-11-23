// Lightweight SQL formatter (T-SQL / PostgreSQL / MySQL friendly). Tokenizes so strings, quoted identifiers and comments are never altered.
const NEWLINE_BEFORE = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'DELETE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN', 'CROSS JOIN', 'CROSS APPLY', 'OUTER APPLY', 'JOIN', 'WITH', 'RETURNING', 'MERGE', 'WHEN MATCHED', 'WHEN NOT MATCHED', 'OUTPUT', 'WINDOW', 'FETCH', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'BEGIN', 'END', 'DECLARE', 'GO'];
const SUB_CLAUSE = ['AND', 'OR', 'ON', 'WHEN', 'ELSE'];
const KEYWORDS = new Set(('ADD ALL ALTER AND ANY APPLY AS ASC BEGIN BETWEEN BY CASE CAST COALESCE COLUMN CONSTRAINT CONVERT COUNT CREATE CROSS CURRENT_DATE CURRENT_TIMESTAMP DATABASE DECLARE DEFAULT DELETE DESC DISTINCT DROP ELSE END EXCEPT EXEC EXISTS FETCH FIRST FOREIGN FROM FULL GO GROUP HAVING IF IN INDEX INNER INSERT INTERSECT INTO IS JOIN KEY LEFT LIKE ILIKE LIMIT MATCHED MAX MERGE MIN NEXT NOT NULL NULLS OFFSET ON ONLY OR ORDER OUTER OUTPUT OVER PARTITION PRIMARY PROCEDURE REFERENCES RETURNING RIGHT ROWS ROW SELECT SET SUM AVG TABLE TOP THEN UNION UNIQUE UPDATE USING VALUES VIEW WHEN WHERE WITH WINDOW NOLOCK TRUNCATE ROLLBACK COMMIT TRANSACTION TRAN PROC RETURN RETURNS FUNCTION TRIGGER IDENTITY VARCHAR NVARCHAR INT BIGINT DECIMAL NUMERIC DATE DATETIME DATETIME2 BIT TEXT BOOLEAN SERIAL INTERVAL LATERAL RECURSIVE').split(' '));

export function tokenize(sql) {
    const tokens = []; const s = String(sql); let i = 0;
    const push = (type, value) => tokens.push({ type, value });
    while (i < s.length) {
        const ch = s[i]; const rest = s.slice(i);
        if (/\s/.test(ch)) { i++; continue; }
        if (rest.startsWith('--')) { const e = s.indexOf('\n', i); const end = e < 0 ? s.length : e; push('comment', s.slice(i, end)); i = end; continue; }
        if (rest.startsWith('/*')) { const e = s.indexOf('*/', i + 2); const end = e < 0 ? s.length : e + 2; push('blockcomment', s.slice(i, end)); i = end; continue; }
        if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
            const close = ch === '[' ? ']' : ch; let j = i + 1;
            while (j < s.length) { if (s[j] === close) { if (s[j + 1] === close && close !== ']') { j += 2; continue; } break; } j++; }
            push(ch === "'" ? 'string' : 'ident', s.slice(i, j + 1)); i = j + 1; continue;
        }
        if (/[(),;]/.test(ch)) { push(ch, ch); i++; continue; }
        const m = /^(?:[A-Za-z_@#$][\w@#$]*(?:\.[A-Za-z_*@#$][\w@#$]*|\.\*|\.\[[^\]]*\]|\."[^"]*")*|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|::|<>|!=|<=|>=|\|\||[-+*/%=<>!~^&|.:])/.exec(rest);
        const v = m ? m[0] : ch;
        push(/^[A-Za-z_]/.test(v) ? 'word' : /^\d/.test(v) ? 'number' : 'op', v); i += v.length;
    }
    return tokens;
}

export function formatSql(sql, { indent = '    ', uppercase = true } = {}) {
    const toks = tokenize(sql);
    const lines = []; let line = ''; let depth = 0; const parenStack = [];
    const ind = () => indent.repeat(Math.max(0, depth));
    const flush = () => { if (line.trim()) lines.push(line.replace(/\s+$/, '')); line = ''; };
    const newline = (extra = 0) => { flush(); line = indent.repeat(Math.max(0, depth + extra)); };
    const append = (v) => { if (line.trim() && !/[\s(]$/.test(line) && !/^[,)]/.test(v) && !/\.$/.test(line)) line += ' '; else if (!line) line = ind(); line += v; };

    for (let k = 0; k < toks.length; k++) {
        const t = toks[k];
        if (t.type === 'word') {
            const up = t.value.toUpperCase();
            // Look ahead to build multi-word clauses.
            let matched = null;
            for (const len of [3, 2, 1]) {
                const words = toks.slice(k, k + len);
                if (words.length < len || words.some((w) => w.type !== 'word')) continue;
                const phrase = words.map((w) => w.value.toUpperCase()).join(' ');
                if (NEWLINE_BEFORE.includes(phrase)) { matched = { phrase, len }; break; }
            }
            if (matched) {
                newline();
                append(uppercase ? matched.phrase : toks.slice(k, k + matched.len).map((w) => w.value).join(' '));
                k += matched.len - 1;
                if (['SELECT', 'SET', 'VALUES', 'GROUP BY', 'ORDER BY'].includes(matched.phrase)) { /* list follows */ }
                continue;
            }
            if (SUB_CLAUSE.includes(up)) {
                // Do not break AND inside BETWEEN x AND y.
                const prev3 = toks.slice(Math.max(0, k - 3), k).map((x) => String(x.value).toUpperCase());
                if (!(up === 'AND' && prev3.includes('BETWEEN'))) { newline(1); append(uppercase ? up : t.value); continue; }
            }
            append(uppercase && KEYWORDS.has(up) ? up : t.value);
            continue;
        }
        if (t.type === '(') {
            const next = toks[k + 1];
            const isSub = next && next.type === 'word' && ['SELECT', 'WITH'].includes(next.value.toUpperCase());
            if (line.trim() && /[\w\])"]$/.test(line) && !/\b(IN|AS|EXISTS|ON|AND|OR|FROM|JOIN|VALUES)$/i.test(line.trim())) line += '('; else append('(');
            parenStack.push(isSub);
            if (isSub) { depth++; }
            continue;
        }
        if (t.type === ')') {
            const wasSub = parenStack.pop();
            if (wasSub) { depth--; newline(); line += ')'; } else line = line.replace(/\s+$/, '') + ')';
            continue;
        }
        if (t.type === ',') {
            line = line.replace(/\s+$/, '') + ',';
            const inParens = parenStack.length && !parenStack[parenStack.length - 1];
            if (!inParens) newline(1);
            continue;
        }
        if (t.type === ';') { line = line.replace(/\s+$/, '') + ';'; flush(); lines.push(''); depth = 0; continue; }
        if (t.type === 'comment') { append(t.value); flush(); line = ind(); continue; }
        if (t.type === 'blockcomment') { newline(); line += t.value; flush(); continue; }
        if (t.value === '.' || t.value === '::') { line = line.replace(/\s+$/, '') + t.value; continue; }
        append(t.value);
    }
    flush();
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
}

export function minifySql(sql) {
    return tokenize(sql).filter((t) => t.type !== 'comment' && t.type !== 'blockcomment').map((t) => t.value).join(' ')
        .replace(/\s*([(),;])\s*/g, (m, p) => (p === '(' ? '(' : p === ')' ? ')' : `${p} `)).replace(/\s+\./g, '.').replace(/\.\s+/g, '.').trim();
}
