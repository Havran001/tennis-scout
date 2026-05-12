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
const FETCH_TOLERANCE_DAYS_LONG = 14; // pro Masters / Grand Slam (turnaj trva 2-3 tydny)
const MATCH_TOLERANCE_DAYS = 14;
// Vrati toleranci v dnech podle typu turnaje. Masters / Grand Slam = 14, ostatni = 7.
function getFetchTol(tournament) {
  const t = (tournament || '').toLowerCase();
  if (/masters|grand slam|australian open|french open|roland garros|wimbledon|us open/.test(t)) return FETCH_TOLERANCE_DAYS_LONG;
  return FETCH_TOLERANCE_DAYS;
}
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

// OPPONENT_ALIASES: alternativní transliterace asijských jmen na BE
// Klíč: TA varianta (lowercase), Hodnota: pole BE alternativ (lowercase)
const OPPONENT_ALIASES = {
  'sin': ['shin'],
  'shin': ['sin'],
  'lee': ['yi'],
  'yi': ['lee'],
  'park': ['pak'],
  'pak': ['park'],
  'choi': ['choe'],
  'choe': ['choi'],
  'jung': ['jeong'],
  'jeong': ['jung'],
};

// Vrací pole variant tokenu vč. originálu a aliasů
function tokenVariants(token) {
  const variants = [token];
  if (OPPONENT_ALIASES[token]) variants.push(...OPPONENT_ALIASES[token]);
  return variants;
}

// Najde kompletní pole alternativ pro pole taParts:
// např. ['san','hui','sin'] -> také ['san','hui','shin']
// Plus: zkusí spojené sousední tokeny ('san hui' jako 'sanhui')
function expandTaParts(taParts) {
  const out = [taParts.slice()];
  // Substituce per token
  for (let i = 0; i < taParts.length; i++) {
    const variants = tokenVariants(taParts[i]);
    if (variants.length > 1) {
      for (const v of variants.slice(1)) {
        const copy = taParts.slice();
        copy[i] = v;
        out.push(copy);
      }
    }
  }
  // Sloučení 2 sousedních tokenů (san+hui = sanhui)
  for (let i = 0; i < taParts.length - 1; i++) {
    const merged = taParts[i] + taParts[i + 1];
    const copy = taParts.slice();
    copy.splice(i, 2, merged);
    out.push(copy);
    // Aplikuj alias i na slovo po merge
    for (let j = 0; j < copy.length; j++) {
      const variants = tokenVariants(copy[j]);
      if (variants.length > 1) {
        for (const v of variants.slice(1)) {
          const copy2 = copy.slice();
          copy2[j] = v;
          out.push(copy2);
        }
      }
    }
  }
  return out;
}

function partsMatchSingle(taParts, beSlug) {
  const beTokens = beSlug.split('-');
  const longParts = taParts.filter(p => p.length >= 4);
  const shortParts = taParts.filter(p => p.length >= 2 && p.length < 4);
  // Asijska kratka jmena (Li Tu, Yu Hsu): fallback na whole-token equality
  if (longParts.length === 0 && shortParts.length > 0) {
    return shortParts.every(p => beTokens.includes(p));
  }
  // Standardni logika pro dlouhe parts
  for (const p of longParts) {
    if (beSlug.includes(p)) return true;
    if (p.length >= 5 && beSlug.includes(p.slice(1))) return true;
    for (const bePart of beTokens) {
      if (bePart.length >= 4 && p.includes(bePart)) return true;
      if (bePart.length >= 5 && bePart.includes(p)) return true;
    }
  }
  // Mixed: long+short — pokud long nematchla, zkus short jako whole-token fallback
  if (longParts.length > 0 && shortParts.length > 0) {
    if (shortParts.every(p => beTokens.includes(p))) {
      const anyLong = longParts.some(p => beSlug.includes(p) || beTokens.some(bp => bp.length >= 4 && (p.includes(bp) || bp.includes(p))));
      if (anyLong) return true;
    }
  }
  return false;
}

