# Tennis Scout — BetExplorer Odds Import Pipeline

## Účel tohoto dokumentu

Tento soubor popisuje plně funkční pipeline pro import historických kurzů (odds) z BetExplorer do `player_history/*.json` souborů v repozitáři `Havran001/tennis-scout`. Je určený pro Claude aby okamžitě věděl jak import provést **bez opakovaného hledání v historii chatů**.

**Stav k 26.4.2026:** Pipeline funguje, ověřena na Hijikata, Landaluce, Wu Yibing, Arnaldi, Maestrelli — pokrytí 90-99% zápasů. Spouští se v konzoli prohlížeče na `betexplorer.com` (potřebuje CORS přístup na BE).

---

## 1. Klíčové endpointy

### `/tennis/results/?year=Y&month=M&day=D`
**Nejdůležitější endpoint.** Vrací HTML se VŠEMI tenisovými zápasy daného dne napříč všemi turnaji (ATP, WTA, Challenger, ITF). Historicky funguje i pro roky 2015+.

**Bez tohoto endpointu nelze získat odds ze starších let** — BE player stránka `/tennis/player/{slug}/{id}/results/` vrací jen posledních ~50 zápasů.

### `/match-odds-old/{MID}/1/ha/1/en/`
Vrací JSON: `{"odds": "<escaped HTML s tabulkou kurzů>"}`.
- Parsovat `tr[data-bid]` řádky
- Každý řádek = 1 bookmaker s `data-bid={bid}`, `data-bookie-id`
- 2 buňky s `data-odd="{hodnota}"` = home / away odds

### `/gres/ajax/search.php?text=NAME&sid=0&lang=en`
Vyhledání hráče na BE. Vrací HTML se seznamem výsledků.
Regex: `/\/tennis\/player\/([a-z-]+)\/([a-zA-Z0-9]{8})\//` → slug + 8-znakové BE ID.

### `/tennis/player/{slug}/{BE_ID}/results/`
Posledních ~50 zápasů hráče. **Nepoužívat** pro historický import — místo toho daily results.

---

## 2. Mapování bookmakerů (bid → jméno)

| `bid` | Bookmaker | Priorita |
|-------|-----------|----------|
| **575** | **BetInAsia** | 1. preference ✓ |
| **16** | **Bet365** | 2. preference |
| 417 | Pinnacle | Fallback |
| 2 | Bwin | Fallback |
| 5 | Unibet | Fallback |
| 148 | William Hill | Fallback |
| 11 | Bet365 (starší ID) | Fallback |
| 26, 27, 44, 56, 429, 847, 909... | Ostatní | Fallback |

Jak se mapují: CSS class v HTML je `.l{bid}` (např. `<td class="in-bookmaker-logo l575">`). Jména jsou z `/odds-movements/` stránky kde figurují v kontextu.

---

## 3. Struktura pipeline (V5, funkční)

### Krok 1 — Stáhnout player_history
```javascript
const r = await fetch('https://raw.githubusercontent.com/Havran001/tennis-scout/main/player_history/' + PID + '.json?v=' + Date.now());
const history = await r.json();
const noOdds = history.matches.filter(m => !m.odds_alc && m.score);
const uniqDates = [...new Set(noOdds.map(m => m.date))].sort();
```

### Krok 2 — Fetchni daily results pro každé datum ±7 dnů

**KRITICKÉ:** Tolerance musí být **±7 dnů pro běžné turnaje, ±14 dnů pro Masters/Grand Slam**. Jinak nebudou pokryté pozdní fáze (turnaj trvá 2-3 týdny, TA history má datum = začátek týdne).
**Per-tournament tolerance** (od 26.4.2026): pipeline má helper `getFetchTol(tournament)` který vrací 14 pro turnaje obsahující `masters|grand slam|australian open|french open|roland garros|wimbledon|us open`, jinak 7. Pro každý unique date se vezme **maximum** tolerance ze všech zápasů s tím datumem (`maxTolByDate`).

