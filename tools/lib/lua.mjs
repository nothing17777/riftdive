// Parser for the simple Lua data tables used by the League wiki's Module:*Data/data pages.
// Supports: return { ... }, ["key"] = / key = / [n] =, strings, numbers, booleans, nil, nested tables, -- comments.
export function parseLua(src) {
  let i = 0;
  const ws = () => { for (;;) { while (/\s/.test(src[i] || '')) i++; if (src.startsWith('--', i)) { if (src.startsWith('--[[', i)) { i = src.indexOf(']]', i) + 2; } else { while (i < src.length && src[i] !== '\n') i++; } } else break; } };
  const str = () => { const q = src[i++]; let s = ''; while (src[i] !== q) { if (src[i] === '\\') { i++; const c = src[i++]; s += c === 'n' ? '\n' : c === 't' ? '\t' : c; } else s += src[i++]; } i++; return s; };
  const num = () => { ws(); const m = /^(-?\d+\.?\d*(?:[eE][-+]?\d+)?)/.exec(src.slice(i, i + 40)); if (!m) throw new Error('Expected number at ' + i + ': ' + src.slice(i, i + 30)); i += m[0].length; return Number(m[1]); };
  const term = () => { let v = num(); for (;;) { ws(); const c = src[i]; if (c === '*') { i++; v *= num(); } else if (c === '/') { i++; v /= num(); } else return v; } };
  const expr = () => { let v = term(); for (;;) { ws(); const c = src[i]; if (c === '+') { i++; v += term(); } else if (c === '-' && src[i + 1] !== '-') { i++; v -= term(); } else return v; } };
  const value = () => {
    ws(); const c = src[i];
    if (c === '{') return table();
    if (c === '"' || c === "'") return str();
    const w = /^(true|false|nil)\b/.exec(src.slice(i, i + 6));
    if (w) { i += w[0].length; return w[1] === 'true' ? true : w[1] === 'false' ? false : null; }
    return expr();
  };
  const table = () => {
    i++; const obj = {}; let n = 1, hasKeys = false;
    for (;;) {
      ws(); if (src[i] === '}') { i++; break; }
      let key;
      if (src[i] === '[') { i++; ws(); key = value(); ws(); i++; ws(); i++; /* ] = */ hasKeys = true; }
      else { const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/.exec(src.slice(i, i + 80)); if (m) { key = m[1]; i += m[0].length; hasKeys = true; } else key = n++; }
      obj[key] = value(); ws(); if (src[i] === ',' || src[i] === ';') i++;
    }
    return obj;
  };
  const r = src.indexOf('return'); i = r >= 0 ? r + 6 : 0; return value();
}
