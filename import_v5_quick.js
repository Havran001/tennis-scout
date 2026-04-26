// Tennis Scout — V5 Quick Import Pipeline
// Spouští se v Chrome konzoli na betexplorer.com (CORS důvod).
// Quick mode: max 20 nejnovějších zápasů bez odds, dokud nenarazí na zápas s odds.
//
// Použití:
//   window.runImport({pid: 'va25', name: 'Valentin Vacherot', force: false})
//
// Vrací Promise<{merged, candidates, total, error?}>.

(function () {
  'use strict';

  const REPO = 'Havran001/tennis-scout';
  const BE_BASE = 'https://www.betexplorer.com';
  const BOOKIE_PRIORITY = [
    { bid: '575', name: 'BetInAsia' },
    { bid: '16',  name: 'Bet365' },
  ];
  const FETCH_DELAY_MS = 200;       // mezi BE odds requesty
  const DAILY_DELAY_MS = 250;       // mezi BE daily requesty
  const FETCH_TOLERANCE_DAYS = 7;
  const FETCH_TOLERANCE_DAYS_LONG = 14; // pro Masters / Grand Slam (turnaj trva 2-3 tydny)
  const MATCH_TOLERANCE_DAYS = 14;
  // Vrati toleranci v dnech podle typu turnaje. Masters / Grand Slam = 14, ostatni = 7.
  function getFetchTol(tournament) {
    const t = (tournament || '').toLowerCase();
    if (/masters|grand slam|australian open|french open|roland garros|wimbledon|us open/.test(t)) return FETCH_TOLERANCE_DAYS_LONG;
    return FETCH_TOLERANCE_DAYS;
  }
  const MAX_RECENT = 20;            // quick mode: max 20 nejnovějších zápasů

  // ---------- helpers ----------
  const slugify = (s) => (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function daysBetween(isoA, isoB) {
    const a = new Date(isoA + 'T00:00:00Z').getTime();
    const b = new Date(isoB + 'T00:00:00Z').getTime();
    return Math.abs(a - b) / 86400000;
  }

  function partsMatch(taParts, beSlug) {
    for (const p of taParts) {
      if (p.length < 4) continue;
      if (beSlug.includes(p)) return true;
      // Apostrof workaround: TA "Oconnell" → BE "o-connell"
      if (p.length >= 5 && beSlug.includes(p.slice(1))) return true;
      // Pořadí jmen (jméno-příjmení vs příjmení-jméno)
      for (const bp of beSlug.split('-')) {
        if (bp.length >= 4 && p.includes(bp)) return true;
        if (bp.length >= 4 && bp.includes(p)) return true;
      }
    }
    return false;
  }

  // ---------- GitHub I/O ----------
  function token() {
    const t = localStorage.getItem('ts_gh_token');
    if (!t) throw new Error('Missing ts_gh_token in localStorage');
    return t;
  }

  async function ghGet(path) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ts=${Date.now()}`, {
      headers: { Authorization: `token ${token()}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`ghGet ${path}: ${r.status}`);
    const meta = await r.json();
    const bytes = Uint8Array.from(atob(meta.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
    const text = new TextDecoder('utf-8').decode(bytes);
    return { sha: meta.sha, data: JSON.parse(text) };
  }

  async function ghPut(path, dataObj, sha, message) {
    const json = JSON.stringify(dataObj, null, 2);
    const utf8 = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
    const b64 = btoa(bin);
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, content: b64, sha }),
    });
    if (!r.ok) throw new Error(`ghPut ${path}: ${r.status} ${await r.text()}`);
    return r.json();
  }

  // ---------- BE I/O ----------
  async function fetchDailyResults(yyyy, mm, dd) {
    const path = `/tennis/results/?year=${yyyy}&month=${String(mm).padStart(2,'0')}&day=${String(dd).padStart(2,'0')}`;
    let html;
    try { html = await (await fetch(BE_BASE + path)).text(); }
    catch (e) { return []; }
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
    let json;
    try {
      const r = await fetch(`${BE_BASE}/match-odds-old/${mid}/1/ha/1/en/`);
      json = JSON.parse(await r.text());
    } catch (e) { return null; }
    if (!json || !json.odds) return null;
    const dom = new DOMParser().parseFromString(json.odds, 'text/html');
    const rows = Array.from(dom.querySelectorAll('tr[data-bid]'));
    if (rows.length === 0) return null;
    let chosen = null;
    for (const bp of BOOKIE_PRIORITY) {
      const row = rows.find((r) => r.dataset.bid === bp.bid);
      if (!row) continue;
      const cells = row.querySelectorAll('[data-odd]');
      if (cells.length < 2) continue;
      const h = parseFloat(cells[0].dataset.odd);
      const a = parseFloat(cells[1].dataset.odd);
      if (Number.isFinite(h) && Number.isFinite(a)) {
        chosen = { bid: bp.bid, h, a };
        break;
      }
    }
    if (!chosen) {
      for (const row of rows) {
        const cells = row.querySelectorAll('[data-odd]');
        if (cells.length < 2) continue;
        const h = parseFloat(cells[0].dataset.odd);
        const a = parseFloat(cells[1].dataset.odd);
        if (Number.isFinite(h) && Number.isFinite(a)) {
          chosen = { bid: row.dataset.bid, h, a };
          break;
        }
      }
    }
    return chosen;
  }

  // ---------- main ----------
  async function runImport(opts) {
    const { pid, name, force = false } = opts || {};
    if (!pid || !name) throw new Error('runImport: missing pid or name');
    const log = (...a) => { console.log('[V5quick]', ...a); if (window._v5quick) window._v5quick.lines.push(a.join(' ')); };
    if (window._v5quick) window._v5quick.status = 'running';

    log(`=== ${pid} (${name}) === force=${force}`);

    // Slug candidates: zkus jméno-příjmení i příjmení-jméno
    const playerSlug = slugify(name);
    const slugReversed = playerSlug.split('-').reverse().join('-');
    const slugCandidates = playerSlug === slugReversed ? [playerSlug] : [playerSlug, slugReversed];
    const playerKey = playerSlug.split('-').filter((p) => p.length >= 4).pop() || playerSlug;
    log(`slug candidates=${slugCandidates.join('|')} key=${playerKey}`);

    // 1. History
    const hist = await ghGet(`player_history/${pid}.json`);
    if (!hist) throw new Error(`No history for ${pid}`);
    const all = hist.data.matches || [];
    log(`history matches: ${all.length}`);

    // 2. Selekce zápasů k importu
    let toImport;
    if (force) {
      // Force mode: smaž všechny odds a vezmi všechny scored zápasy
      let cleared = 0;
      for (const m of all) {
        if (m.odds_alc !== undefined || m.odds_opp !== undefined || m.odds_src !== undefined) {
          delete m.odds_alc; delete m.odds_opp; delete m.odds_src;
          cleared++;
        }
      }
      log(`FORCE: cleared ${cleared} existing odds (committing pre-clear)`);
      hist.data.updated = new Date().toISOString();
      const preClear = await ghPut(
        `player_history/${pid}.json`,
        hist.data,
        hist.sha,
        `Force refresh: clear odds for ${pid} (${name}) - ${cleared} matches`
      );
      hist.sha = preClear.content.sha;
      toImport = all.filter((m) => m.score);
    } else {
      // Quick mode: posortuj desc po datu, ber dokud nenarazíš na zápas s odds, max 20
      const sorted = all.filter((m) => m.score).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      toImport = [];
      for (const m of sorted) {
        if (m.odds_alc) break;
        toImport.push(m);
        if (toImport.length >= MAX_RECENT) break;
      }
    }
    log(`to import: ${toImport.length}`);
    if (toImport.length === 0) {
      log('nothing to import');
      if (window._v5quick) window._v5quick.status = 'done';
      return { merged: 0, candidates: 0, total: 0 };
    }

    // 3. Daily fetches kolem unikátních dat ±7 dnů
    const uniqDates = [...new Set(toImport.map((m) => m.date))].sort();
    const allDays = new Set();
    // Per-date max tolerance: pokud aspon jeden zapas v ramci dne je Masters/GS, pouzij 14
    const maxTolByDate = {};
    for (const m of toImport) {
      const tol = getFetchTol(m.tournament);
      if (!maxTolByDate[m.date] || tol > maxTolByDate[m.date]) maxTolByDate[m.date] = tol;
    }
    for (const iso of uniqDates) {
      const [y, mo, d] = iso.split('-').map(Number);
      const base = new Date(Date.UTC(y, mo - 1, d));
      const tolForThisDate = maxTolByDate[iso] || FETCH_TOLERANCE_DAYS;
      for (let delta = -tolForThisDate; delta <= tolForThisDate; delta++) {
        const dt = new Date(base.getTime() + delta * 86400000);
        const k = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
        allDays.add(k);
      }
    }
    log(`unique dates: ${uniqDates.length}, daily fetches needed: ${allDays.size}`);

    const dateCache = {};
    let dayIdx = 0;
    // PARALEL: 5 fetchu najednou, 100ms pauza. Pri >=3 errorech v rade fallback na sekvencne.
    const allDaysArr = [...allDays];
    let parallelism = 5;
    let consecutiveErrors = 0;
    for (let batchStart = 0; batchStart < allDaysArr.length; batchStart += parallelism) {
      const batch = allDaysArr.slice(batchStart, batchStart + parallelism);
      const results = await Promise.allSettled(batch.map(async (key) => {
        const [yy, mm, dd] = key.split('-').map(Number);
        const arr = await fetchDailyResults(yy, mm, dd);
        const filtered = arr.filter((x) => x.slug.includes(playerKey));
        return { key, filtered };
      }));
      let batchErrors = 0;
      for (const res of results) {
        dayIdx++;
        if (res.status === 'fulfilled') {
          const { key, filtered } = res.value;
          if (filtered.length) dateCache[key] = filtered;
        } else {
          batchErrors++;
        }
      }
      if (batchErrors > 0) {
        consecutiveErrors += batchErrors;
        if (consecutiveErrors >= 3 && parallelism > 1) {
          console.log(`[V5quick] ${consecutiveErrors} errors, falling back to sequential mode`);
          parallelism = 1;
        }
      } else {
        consecutiveErrors = 0;
      }
      if (window._v5quick) {
        window._v5quick.dailyProgress = `${dayIdx}/${allDays.size}`;
      }
      await sleep(100);
    }
    const totalBE = Object.values(dateCache).reduce((s, a) => s + a.length, 0);
    log(`collected ${totalBE} BE matches across ${Object.keys(dateCache).length} days`);

    // 4. Dedup by MID + orientace
    const midMap = {};
    for (const [dayKey, arr] of Object.entries(dateCache)) {
      for (const m of arr) {
        if (!midMap[m.mid]) midMap[m.mid] = { ...m, foundDates: [dayKey] };
        else midMap[m.mid].foundDates.push(dayKey);
      }
    }
    const uniqueMatches = Object.values(midMap);
    uniqueMatches.forEach((m) => {
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
        m.isHome = false;
        m.opponentSlug = m.slug;
      }
    });
    log(`unique BE MIDs: ${uniqueMatches.length}`);

    // 5. Fuzzy match → kandidáti pro každý history zápas
    const candidates = [];
    for (const hm of toImport) {
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
    log(`candidates: ${candidates.length}/${toImport.length} matched`);

    // 6. Odds fetch s V5 fallbackem (zkus další kandidát pokud první 0 odds)
    const results = [];
    let fIdx = 0;
    // PARALEL ODDS: 5 kandidatu najednou, V5 fallback resi sekvencne uvnitr kazdeho branche.
    // Auto-fallback: pri 3+ errorech v rade snizi parallelism na 1.
    let oddsParallelism = 5;
    let oddsConsecutiveErrors = 0;
    for (let batchStart = 0; batchStart < candidates.length; batchStart += oddsParallelism) {
      const batch = candidates.slice(batchStart, batchStart + oddsParallelism);
      const batchRes = await Promise.allSettled(batch.map(async (c) => {
        for (const be of c.candidates) {
          const chosen = await fetchOddsForMid(be.mid);
          if (chosen) return { c, be, chosen };
        }
        return { c, be: null, chosen: null };
      }));
      let batchErrors = 0;
      for (const res of batchRes) {
        fIdx++;
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
          console.log(`[V5quick] odds: ${oddsConsecutiveErrors} errors, falling back to sequential`);
          oddsParallelism = 1;
        }
      } else {
        oddsConsecutiveErrors = 0;
      }
      if (window._v5quick) window._v5quick.oddsProgress = `${fIdx}/${candidates.length}`;
      await sleep(100);
    }
    log(`odds fetched: ${results.length}/${candidates.length}`);

    // 7. Commit (re-fetch sha, merge, PUT)
    const fresh = await ghGet(`player_history/${pid}.json`);
    if (!fresh) throw new Error('History disappeared during import');
    let merged = 0;
    for (const res of results) {
      const hm = fresh.data.matches.find((m) =>
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
    log(`merged: ${merged}/${results.length}`);

    if (merged > 0) {
      fresh.data.updated = new Date().toISOString();
      await ghPut(
        `player_history/${pid}.json`,
        fresh.data,
        fresh.sha,
        `Import odds for ${pid} (${name}): +${merged} matches${force ? ' [force]' : ''}`
      );
    }
    if (window._v5quick) window._v5quick.status = 'done';
    return { merged, candidates: candidates.length, total: toImport.length };
  }

  window.runImport = runImport;
  window._v5quick = { status: 'idle', lines: [], dailyProgress: '', oddsProgress: '' };
  console.log('[V5quick] loaded. Use: window.runImport({pid, name, force})');
})();