```javascript
const allDays = new Set();
for (const iso of uniqDates) {
  const [y, m, d] = iso.split('-');
  const base = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  for (let delta = -7; delta <= 7; delta++) {
    const dt = new Date(base.getTime() + delta * 86400000);
    const k = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
    allDays.add(k);
  }
}

// Pro každý den stáhni /tennis/results/ a vytáhni matches kde slug obsahuje PLAYER_KEY
for (const key of allDays) {
  const [yy, mm, dd] = key.split('-');
  const r = await fetch(`https://www.betexplorer.com/tennis/results/?year=${yy}&month=${mm}&day=${dd}`);
  const html = await r.text();
  const re = /href="(\/tennis\/([^/]+)\/[^"]+\/([a-z0-9-]+)\/([a-zA-Z0-9]{8}))\/?"/g;
  for (const match of html.matchAll(re)) {
    const category = match[2], slug = match[3], mid = match[4];
    if (/doubles/.test(category)) continue;  // singles only
    if (!slug.includes(PLAYER_KEY)) continue;
    // uložit do dateCache
  }
}
```

**PLAYER_KEY** = unikátní substring ze slugu (např. `"hijikata"`, `"wu-yibing"`, `"arnaldi"`). Pozor na 2-znaková jména (`"wu"` by matchlo i Tung Lin Wu).

### Krok 3 — Dedup + orientace home/away

```javascript
const midMap = {};
for (const [dayKey, arr] of Object.entries(dateCache)) {
  for (const m of arr) {
    if (!midMap[m.mid]) midMap[m.mid] = { ...m, foundDates: [dayKey] };
    else midMap[m.mid].foundDates.push(dayKey);
  }
}
const uniqueMatches = Object.values(midMap);

