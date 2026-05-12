// Pre-warm BetExplorer daily cache
// Stahne kalendar zapasu pro posledni N dnu a ulozi do cache/be_daily/{YYYY-MM-DD}.json
// 
// USAGE:
//   node scripts/prewarm-cache.mjs [days]
//   node scripts/prewarm-cache.mjs 90  // default

import { JSDOM } from 'jsdom';

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || 'Havran001/tennis-scout';
const BE_BASE = 'https://www.betexplorer.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BE_CACHE_DIR = 'cache/be_daily';
const DAYS = parseInt(process.argv[2] || '90', 10);
const FETCH_DELAY_MS = 300;

if (!TOKEN) {
  console.error('GITHUB_TOKEN not set');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ghGet(path) {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'TennisScoutBot/1.0' },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`ghGet ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function ghPut(path, contentString, sha, message) {
  const utf8 = new TextEncoder().encode(contentString);
  const b64 = Buffer.from(utf8).toString('base64');
  const body = { message, content: b64 };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TennisScoutBot/1.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`ghPut ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function fetchBeText(path) {
  const url = `${BE_BASE}${path}`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/json' } });
  if (!r.ok) throw new Error(`BE ${path}: ${r.status}`);
  return r.text();
}

async function fetchDailyMatches(yyyy, mm, dd) {
  const path = `/tennis/results/?year=${yyyy}&month=${String(mm).padStart(2,'0')}&day=${String(dd).padStart(2,'0')}`;
  let html;
  try {
    html = await fetchBeText(path);
  } catch (e) {
    await sleep(500);
    html = await fetchBeText(path); // jeden retry
  }
  
  const re = /href="(\/tennis\/([^/]+)\/[^"]+\/([a-z0-9-]+)\/([a-zA-Z0-9]{8}))\/?"/g;
  const out = [];
  for (const m of html.matchAll(re)) {
    const [, , category, slug, mid] = m;
    if (/doubles/.test(category)) continue;
    out.push({ category, slug, mid });
  }
  return out;
}

async function main() {
  console.log(`Pre-warm cache: posledni ${DAYS} dnu`);
  console.log(`Cache dir: ${BE_CACHE_DIR}`);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let cached = 0, fetched = 0, errors = 0, skipped = 0;
  
  for (let offset = 0; offset < DAYS; offset++) {
    const d = new Date(today.getTime() - offset * 86400000);
    const yyyy = d.getFullYear();
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const key = `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
    
    // Check existing cache
    let existingSha = null;
    try {
      const meta = await ghGet(`${BE_CACHE_DIR}/${key}.json`);
      if (meta) {
        // Past day (>=2 dny stary) je static, skip
        if (offset >= 2) {
          skipped++;
          console.log(`  [${offset+1}/${DAYS}] ${key} ✓ cached (skip)`);
          continue;
        }
        existingSha = meta.sha;
      }
    } catch (e) {}
    
    // Fetch z BE
    try {
      const matches = await fetchDailyMatches(yyyy, mm, dd);
      const content = JSON.stringify({
        key,
        cached_at: new Date().toISOString(),
        matches
      });
      await ghPut(
        `${BE_CACHE_DIR}/${key}.json`,
        content,
        existingSha,
        `prewarm: BE daily ${key} (${matches.length} matches)`
      );
      cached++;
      console.log(`  [${offset+1}/${DAYS}] ${key} → ${matches.length} matches`);
    } catch (e) {
      errors++;
      console.warn(`  [${offset+1}/${DAYS}] ${key} ERROR: ${e.message}`);
    }
    
    fetched++;
    await sleep(FETCH_DELAY_MS);
  }
  
  console.log(`\nPre-warm complete:`);
  console.log(`  Cached: ${cached}`);
  console.log(`  Skipped (already cached): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total processed: ${fetched + skipped}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