function partsMatch(taParts, beSlug) {
  // Zkus originál + všechny alias varianty
  const variants = expandTaParts(taParts);
  for (const variant of variants) {
    if (partsMatchSingle(variant, beSlug)) return true;
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

// ═══ PERSISTENT BE CACHE ═══
const BE_CACHE_DIR = 'cache/be_daily';
const BE_ODDS_CACHE_DIR = 'cache/be_odds';

async function loadOddsCache(mid) {
  try {
    const meta = await ghGet(`${BE_ODDS_CACHE_DIR}/${mid}.json`);
    if (!meta) return null;
    const utf8 = Buffer.from(meta.content, 'base64').toString('utf-8');
    const parsed = JSON.parse(utf8);
    
    const cachedAt = parsed.cached_at ? new Date(parsed.cached_at) : null;
    if (!cachedAt) return null;
    
    const ageMs = Date.now() - cachedAt.getTime();
    
    if (ageMs < 24 * 3600 * 1000) {
      return { result: parsed.result, sha: meta.sha };
    }
    
    if (parsed.match_date) {
      const matchDate = new Date(parsed.match_date);
      const matchAgeMs = Date.now() - matchDate.getTime();
      if (matchAgeMs >= 7 * 86400 * 1000) {
        return { result: parsed.result, sha: meta.sha };
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

async function saveOddsCache(mid, result, matchDate) {
  try {
    const content = JSON.stringify({
      mid,
      cached_at: new Date().toISOString(),
      match_date: matchDate || null,
      result
    });
    await ghPut(
      `${BE_ODDS_CACHE_DIR}/${mid}.json`,
      content,
      null,
      `cache: BE odds ${mid}${result ? '' : ' (null)'}`
    );
  } catch (e) {}
}

async function loadDailyCache(key) {
  try {
    const meta = await ghGet(`${BE_CACHE_DIR}/${key}.json`);
    if (!meta) return null;
    const utf8 = Buffer.from(meta.content, 'base64').toString('utf-8');
    const parsed = JSON.parse(utf8);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const [yy, mm, dd] = key.split('-').map(Number);
    const dayDate = new Date(yy, mm-1, dd);
    const daysAgo = Math.round((today.getTime() - dayDate.getTime()) / 86400000);
    
    if (daysAgo >= 2) {
      return { matches: parsed.matches || [], sha: meta.sha };
    }
    
    const cachedAt = parsed.cached_at ? new Date(parsed.cached_at) : null;
    if (cachedAt && (Date.now() - cachedAt.getTime()) < 24 * 3600 * 1000) {
      return { matches: parsed.matches || [], sha: meta.sha };
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

async function saveDailyCache(key, matches, existingSha) {
  try {
    const content = JSON.stringify({
      key,
      cached_at: new Date().toISOString(),
      matches
    });
    await ghPut(
      `${BE_CACHE_DIR}/${key}.json`,
      content,
      existingSha,
      `cache: BE daily ${key} (${matches.length} matches)`
    );
  } catch (e) {
    console.warn(`  cache save FAILED ${key}: ${e.message}`);
  }
}

async function fetchDailyResults(yyyy, mm, dd) {
  const cacheKey = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const cached = await loadDailyCache(cacheKey);
  if (cached) {
    return cached.matches;
  }
  
  const path = `/tennis/results/?year=${yyyy}&month=${String(mm).padStart(2, '0')}&day=${String(dd).padStart(2, '0')}`;
  let html;
  try {
    html = await fetchBeText(path);
  } catch (e) {
    // Retry once po 500ms (transient network errors v paralelnim rezimu)
    await new Promise(r => setTimeout(r, 500));
    try {
      html = await fetchBeText(path);
    } catch (e2) {
      console.warn(`  daily fetch FAILED 2x ${yyyy}-${mm}-${dd}: ${e2.message}`);
      throw e2;
    }
  }
  const re = /href="(\/tennis\/([^/]+)\/[^"]+\/([a-z0-9-]+)\/([a-zA-Z0-9]{8}))\/?"/g;
  const out = [];
  for (const m of html.matchAll(re)) {
    const [, , category, slug, mid] = m;
    if (/doubles/.test(category)) continue;
    out.push({ category, slug, mid });
  }
  saveDailyCache(cacheKey, out, null).catch(()=>{});
  return out;
}

async function fetchOddsForMid(mid, matchDate) {
  // ═══ CACHE CHECK ═══
  const cached = await loadOddsCache(mid);
  if (cached) {
    return cached.result;
  }
  
  const path = `/match-odds-old/${mid}/1/ha/1/en/`;
  let json;
  try {
    const txt = await fetchBeText(path);
    json = JSON.parse(txt);
  } catch (e) {
    // Retry once po 500ms (transient errors v paralelnim rezimu)
    await new Promise(r => setTimeout(r, 500));
    try {
      const txt = await fetchBeText(path);
      json = JSON.parse(txt);
    } catch (e2) {
      console.warn(`  odds fetch FAILED 2x mid=${mid}: ${e2.message}`);
      saveOddsCache(mid, null, matchDate).catch(()=>{});
      return null;
    }
  }
  if (!json || !json.odds) {
    saveOddsCache(mid, null, matchDate).catch(()=>{});
    return null;
  }
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
  saveOddsCache(mid, chosen, matchDate).catch(()=>{});
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
  // BE může mít slug v pořadí "prijmeni-jmeno" i "jmeno-prijmeni" — připrav obě varianty
  const slugReversed = playerSlug.split('-').reverse().join('-');
  const slugCandidates = playerSlug === slugReversed ? [playerSlug] : [playerSlug, slugReversed];
  const force = pendingObj.force === true;

  console.log(`  name=${playerName} slug=${playerSlug} key=${playerKey} force=${force}`);

  let histMeta = await ghGet(`${HISTORY_DIR}/${pid}.json`);
  if (!histMeta) {
    console.log(`  no history file for ${pid}, skip`);
    return { pid, status: 'error', reason: 'history_missing' };
  }
  let history = JSON.parse(Buffer.from(histMeta.content, 'base64').toString('utf-8'));

  // KROK 0: FORCE MODE — smaž všechna existující odds + commit jako audit
  // BE GUARD: pred force clear oveř ze BE odpovida (proti Cloudflare empty-200)
  if (force) {
    const _today = new Date();
    _today.setDate(_today.getDate() - 3);
    const _y = _today.getFullYear();
    const _m = _today.getMonth() + 1;
    const _d = _today.getDate();
    try {
      const _sample = await fetchDailyResults(_y, _m, _d);
      if (_sample.length === 0) {
        console.error(`  ABORT: BE sample fetch ${_y}-${_m}-${_d} vratil 0 matches - pravdepodobne Cloudflare blok / empty-200. Force clear PRESKOCEN.`);
        throw new Error('BE_GUARD_FAILED_empty_response');
      }
      console.log(`  BE guard OK: ${_sample.length} sample matches z ${_y}-${_m}-${_d}`);
    } catch (guardErr) {
      console.error(`  ABORT: BE guard fetch failed: ${guardErr.message}`);
      throw guardErr;
    }
  }

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

  // Vyber zápasy k importu:
  //  - force mode: všech (force-refresh chce přepsat historii)
  //  - normální mode: od nejnovějšího data dolů, dokud nenarazíme na zápas s odds, max 20 zápasů
  let noOdds;
  noOdds = (history.matches || []).filter((m) => !m.odds_alc && m.score);
    console.log(`  history matches: ${history.matches?.length}, missing odds: ${noOdds.length}`);
  if (noOdds.length === 0) {
    console.log(`  nothing to import`);
    await ghDelete(`${PENDING_DIR}/${pidFile}`, pendingMeta.sha, `Cleanup: ${pid} has no missing odds`);
    return { pid, status: 'noop' };
  }

  const uniqDates = [...new Set(noOdds.map((m) => m.date))].sort();
  const allDays = new Set();
  // Per-date max tolerance: pokud aspon jeden zapas v ramci dne je Masters/GS, pouzij 14
  const maxTolByDate = {};
  for (const m of noOdds) {
    const tol = getFetchTol(m.tournament);
    if (!maxTolByDate[m.date] || tol > maxTolByDate[m.date]) maxTolByDate[m.date] = tol;
  }
  for (const iso of uniqDates) {
    const [y, m, d] = iso.split('-').map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    const tolForThisDate = maxTolByDate[iso] || FETCH_TOLERANCE_DAYS;
    for (let delta = -tolForThisDate; delta <= tolForThisDate; delta++) {
      const dt = new Date(base.getTime() + delta * 86400000);
      const k = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      allDays.add(k);
    }
  }
  console.log(`  unique history dates: ${uniqDates.length}, daily fetches needed: ${allDays.size}`);

  const dateCache = {};
  let i = 0;
  // PARALEL: 5 fetchu najednou, 100ms pauza mezi davkami. Pri >=3 errorech v rade fallback na sekvencne.
  const allDaysArr = [...allDays];
  const failedDays = [];
  let parallelism = 25;
  let consecutiveErrors = 0;
  for (let batchStart = 0; batchStart < allDaysArr.length; batchStart += parallelism) {
    const batch = allDaysArr.slice(batchStart, batchStart + parallelism);
    const results = await Promise.allSettled(batch.map(async (key) => {
      const [yy, mm, dd] = key.split('-').map(Number);
      const all = await fetchDailyResults(yy, mm, dd);
      const filtered = all.filter((x) => x.slug.includes(playerKey));
      return { key, filtered };
    }));
    let batchErrors = 0;
    for (let bi = 0; bi < results.length; bi++) {
      const res = results[bi];
      i++;
      if (res.status === 'fulfilled') {
        const { key, filtered } = res.value;
        if (filtered.length > 0) dateCache[key] = filtered;
      } else {
        batchErrors++;
        const failedKey = batch[bi];
        if (failedKey) failedDays.push(failedKey);
      }
    }
    if (batchErrors > 0) {
      consecutiveErrors += batchErrors;
      if (consecutiveErrors >= 3 && parallelism > 1) {
        console.log(`    [warn] ${consecutiveErrors} errors, falling back to sequential mode`);
        parallelism = 1;
      }
    } else {
      consecutiveErrors = 0;
    }
    if (i % 20 < parallelism) console.log(`    daily ${i}/${allDays.size} (parallel=${parallelism})`);
    await sleep(100);
  }
  // Post-pass: sekvencni retry failed dnu (pomalu, ale spolehlive)
  if (failedDays.length > 0) {
    console.log(`  retry: ${failedDays.length} dnu selhalo, opakuji sekvencne`);
    for (const key of failedDays) {
      const [yy, mm, dd] = key.split('-').map(Number);
      try {
        const all = await fetchDailyResults(yy, mm, dd);
        const filtered = all.filter((x) => x.slug.includes(playerKey));
        if (filtered.length > 0) dateCache[key] = filtered;
      } catch (e) {
        console.warn(`  retry FAILED ${key}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
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
    // Zkus obě varianty player slugu (prijmeni-jmeno i jmeno-prijmeni)
    let matched = null;
    for (const cand of slugCandidates) {
      if (m.slug.startsWith(cand)) {
        matched = { isHome: true, opponentSlug: m.slug.slice(cand.length + 1) };
        break;
      }
      if (m.slug.endsWith(cand)) {
        matched = { isHome: false, opponentSlug: m.slug.slice(0, m.slug.length - cand.length - 1) };
        break;
      }
    }
    if (matched) {
      m.isHome = matched.isHome;
      m.opponentSlug = matched.opponentSlug;
    } else {
      // Fallback — pokud se ani jedna varianta neujme, použijeme playerKey heuristiku
      // (slug obsahuje key někde uprostřed). Nech isHome nedefinováno → match selže ale neselže celý běh.
      m.isHome = m.slug.startsWith(playerSlug);
      m.opponentSlug = m.isHome
        ? m.slug.slice(playerSlug.length + 1)
        : m.slug.slice(0, m.slug.length - playerSlug.length - 1);
    }
  });
  console.log(`  unique BE MIDs: ${uniqueMatches.length}`);

  const candidates = [];
  for (const hm of noOdds) {
    const oppSlug = slugify(hm.opponent);
    const oppParts = oppSlug.split('-').filter((p) => p.length >= 2);  // >=2 umoznuje kratka asijska jmena (Li Tu)
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
  // PARALEL ODDS: 5 kandidatu najednou, V5 fallback resi sekvencne uvnitr kazdeho branche.
  // Auto-fallback: pri 3+ errorech v rade snizi parallelism na 1.
  let oddsParallelism = 10;
  let oddsConsecutiveErrors = 0;
  for (let batchStart = 0; batchStart < candidates.length; batchStart += oddsParallelism) {
    const batch = candidates.slice(batchStart, batchStart + oddsParallelism);
    const batchRes = await Promise.allSettled(batch.map(async (c) => {
      // V5 fallback: zkus kandidaty v poradi dokud nejaky neda odds
      for (const be of c.candidates) {
        const chosen = await fetchOddsForMid(be.mid, c.hm.date);
        if (chosen) return { c, be, chosen };
      }
      return { c, be: null, chosen: null };
    }));
    let batchErrors = 0;
    for (const res of batchRes) {
      cIdx++;
      if (res.status !== 'fulfilled') { batchErrors++; continue; }
      const { c, be: usedBE, chosen: used } = res.value;
      if (used && usedBE) {
        const odds_alc = usedBE.isHome ? used.h : used.a;
        const odds_opp = usedBE.isHome ? used.a : used.h;
        results.push({ hm: c.hm, ok: true, odds_alc, odds_opp, odds_src: 'bid' + used.bid });
      }
    }
    if (batchErrors > 0) {
      oddsConsecutiveErrors += batchErrors;
      if (oddsConsecutiveErrors >= 3 && oddsParallelism > 1) {
        console.log(`    [warn] odds: ${oddsConsecutiveErrors} errors, falling back to sequential`);
        oddsParallelism = 1;
      }
    } else {
      oddsConsecutiveErrors = 0;
    }
    if (cIdx % 20 < oddsParallelism) console.log(`    odds ${cIdx}/${candidates.length} (with odds: ${results.length}, parallel=${oddsParallelism})`);
    await sleep(100);
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
