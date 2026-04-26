#!/usr/bin/env node
/**
 * Tennis Scout — BetExplorer Odds Import (V5 pipeline, Node.js port, v2)
 *
 * Spouštěno přes GitHub Action. Pro každý soubor v pending_imports/*.json:
 *   0. Pokud pending obsahuje force:true, vymaže VŠECHNA odds a commitne (audit log)
 *   1. Stáhne player_history/{pid}.json
 *   2. Pro každý match bez odds: fetchne /tennis/results/?year=&month=&day=
 *      v okně ±7 dnů kolem zápasu; sbírá BE matche se slug obsahujícím PLAYER_KEY
 *   3. Dedupne dle MID, určí orientaci home/away dle slug.startsWith(PLAYER_SLUG)
 *   4. Fuzzy-matchne každému history zápasu kandidáty (±14 dnů, partsMatch)
 *   5. Pro každého kandidáta v pořadí dat fetchne /match-odds-old/{MID}/1/ha/1/en/
 *      a vezme prioritní bookie (575 → 16 → fallback). V5: zkusí další kandidáty.
 *   6. Mergne do player_history/{pid}.json a commitne. Pak smaže pending.
 *
 * Vstup: env GITHUB_TOKEN, GITHUB_REPOSITORY (poskytuje Action automaticky)
 * Závislosti: jsdom, node 20+
 *
 * pending_imports/{pid}.json schema:
 *   { pid, name, player_slug?, player_key?, force?, requested_at, requested_by? }
 */

import { JSDOM } from 'jsdom';

const REPO = process.env.GITHUB_REPOSITORY || 'Havran001/tennis-scout';
const TOKEN = process.env.GITHUB_TOKEN;
const PENDING_DIR = 'pending_imports';
const HISTORY_DIR = 'player_history';
const BE_BASE = 'https://www.betexplorer.com';
const BOOKIE_PRIORITY = [{ bid: '575', name: 'BetInAsia' }, { bid: '16', name: 'Bet365' }];
const FETCH_DELAY_MS = 200;
const DAILY_DELAY_MS = 300;
const FETCH_TOLERANCE_DAYS = 7;
const MATCH_TOLERANCE_DAYS = 14;
const UA = 'Mozilla/5.0 (compatible; TennisScoutBot/1.0; +https://github.com/Havran001/scout)';

if (!TOKEN) {
  console.error('FATAL: GITHUB_TOKEN env var missing');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00Z').getTime();
  const b = new Date(isoB + 'T00:00:00Z').getTime();
  return Math.abs(a - b) / 86400000;
}

function partsMatch(taParts, beSlug) {
  for (const p of taParts) {
    if (p.length < 4) continue;
    if (beSlug.includes(p)) return true;
    if (p.length >= 5 && beSlug.includes(p.slice(1))) return true;
    for (const bePart of beSlug.split('-')) {
      if (bePart.length >= 4 && p.includes(bePart)) return true;
      if (bePart.length >= 5 && bePart.includes(p)) return true;
    }
  }
  return false;
}

