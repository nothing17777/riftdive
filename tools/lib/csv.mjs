// Minimal streaming CSV reader (RFC 4180 quotes, CRLF). Yields arrays of fields.
import { createReadStream } from 'node:fs';
export async function* csvRows(file) {
  let field = '', row = [], quoted = false, pendingQuote = false;
  for await (const chunk of createReadStream(file, { encoding: 'utf8', highWaterMark: 1 << 20 })) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (quoted) {
        if (pendingQuote) {
          pendingQuote = false;
          if (c === '"') { field += '"'; continue; }
          quoted = false; // the previous quote closed the field; fall through and treat c normally
        } else if (c === '"') { pendingQuote = true; continue; }
        else { field += c; continue; }
      }
      if (c === '"' && field === '') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); field = ''; if (row.length > 1 || row[0] !== '') yield row; row = []; }
      else if (c !== '\r') field += c;
    }
  }
  if (pendingQuote) quoted = false;
  if (field !== '' || row.length) { row.push(field); yield row; }
}
