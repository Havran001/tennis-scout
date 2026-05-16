// Pre-warm BetExplorer daily cache (LOCAL DISK na Mac runner)
// Stahne kalendar zapasu pro posledni N dnu a ulozi do /Users/Shared/tennis-scout-cache/be_daily/
//
// USAGE: node scripts/prewarm-cache.mjs [days]

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const BE_BASE = 'https://www.betexplorer.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const LOCAL_CACHE_BASE = process.env.RUNNER_CACHE_DIR || '/Users/Shared/tennis-scout-cache';
const LOCAL_BE_DAILY_DIR = path.join(LOCAL_CACHE_BASE, 'be_daily');

const DAYS = parseInt(process.argv[2] || '90', 10);
const FETCH_DELAY_MS = 300;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchBeText(p) {
  const url = \`\${BE_BASE}\${p}\`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/json' } });
  if (!r.ok) throw new Error(\`BE \${p}: \${r.status}\`);
  return r.text();
}

async function fetchDailyMatches(yyyy, mm, dd) {
  const p = \`/tennis/results/?year=\${yyyy}&month=\${String(mm).padStart(2,'0')}&day=\${String(dd).padStart(2,'0')}\`;
  let html;
  try {
    html = await fetchBeText(p);
  } catch (e) {
    await sleep(500);
    html = await fetchBeText(p);
  }
  
  const re = /href="(\\/tennis\\/([^/]+)\\/[^"]+\\/([a-z0-9-]+)\\/([a-zA-Z0-9]{8}))\\/?"/g;
  const out = [];
  for (const m of html.matchAll(re)) {
    const [, , category, slug, mid] = m;
    if (/doubles/.test(category)) continue;
    out.push({ category, slug, mid });
  }
  return out;
}

async function main() {
  console.log(\`Pre-warm LOCAL cache: posledni \${DAYS} dnu\`);
  console.log(\`Cache dir: \${LOCAL_BE_DAILY_DIR}\`);
  
  await fs.mkdir(LOCAL_BE_DAILY_DIR, { recursive: true });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let cached = 0, errors = 0, skipped = 0;
  
  for (let offset = 0; offset < DAYS; offset++) {
    const d = new Date(today.getTime() - offset * 86400000);
    const yyyy = d.getFullYear();
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const key = \`\${yyyy}-\${String(mm).padStart(2,'0')}-\${String(dd).padStart(2,'0')}\`;
    const filePath = path.join(LOCAL_BE_DAILY_DIR, \`\${key}.json\`);
    
    // Skip pokud uz cache existuje pro past day (>=2 dny stary)
    if (offset >= 2) {
      try {
        await fs.access(filePath);
        skipped++;
        console.log(\`  [\${offset+1}/\${DAYS}] \${key} cached (skip)\`);
        continue;
      } catch (e) {}
    }
    
    try {
      const matches = await fetchDailyMatches(yyyy, mm, dd);
      const content = JSON.stringify({
        key,
        cached_at: new Date().toISOString(),
        matches
      });
      await fs.writeFile(filePath, content, 'utf-8');
      cached++;
      console.log(\`  [\${offset+1}/\${DAYS}] \${key} -> \${matches.length} matches\`);
    } catch (e) {
      errors++;
      console.warn(\`  [\${offset+1}/\${DAYS}] \${key} ERROR: \${e.message}\`);
    }
    
    await sleep(FETCH_DELAY_MS);
  }
  
  console.log(\`\nPre-warm complete:\`);
  console.log(\`  Cached: \${cached}\`);
  console.log(\`  Skipped (already cached): \${skipped}\`);
  console.log(\`  Errors: \${errors}\`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