async function ghGet(path) {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TennisScoutBot/1.0' },
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

async function ghDelete(path, sha, message) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TennisScoutBot/1.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sha }),
  });
  if (!r.ok) throw new Error(`ghDelete ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function fetchBeText(path) {
  const url = `${BE_BASE}${path}`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/json' } });
  if (!r.ok) throw new Error(`BE ${path}: ${r.status}`);
  return r.text();
}

async function fetchDailyResults(yyyy, mm, dd) {
  const path = `/tennis/results/?year=${yyyy}&month=${String(mm).padStart(2, '0')}&day=${String(dd).padStart(2, '0')}`;
  let html;
  try {
    html = await fetchBeText(path);
  } catch (e) {
    console.warn(`  daily fetch failed ${yyyy}-${mm}-${dd}: ${e.message}`);
    return [];
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

async function fetchOddsForMid(mid) {
  const path = `/match-odds-old/${mid}/1/ha/1/en/`;
  let json;
  try {
    const txt = await fetchBeText(path);
    json = JSON.parse(txt);
  } catch (e) {
    return null;
  }
  if (!json || !json.odds) return null;
  const dom = new JSDOM(`<!doctype html><body>${json.odds}</body>`);
  const doc = dom.window.document;
  const rows = Array.from(doc.querySelectorAll('tr[data-bid]'));
  if (rows.length === 0) return null;
  let chosen = null;
  for (const bp of BOOKIE_PRIORITY) {
    const row = rows.find((r) => r.dataset.bid === bp.bid);
    if (row) {
      const cells = row.querySelectorAll('[data-odd]');
      if (cells.length >= 2) {
        const h = parseFloat(cells[0].dataset.odd);
        const a = parseFloat(cells[1].dataset.odd);
        if (Number.isFinite(h) && Number.isFinite(a)) {
          chosen = { bid: bp.bid, h, a };
          break;
        }
      }
    }
  }
  if (!chosen) {
    for (const row of rows) {
      const cells = row.querySelectorAll('[data-odd]');
      if (cells.length >= 2) {
        const h = parseFloat(cells[0].dataset.odd);
        const a = parseFloat(cells[1].dataset.odd);
        if (Number.isFinite(h) && Number.isFinite(a)) {
          chosen = { bid: row.dataset.bid, h, a };
          break;
        }
      }
    }
  }
  return chosen;
}

async function processPlayer(pidFile) {
  const pid = pidFile.replace(/\.json$/, '');
  console.log(`\n=== ${pid} ===`);

  const pendingMeta = await ghGet(`${PENDING_DIR}/${pidFile}`);
  if (!pendingMeta) {
    console.log(`  pending file disappeared, skip`);
    return { pid, status: 'skipped', reason: 'pending_disappeared' };
  }
  const pendingObj = JSON.parse(Buffer.from(pendingMeta.content, 'base64').toString('utf-8'));
  const playerName = pendingObj.name;
  const playerSlug = pendingObj.player_slug || slugify(playerName);
  const playerKey = pendingObj.player_key
    || playerSlug.split('-').filter((p) => p.length >= 4).pop()
    || playerSlug;
  const force = pendingObj.force === true;

  console.log(`  name=${playerName} slug=${playerSlug} key=${playerKey} force=${force}`);

  let histMeta = await ghGet(`${HISTORY_DIR}/${pid}.json`);
  if (!histMeta) {
    console.log(`  no history file for ${pid}, skip`);
    return { pid, status: 'error', reason: 'history_missing' };
  }
  let history = JSON.parse(Buffer.from(histMeta.content, 'base64').toString('utf-8'));

  // KROK 0: FORCE MODE — smaž všechna existující odds + commit jako audit
  if (force) {
    let cleared = 0;
    for (const m of history.matches || []) {
      if (m.odds_alc !== undefined || m.odds_opp !== undefined || m.odds_src !== undefined) {
        delete m.odds_alc;
        delete m.odds_opp;
        delete m.odds_src;
        cleared++;
      }
    }
    history.updated = new Date().toISOString();
    console.log(`  FORCE: cleared odds from ${cleared} matches — committing pre-clear`);
    await ghPut(
      `${HISTORY_DIR}/${pid}.json`,
      JSON.stringify(history, null, 2) + '\n',
      histMeta.sha,
      `Force refresh: clear odds for ${pid} (${playerName}) - ${cleared} matches`
    );
    histMeta = await ghGet(`${HISTORY_DIR}/${pid}.json`);
    history = JSON.parse(Buffer.from(histMeta.content, 'base64').toString('utf-8'));
  }

  const noOdds = (history.matches || []).filter((m) => !m.odds_alc && m.score);
  console.log(`  history matches: ${history.matches?.length}, missing odds: ${noOdds.length}`);
  if (noOdds.length === 0) {
    console.log(`  nothing to import`);
    await ghDelete(`${PENDING_DIR}/${pidFile}`, pendingMeta.sha, `Cleanup: ${pid} has no missing odds`);
    return { pid, status: 'noop' };
  }

  const uniqDates = [...new Set(noOdds.map((m) => m.date))].sort();
  const allDays = new Set();
  for (const iso of uniqDates) {
    const [y, m, d] = iso.split('-').map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    for (let delta = -FETCH_TOLERANCE_DAYS; delta <= FETCH_TOLERANCE_DAYS; delta++) {
      const dt = new Date(base.getTime() + delta * 86400000);
      const k = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      allDays.add(k);
    }
  }
  console.log(`  unique history dates: ${uniqDates.length}, daily fetches needed: ${allDays.size}`);

  const dateCache = {};
  let i = 0;
  for (const key of allDays) {
    i++;
    const [yy, mm, dd] = key.split('-').map(Number);
    const all = await fetchDailyResults(yy, mm, dd);
    const filtered = all.filter((x) => x.slug.includes(playerKey));
    if (filtered.length > 0) dateCache[key] = filtered;
    if (i % 20 === 0) console.log(`    daily ${i}/${allDays.size} (${key}: ${filtered.length} matches with key)`);
    await sleep(DAILY_DELAY_MS);
  }
  const totalDailyMatches = Object.values(dateCache).reduce((s, a) => s + a.length, 0);
  console.log(`  collected ${totalDailyMatches} BE matches across ${Object.keys(dateCache).length} days`);

  const midMap = {};
  for (const [dayKey, arr] of Object.entries(dateCache)) {
    for (const m of arr) {
      if (!midMap[m.mid]) midMap[m.mid] = { ...m, foundDates: [dayKey] };
      else midMap[m.mid].foundDates.push(dayKey);
    }
  }
  const uniqueMatches = Object.values(midMap);
  uniqueMatches.forEach((m) => {
    m.isHome = m.slug.startsWith(playerSllayerSlug);
    m.opponentSlug = m.isHome
      ? m.slug.slice(playerSlug.length + 1)
      : m.slug.slice(0, m.slug.length - playerSlug.length - 1);
  });
  console.log(`  unique BE MIDs: ${uniqueMatches.length}`);

  const candidates = [];
  for (const hm of noOdds) {
    const oppSlug = slugify(hm.opponent);
    const oppParts = oppSlug.split('-').filter((p) => p.length >= 3);
    const compatible = uniqueMatches.filter((be) => {
      const minDist = Math.min(...be.foundDates.map((fd) => daysBetween(hm.date, fd)));
      if (minDist > MATCH_TOLERANCE_DAYS) return false;
      return partsMatch(oppParts, be.opponentSlug);
    });
    if (compatible.length > 0) {
      compatible.sort((a, b) => {
        const da = Math.min(...a.foundDates.map((fd) => daysBetween(hm.date, fd)));
        const db = Math.min(...b.foundDates.map((fd) => daysBetween(hm.date, fd)));
        return da - db;
      });
      candidates.push({ hm, candidates: compatible });
    }
  }
  console.log(`  candidates: ${candidates.length}/${noOdds.length} matched`);

  const results = [];
  let cIdx = 0;
  for (const c of candidates) {
    cIdx++;
    let used = null;
    let usedBE = null;
    for (const be of c.candidates) {
      const chosen = await fetchOddsForMid(be.mid);
      await sleep(FETCH_DELAY_MS);
      if (chosen) {
        used = chosen;
        usedBE = be;
        break;
      }
    }
    if (used && usedBE) {
      const odds_alc = usedBE.isHome ? used.h : used.a;
      const odds_opp = usedBE.isHome ? used.a : used.h;
      results.push({ hm: c.hm, ok: true, odds_alc, odds_opp, odds_src: 'bid' + used.bid });
    }
    if (cIdx % 20 === 0) console.log(`    odds ${cIdx}/${candidates.length} (with odds: ${results.length})`);
  }
  console.log(`  odds fetched: ${results.length}/${candidates.length}`);

  const histMeta2 = await ghGet(`${HISTORY_DIR}/${pid}.json`);
  if (!histMeta2) throw new Error(`history disappeared for ${pid}`);
  const current = JSON.parse(Buffer.from(histMeta2.content, 'base64').toString('utf-8'));
  let merged = 0;
  for (const res of results) {
    const hm = current.matches.find((m) =>
      !m.odds_alc &&
      m.opponent === res.hm.opponent &&
      m.date === res.hm.date &&
      m.tournament === res.hm.tournament &&
      m.round === res.hm.round
    );
    if (hm) {
      hm.odds_alc = res.odds_alc;
      hm.odds_opp = res.odds_opp;
      hm.odds_src = res.odds_src;
      merged++;
    }
  }
  current.updated = new Date().toISOString();
  console.log(`  merged: ${merged}/${results.length}`);

  if (merged > 0) {
    await ghPut(
      `${HISTORY_DIR}/${pid}.json`,
      JSON.stringify(current, null, 2) + '\n',
      histMeta2.sha,
      `Import odds for ${pid} (${playerName}): +${merged} matches${force ? ' [force]' : ''}`
    );
  }

  const pendingMeta2 = await ghGet(`${PENDING_DIR}/${pidFile}`);
  if (pendingMeta2) {
    await ghDelete(`${PENDING_DIR}/${pidFile}`, pendingMeta2.sha, `Done: import odds for ${pid}`);
  }

  return { pid, status: 'ok', merged, candidates: candidates.length, noOdds: noOdds.length, force };
}

async function main() {

  const dirMeta = await ghGet(PENDING_DIR);
  if (!dirMeta) {
    console.log('No pending_imports directory - nothing to do.');
    return;
  }
  const pendingFiles = (Array.isArray(dirMeta) ? dirMeta : [])
    .filter((f) => f.type === 'file' && f.name.endsWith('.json'))
    .map((f) => f.name);

  if (pendingFiles.length === 0) {
    console.log('No pending imports.');
    return;
  }

  console.log(`Found ${pendingFiles.length} pending import(s): ${pendingFiles.join(', ')}`);
  const summary = [];
  for (const f of pendingFiles) {
    try {
      const res = await processPlayer(f);
      summary.push(res);
    } catch (e) {
      console.error(`ERROR processing ${f}:`, e.message);
      summary.push({ pid: f, status: 'error', error: e.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  for (const s of summary) console.log(JSON.stringify(s));
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