// Orientace: první hráč v slugu = HOME
uniqueMatches.forEach(m => {
  m.isHome = m.slug.startsWith(PLAYER_SLUG);  // např. "hijikata-rinky"
  m.opponentSlug = m.isHome
    ? m.slug.slice(PLAYER_SLUG.length + 1)
    : m.slug.slice(0, m.slug.length - PLAYER_SLUG.length - 1);
});
```

### Krok 4 — Fuzzy matching (3 pasti + Li Tu fix)

```javascript
const slugify = s => (s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function partsMatch(taParts, beSlug) {
  for (const p of taParts) {
    if (p.length < 4) continue;
    if (beSlug.includes(p)) return true;
    // PAST 1: Apostrof — TA "Oconnell" (bez ') vs BE "o-connell" (s pomlčkou)
    if (p.length >= 5 && beSlug.includes(p.slice(1))) return true;
    // PAST 2: Pořadí jmen — BE někdy "prijmeni-jmeno", jindy "jmeno-prijmeni"
    for (const bePart of beSlug.split('-')) {
      if (bePart.length >= 4 && p.includes(bePart)) return true;
      if (bePart.length >= 4 && bePart.includes(p)) return true;
    }
  }
  return false;
}

// Pro každý history match najdi VŠECHNY kompatibilní BE matches (ne jen nejbližší)
// Tolerance data: ±14 dnů (TA může mít posunuté datum oproti BE)
const candidates = [];
for (const hm of noOddsMatches) {
  const oppSlug = slugify(hm.opponent);
  const oppParts = oppSlug.split('-').filter(p => p.length >= 3);

  const compatible = uniqueMatches.filter(be => {
    const minDist = Math.min(...be.foundDates.map(fd => daysBetween(hm.date, fd)));
    if (minDist > 14) return false;
    return partsMatch(oppParts, be.opponentSlug);
  });

  if (compatible.length > 0) {
    compatible.sort((a, b) => {
      const da = Math.min(...a.foundDates.map(fd => daysBetween(hm.date, fd)));
      const db = Math.min(...b.foundDates.map(fd => daysBetween(hm.date, fd)));
      return da - db;
    });
    candidates.push({ hm, candidates: compatible });  // ← uložit VŠECHNY, ne jen první
  }
}
```

### Krok 5 — Odds fetch s V5 fallbackem

**KRITICKÉ:** Pokud první kandidát vrátí 0 bookmakerů (BE má MID ale žádné kurzy), **zkusit další kandidát**. Jinak se zápas nesprávně označí jako "no odds" i když existuje duplicitní MID s kurzy.

```javascript
const BOOKIE_PRIORITY = [{ bid: '575' }, { bid: '16' }];

async function fetchOddsForMid(mid) {
  const r = await fetch('https://www.betexplorer.com/match-odds-old/' + mid + '/1/ha/1/en/');
  const d = JSON.parse(await r.text());
  const parser = new DOMParser();
  const doc = parser.parseFromString(d.odds, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tr[data-bid]'));
  let chosen = null;
  for (const bp of BOOKIE_PRIORITY) {
    const row = rows.find(r => r.dataset.bid === bp.bid);
    if (row) {
      const cells = row.querySelectorAll('[data-odd]');
      if (cells.length >= 2) {
        chosen = { bid: bp.bid, h: parseFloat(cells[0].dataset.odd), a: parseFloat(cells[1].dataset.odd) };
        break;
      }
    }
  }
  // Fallback: první dostupný bookmaker
  if (!chosen && rows.length > 0) {
    const row = rows[0];
    const cells = row.querySelectorAll('[data-odd]');
    if (cells.length >= 2) chosen = { bid: row.dataset.bid, h: parseFloat(cells[0].dataset.odd), a: parseFloat(cells[1].dataset.odd) };
  }
  return chosen;  // může být null
}

// V5: pro každý history match zkus kandidáty v pořadí dokud nějaký nedá odds
for (const c of candidates) {
  let used = null, usedBE = null;
  for (const be of c.candidates) {
    const chosen = await fetchOddsForMid(be.mid);
    await new Promise(r => setTimeout(r, 150));  // rate limit
    if (chosen) { used = chosen; usedBE = be; break; }
  }
  if (used) {
    // Orientace home/away
    const odds_alc = usedBE.isHome ? used.h : used.a;
    const odds_opp = usedBE.isHome ? used.a : used.h;
    results.push({ hm: c.hm, ok: true, odds_alc, odds_opp, odds_src: 'bid' + used.bid });
  }
}
```

### Krok 6 — Commit do GitHub

Použít Contents API s `sha` aktuálního souboru. Fresh fetch, merge, PUT.

```javascript
const TOKEN = '<GitHub PAT s public_repo scope>';  // z localStorage['ts_gh_token']
const REPO = 'Havran001/tennis-scout';
const PATH = `player_history/${PID}.json`;

// 1. Fresh fetch se sha
const r1 = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}?ts=` + Date.now(), {
  headers: { 'Authorization': 'token ' + TOKEN, 'Accept': 'application/vnd.github.v3+json' }
});
const meta = await r1.json();

// 2. Dekoduj s UTF-8 (NE atob samotný — rozbije diakritiku)
const bytes = Uint8Array.from(atob(meta.content.replace(/\n/g, '')), c => c.charCodeAt(0));
const current = JSON.parse(new TextDecoder('utf-8').decode(bytes));

// 3. Merge odds
for (const res of results.filter(r => r.ok)) {
  const hm = current.matches.find(m =>
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
  }
}
current.updated = new Date().toISOString();

// 4. Encode zpět s UTF-8
const newContent = JSON.stringify(current, null, 2);
const utf8Bytes = new TextEncoder().encode(newContent);
let binary = '';
for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
const b64 = btoa(binary);

// 5. PUT commit
const r2 = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
  method: 'PUT',
  headers: { 'Authorization': 'token ' + TOKEN, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `Import odds for ${PID}`,
    content: b64,
    sha: meta.sha
  })
});
```

---

## 4. Orientace home/away (kritické!)

BE URL slug má tvar `{player1}-{player2}`. První hráč = HOME = první `data-odd` v řádku (`cells[0]`), druhý = AWAY = druhý `data-odd` (`cells[1]`).

Pro importovaného hráče:
- Pokud `slug.startsWith(PLAYER_SLUG)` → je HOME → `odds_alc = home odd`, `odds_opp = away odd`
- Jinak je AWAY → `odds_alc = away odd`, `odds_opp = home odd`

**Pozor:** `odds_alc` = "naše" (Alcaraz bylo první jméno v původním testovacím scénáři, zkratka zůstala). Znamená **kurz importovaného hráče**, ne Alcaraze.

---

## 5. Známá omezení BE

**BE nemá:**
- M15/M25 ITF Futures (většinou)
- Wimbledon qualifying 2022+ (většinou)
- Starší než ~2019 ITF obecně
- Některé Challenger turnaje pre-2020

**Dopad na pokrytí:**
- ATP Tour (Grand Slam, Masters, 250, 500): ~100%
- Challenger Tour: ~95-98%
- ITF M25: ~30-50%
- ITF M15: ~10-20%
- Junior Futures pre-2019: ~0-10%

---

## 6. Formát `odds_src`

**Aktuální standard (od V5):**
- `bid575` — BetInAsia
- `bid16` — Bet365
- `bid417` — Pinnacle
- `bid{N}` — jiný bookmaker

**Legacy formáty v existujících datech (nesjednotit zatím, problematické přepisovat):**
- `"BE"` — starý `be_proxy.py` Python import. **Nespolehlivé!** Míchal kurzy z různých trhů (1x2 + handicap + over/under) + nekontroloval home/away orientaci. Přepsat pomocí V5 pipeline.
- `"betinasia"`, `"bet365"` — textové labely z ještě starších importů. Kvalita neověřená.

---

## 7. Case studies (řešené problémy)

### Problém A: Hijikata vs O'Connell (Seoul CH 2022)
**Symptom:** Zápas nebyl matchnut i když BE měl MID.
**Příčina:** TA má `"Christopher Oconnell"` (bez apostrofu) → `oconnell`. BE má `o-connell-christopher` → `o`, `connell`, `christopher`. `oconnell` není substring `o-connell-christopher`.
**Fix:** Porovnat TA part bez prvního znaku: `oconnell.slice(1) = "connell"` → je substring BE slugu ✓.

### Problém B: Landaluce vs Lehečka (Miami QF 2026)
**Symptom:** Pipeline nenašla Lehečku, i když byl na BE.
**Příčina:** Tolerance ±3 dny nepokryla Miami Masters QF (turnaj trvá 2 týdny, TA dává datum = první den = 18.3., BE má QF na 24.3., rozdíl 6 dnů).
**Fix:** Rozšířit toleranci na **±7 dnů** při fetchování + **±14 dnů** při matchingu.

### Problém C: Landaluce vs Sweeny (Canberra CH 2024)
**Symptom:** Zápas byl "unmatched", ale BE měl 2 MIDs pro tento zápas.
**Příčina:** Canberra 2024 měl 2 Challenger turnaje po sobě (Canberra 1 + Canberra 2). BE má 2 MIDs `sweeny-dane-landaluce-martin` — první bez odds (BE ho ví ale nemá bookmakery), druhý s odds. Pipeline vybrala bližší datum (první MID), dostala 0 bookmakerů, ukončila.
**Fix:** V5 fallback — zkoušet další kandidát když první nemá odds.

### Problém D: Wu Dostanic (Sarasota CH 2026)
**Symptom:** `odds_alc=2.67, odds_opp=1.42` — ale Wu byl favorit a vyhrál, mělo být naopak.
**Příčina:** Starý `be_proxy.py` Python skript vzal `vals[0::2]` a `vals[1::2]` ze **všech** `data-odd` v HTML, včetně trhů jako handicap, over/under, sets. Nevalidní hodnoty. Navíc nekontroloval `slug.startsWith(PLAYER_SLUG)` pro určení home/away.
**Fix:** Full refresh přes V5 pipeline — vezme jen `tr[data-bid]` rows (match winner market), respektuje orientaci ze slugu.

### Problém E: Vacherot vs Djokovic (Shanghai Masters 2025 SF)
**Symptom:** Při full refresh Vacherota se naimportovaly všechny zápasy z Shanghai Masters (Q1 → F) **kromě** SF s Djokovicem.
**Příčina:** Shanghai Masters trval 25.9. → 12.10.2025 (~17 dnů s qualifiers). TA history má datum = `2025-10-01` (začátek týdne). Při ±7 dnů byl fetch range `24.9. - 8.10.` Reálné SF datum bylo **10.-11.10.** → mimo range. Final (12.10.) se náhodou chytlo přes range okolního turnaje (Basel ±7 = 13.10.-27.10.).
**Fix:** Per-tournament tolerance — Masters/Grand Slam získaly ±14 dnů (nový range `17.9. - 15.10.`). Implementováno v `getFetchTol()` helper.

### Problém F: Tichý fail při paralelizaci 12× (transient network errors)
**Symptom:** Při force refresh Schoolkate s parallelism=12 se občas některé daily fetches **tiše ztratily** (`fetch failed` v logu, ale auto-fallback se neaktivoval). 19 dnů z 1628 nikdy nebylo načteno.
**Příčina:** `fetchDailyResults` zachytila chybu a vrátila `return [];` → `Promise.allSettled` to viděl jako `fulfilled` → batchErrors=0 → fallback nereagoval. Daily fetches mizely "neviditelně".
**Fix:** Dvouvrstvý retry mechanismus:
1. **Internal retry**: `fetchDailyResults` při error počká 500ms a zkusí znovu. Většina transient chyb se vyřeší.
2. **Post-pass retry**: Pokud i druhý pokus selže, propaguje se chyba (`throw e2`). Failed dny se zaznamenají do `failedDays[]` array. Po dokončení paralelní fáze se sekvenčně opakují s 500ms pauzami.

Po fix: 0× `fetch FAILED 2x`, +42 BE matches zachyceno (2293 → 2335), žádné ztráty.

### Problém G: Krátká asijská jména (Li Tu, Yu Hsu) nematchují
**Symptom:** Schoolkate, Shimabukuro, De Jong měli **0% pokrytí odds u všech zápasů s Li Tu** napříč 6 zápasy (Brisbane CH 2026, Burnie 2 CH 2024, M25 Bendigo 2022, Wimbledon Q2 2025, Kobe CH 2024, US Open Q3 2024). BE má všechny zápasy s odds, ale pipeline je nematchuje.
**Příčina:** **Dvě úrovně length filtru** v fuzzy matchingu:
1. Pre-filter: `oppParts = oppSlug.split('-').filter(p => p.length >= 3)`
2. Internal filter: `if (p.length < 4) continue` v `partsMatch()`

Pro "Li Tu" → slug `li-tu` → parts `['li','tu']` (oba length 2). Pre-filter je vyhodil, `partsMatch()` dostal prázdné pole, vždy vrátil `false`.
**Fix (dvou-fázový):**
1. **partsMatch logika**: Přidán fallback pro krátká parts — když všechna parts jsou length < 4, vyžaduje **whole-token equality** v BE slug (nikoli substring, aby `li` nematchla `liam`).
2. **Pre-filter**: Snížen z `p.length >= 3` na `p.length >= 2`. Bez tohoto fixu se krátké parts nikdy nedostanou do `partsMatch`.

Po fix: 6/6 Li Tu zápasů má odds. Žádné false positives ověřeny na testech (`Li Tu` vs `liam-thompson` zůstává false).

### Problém H: fetchOddsForMid neměl retry (transient failures v odds fázi)
**Symptom:** Po implementaci daily retry (Problém F) se přesunul problém do odds fáze. Mezi běhy se měnil počet zachycených odds (např. De Jong: běh 1 = 395, běh 2 = 390, běh 3 = 396). Konkrétně: Hanfmann Marrakech 2026, Jodar Madrid 2026, Mensik/Auger Aliassime Shanghai 2025, Fucsovics Stockholm 2025 — vše BE má s bid575, ale občas se nezachytilo.
**Příčina:** `fetchOddsForMid` měl stejný bug jako původní `fetchDailyResults`:
```javascript
try { ... } catch (e) { return null; }  // tichý fail bez retry
```
Při transient síťové chybě na BE odds endpoint (`/match-odds-old/{mid}/1/ha/1/en/`) funkce vrátila `null`, V5 fallback v paralelním 5× rezimu zkusil další kandidát, ale pokud byl jen jeden (typicky 1-2 kandidáti per zápas), výsledek = žádné odds. **Bez retry, bez log warningu**.
**Fix:** Stejný pattern jako u `fetchDailyResults` — internal 1× retry s 500ms backoff. Pokud i druhý pokus selže, log warning + return null. **Žádný post-pass retry pro odds není potřeba** — V5 fallback per branch už zkouší alternativní MIDs.

**Po fix:** De Jong recentNoOdds (2023+) z 7 zápasů na **1** (jen 2023 ITF M25, genuine BE gap). Žádný `odds fetch FAILED 2x` v logu. Pipeline je teď **plně robustní** v obou fázích.

**Empirické porovnání pro De Jong (466 zápasů, force refresh):**
| Run | Pipeline state | Merged | Coverage |
|-----|---------------|--------|----------|
| #1 propagate | bez odds retry | 394 | 84.5% |
| #2 debug | bez odds retry | 395 | 84.8% |
| #3 re-run | bez odds retry | 390 (zhoršilo se) | 83.7% |
| **#4 s odds retry** | **+ odds retry** | **396** | **85.0%** ✅ |

---

### Problém I: Daily fetch parallelism 20 (z 12)

Po implementaci `Problém F` retry s 500ms backoff bylo testováno zvýšení parallelism daily fetches.

**Test**: paralelně 20 (z 12) — žádné nové transient errors. BE Cloudflare zvládá 20 souběžných.

**Změna v `import-odds.mjs`**:
```javascript
const PARALLELISM_DAILY = 20  // bylo 12
```

Empirické pozorování: při 25-30 souběžných requestech BE začíná občas vracet 5xx → 20 je sweet spot.

### Problém J: OPPONENT_ALIASES (Korean transliterace)

**Problém**: Pipeline neochynaly korejské hráče s alternativní transliteraci jména.

**Příklady**:
- Sackmann: `Soonwoo Kwon` (Sin spelling)
- ATP: `Soon Woo Kwon` (Shin spelling)
- BE: `kwon-shin-woo` nebo `kwon-sin-woo` v různé dny

Pipeline matchovala Sackmann jméno proti BE slug ale **ignorovala alternative spellings**.

**Řešení (commit 27.4.2026)**: `OPPONENT_ALIASES` map + `expandTaParts` funkce v `import-odds.mjs`:

```javascript
const OPPONENT_ALIASES = {
  "sin":  ["shin"],
  "shin": ["sin"],
  "lee":  ["yi", "rhee", "ree"],
  "yi":   ["lee"],
  "park": ["pak", "bak"],
  "pak":  ["park"],
  "choi": ["choe", "tsoi"],
  "choe": ["choi"],
  "jung": ["jeong", "joung", "jong"],
  "jeong": ["jung"]
}
```

Empiricky dopad: ~6 dalsich odds u top 10 asijskych hracu (Kwon, Sun, Park, Choi). Marginalni (~1%) ale spravne.

### Problém K: BE GUARD (zabraneni smazani odds pri Cloudflare-down)

**Bug**: Pipeline ma `force: true` mode ktery pred importem **smaze vsechny existujici odds** hrace. Pokud BE prave byl Cloudflare-down (vraci 200 + prazdne HTML), pipeline:
1. Smazala vsechny existujici odds (commit pre-clear)
2. Fetched daily results = 0 zaznamu
3. Nic nematchnulo - import 0 odds
4. Hrac zustal s 0 odds (data ztracena!)

**Reseni (commit 28.4.2026)**: Pre-clear sample fetch v `import-odds.mjs`:

```javascript
if (force) {
  // BE GUARD: zkus si fetchnout dnes-3 jako sample
  const today = new Date()
  const guardDate = new Date(today.getTime() - 3 * 86400000)
  const guardSample = await fetchDaily(guardDate)
  if (guardSample.length === 0) {
    throw new Error("BE_GUARD_FAILED_empty_response")
  }
}
// Teprve pak smaz odds
```

Pokud BE vrati 0 zaznamu pro testovaci den, pipeline radeji prerusi nez aby smazala existujici data.

---

## 8. Performance & prostředí

**Tempo (od 26.4.2026, V6 — finální):**
- **Daily results fetch: 12 paralelně** + 100ms pauza mezi batchemi (~30 req/s effective)
- **Odds fetch: 5 paralelně** s V5 fallbackem uvnitř každého branche
- **Retry mechanismus**: `fetchDailyResults` má interní 1× retry + post-pass sekvenční retry pro failed dny
- **Auto-fallback**: pokud 3+ requesty padnou v řadě → snížení na sekvenční (1×). V praxi se neaktivuje, retry to vyřeší.
- Pro hráče s ~300-500 zápasy v historii: **5-8 minut** na plnou pipeline (předtím 30-50 min sekvenčně)

**Empirická validace pipeline V6 (parallelism 12 daily + 5 odds + retry):**
| Hráč | Zápasy | Unique dates | Daily fetches | Total time |
|------|--------|--------------|---------------|------------|
| Misolic | 317 | 136 | ~1900 | 16 min (V2) |
| De Jong | 466 | 192 | ~2700 | 12.1 min (V3) |
| Shimabukuro | 428 | 179 | ~2500 | 7.9 min (V4) |
| **Schoolkate** | **388** | **170** | **~2500** | **5.4 min (V6)** ✅ |

Z původních ~50 min (V1 sekvenční) na **~5-6 min** = **10× rychlejší**.

**Prostředí:**
- Běží v Chrome konzoli na `betexplorer.com` (CORS důvod — jen tam lze fetchovat BE + GitHub API)
- Uživatel (Havran001) má Mac, síťový problém blokuje Python/Terminal
- Chrome musí mít otevřený tab na `betexplorer.com` pro spuštění
- GitHub PAT token v `localStorage['ts_gh_token']` (scope `public_repo` stačí)

**Background runner pattern:**
Daily results fetch běží dlouho (~5 min) — musí být v async IIFE co updatuje `window._progress` objekt. Claude ho může pollovat každých 10s přes `javascript_tool`. Vyhýbá se 45s timeoutu na jednotlivý `javascript_tool` call.

```javascript
window._progress = { completed: 0, total: 0, done: false, dateCache: {} };
(async () => {
  // ... fetch loop, updates window._progress
  window._progress.done = true;
})();
'started';  // ← synchronně vrátí, smyčka běží dál
```

---

## 9. Jak spustit pro nového hráče (checklist)

1. **Najdi ID v Tennis Scout:** `window.ATP_PLAYERS.find(p => p.full_name === 'Jméno Příjmení')`
2. **Najdi BE ID:** přes `/gres/ajax/search.php?text={surname}&sid=0&lang=en`
3. **Najdi player slug:** z BE URL typu `/tennis/player/{slug}/{BE_ID}/results/`
4. **Definuj PLAYER_KEY:** unikátní substring slugu (pozor na common surnames)
5. **Spusť Krok 2 pipeline** (daily results fetch) — ~5 min background
6. **Poll progress** `window._progress` dokud `done: true`
7. **Spusť Krok 3 + 4** (dedup + matching)
8. **Spusť Krok 5** (odds fetch + V5 fallback) — ~1-2 min
9. **Commit přes Krok 6**
10. **Ověř** `raw.githubusercontent.com/.../player_history/{PID}.json`

---

## 10. Výsledky dosud (26.4.2026, V6 finální)

| Hráč | Rank | Zápasy | S odds | Pokrytí | BetInAsia % | Pipeline |
|------|------|--------|--------|---------|-------------|----------|
| Landaluce M. | 99 | 212 | 211 | **99.5%** | 70% | sekvenčně |
| Maestrelli F. | 112 | 338 | 334 | **99%** | 66% | sekvenčně |
| Arnaldi M. | 103 | 369 | 357 | **97%** | 63% | sekvenčně |
| Misolic F. | 111 | 317 | 304 | 96% | 72% | paralelně 5× |
| Wu Yibing | 100 | 238 | 224 | 94% | 55% | sekvenčně |
| Hijikata R. | 101 | 416 | 374 | 90% | 70% | sekvenčně |
| Vacherot V. | 23 | 398 | 351 | 88% | 60% | sekvenčně (před fixem) |
| **Schoolkate T.** | **114** | **388** | **380** | **98%** | **65%** | **V6 (12+5 paralel + retry + Li Tu fix)** ✅ |
| **Shimabukuro S.** | **108** | **428** | **342** | **80%** | **70%** | **V6** ✅ |
| **De Jong J.** | **109** | **466** | **394** | **84%** | **65%** | **V6** ✅ |

---

## 12. Architektura (od 26.4.2026)

Pipeline má dvě varianty se stejnou logikou:

### A. Action runner pipeline (`scripts/import-odds.mjs`)
- Spouští se přes **tlačítko ⚡ Odds** v Tennis Scout UI
- Tlačítko vytvoří `pending_imports/{pid}.json` přes GitHub API
- Push trigger → GitHub Actions workflow → **self-hosted runner na Macu** (EU IP, kvůli BetInAsia geofiltru)
- Quick mode (default): max 20 nejnovějších zápasů, dokud nenarazí na zápas s odds
- Force mode (`force: true` v pendingu): smaže všechny existující odds + plný refresh všech scored zápasů
- Logy v https://github.com/Havran001/tennis-scout/actions

### B. V5-quick manuální (`import_v5_quick.js`)
- Spouští se ručně z BE konzole na betexplorer.com
- Načte se přes `fetch + eval`, pak `window.runImport({pid, name, force})`
- Pro batch operace nebo když Action runner není dostupný

Oba sdílejí stejné klíčové konstanty: BetInAsia (bid575) priority, Bet365 fallback, ±7/±14 tolerance, V5 fallback (zkoušej další kandidát pokud první nemá bookmakery).

### Self-hosted runner setup (Mac)
```
cd ~/actions-runner
./svc.sh install
./svc.sh start
```
- Běží jako launchd služba — žádný terminál není nutný
- Plist: `~/Library/LaunchAgents/actions.runner.Havran001-tennis-scout.mac-runner.plist`
- Logs: `~/Library/Logs/actions.runner.Havran001-tennis-scout.mac-runner`

## 10b. Vysledky 27-30.4.2026 (V8 - aliases + BE GUARD + scale)

Po V6 (sekce 10) nasledoval velky scale:

| Datum | Batch | Hraci | Imported odds | Tempo | Coverage |
|-------|-------|-------|---------------|-------|----------|
| 27.4. | top 1-115 | 115 | ~54 000 | 3.5 min/hrac | ~85% |
| 28.4. | rank 116-265 | 150 | ~64 000 | 2.5 min/hrac | ~80% |
| 28.4. | rank 266-500 | 235 | ~71 000 | 2.3 min/hrac | ~78% |
| 28.4. | rank 501-1000 | 499 | ~85 000 | 1.4 min/hrac | ~75% |
| 29.4. | rank 1001-1500 | 457 | 37 137 | 0.9 min/hrac | 74.9% |
| 30.4. | rank 1501-2231 | 476 | 18 525 | 0.46 min/hrac | 67.4% |

**TOTAL: 1932 hracu s odds, ~330 000 odds celkem**

Pozorovani:
- Tempo rapidne roste s nizsim rankem (mene historie pro nizko-rankove)
- Coverage klesa s rankem (BE ma slabsi pokryti pro ITF)
- Pinnacle (bid417) dominuje pro nizko-rankove (44% > Bet365 19%)

### Pipeline IDLE bug (= for-loop neuvidi nove pendings)

Pozorovano opakovane po dokonceni velkeho batche: pipeline dobehne for-loop, ale **nezachyti pendings ktere prisly mid-execution**. Workflow status = `success` ale 5-50 pendings v repu.

**Workaround**: manualni touch trigger (PUT na first stale pending). Workflow se znovu zachyti + dokonci.

### Mac runner stale (caffeinate critical)

Self-hosted runner se obcas dostane do "online ale neuvazjuci" stavu. Duvod neznamy — mozna related k Mac sleep mode i pres runner bezici.

**Workaround**:
```bash
kill $(ps aux | grep Runner.Listener | grep -v grep | awk '{print $2}')
cd ~/actions-runner && nohup ./run.sh > runner.log 2>&1 &
caffeinate -d -i &  # NUTNE pro overnight behy
```

---

## 11. TO DO

- [ ] Full refresh pro rank 1-100 (všichni mají legacy `odds_src="BE"` — buggy Python data)
- [ ] Batch spouštění pro rank 101-200 (~100 hráčů × ~8 min = ~13 hodin, ale lze večer/přes noc)
- [ ] Sjednocení formátu `odds_src` (legacy `"BE"`, `"betinasia"`, `"bet365"` → `bid{N}`)
- [ ] Návrh UI tlačítka v Tennis Scout app pro self-service import uživatele
- [ ] Revokovat starý token `ghp_boIN42KsxHdvJof8...` v `be_proxy.py` uploaded souboru
