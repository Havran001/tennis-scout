import requests, json, re, csv, io
from bs4 import BeautifulSoup
from datetime import date
from concurrent.futures import ThreadPoolExecutor, as_completed

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
}

# ── STEP 1: Scrape ATP rankings ────────────────────────────────────
ranges = ['0-100','101-200','201-300','301-400','401-500','501-600','601-700','701-800','801-900','901-1000','1001-1100','1101-1200','1201-1300','1301-1400','1401-1500','1501-5000']
all_players = []
seen_ids = set()

for rng in ranges:
    try:
        r = requests.get(f'https://www.atptour.com/en/rankings/singles?rankRange={rng}', headers=headers, timeout=20)
        soup = BeautifulSoup(r.text, 'lxml')
        for row in soup.select('table tr')[1:]:
            tds = row.select('td')
            if len(tds) < 3: continue
            rank_raw = tds[0].get_text(strip=True).replace('T','').replace('t','').strip()
            try:
                rank = int(rank_raw)
            except:
                continue
            name_a = tds[1].select_one('li.name a')
            if not name_a: continue
            name = name_a.get_text(strip=True)
            href = name_a.get('href', '')
            parts = [p for p in href.split('/') if p]
            player_id = parts[3] if len(parts) > 3 else ''
            slug = parts[2] if len(parts) > 2 else ''
            full_name = ' '.join(w.capitalize() for w in slug.replace('-', ' ').split()) if slug else name
            if player_id and player_id in seen_ids:
                continue
            if player_id:
                seen_ids.add(player_id)
            flag = tds[1].select_one('svg.atp-flag use')
            country = ''
            if flag:
                fh = flag.get('href') or flag.get('xlink:href', '')
                country = fh.split('#')[-1].replace('flag-', '').upper()
            try:
                pts = int(tds[2].get_text(strip=True).replace(',','').replace('.',''))
            except:
                pts = 0
            all_players.append({
                'rank': rank, 'name': name, 'full_name': full_name,
                'country': country, 'pts': pts, 'id': player_id,
                'ch': None, 'ch_date': None
            })
        print(f'{rng}: {len(all_players)} total')
    except Exception as e:
        print(f'Error {rng}: {e}')

# ── STEP 2: Career High from Sackmann historical rankings ─────────
print('Loading Sackmann ranking files for Career High...')
SACK_BASE = 'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/'
ranking_files = [
    'atp_rankings_70s.csv', 'atp_rankings_80s.csv', 'atp_rankings_90s.csv',
    'atp_rankings_00s.csv', 'atp_rankings_10s.csv', 'atp_rankings_20s.csv',
    'atp_rankings_current.csv'
]

career_high = {}
for fname in ranking_files:
    try:
        r = requests.get(SACK_BASE + fname, timeout=30)
        reader = csv.reader(io.StringIO(r.text))
        next(reader, None)
        for row in reader:
            if len(row) < 4: continue
            try:
                rdate, rnk, pid = row[0].strip(), int(row[1].strip()), row[2].strip()
            except:
                continue
            if pid not in career_high or rnk < career_high[pid][0]:
                try:
                    d = rdate.replace('-','')
                    fmt_date = f'{d[:4]}-{d[4:6]}-{d[6:8]}' if len(d) == 8 else rdate
                except:
                    fmt_date = rdate
                career_high[pid] = (rnk, fmt_date)
        print(f'  {fname}: {len(career_high)} players with career high')
    except Exception as e:
        print(f'  Error loading {fname}: {e}')

# ── STEP 3: Match ATP players to Sackmann IDs ─────────────────────
print('Loading Sackmann player list...')
sack_players = {}
try:
    r = requests.get(SACK_BASE + 'atp_players.csv', timeout=30)
    reader = csv.reader(io.StringIO(r.text))
    next(reader, None)
    for row in reader:
        if len(row) < 3: continue
        pid, first, last = row[0].strip(), row[1].strip(), row[2].strip()
        full = (first + ' ' + last).strip().lower()
        sack_players[full] = pid
    print(f'  Sackmann players: {len(sack_players)}')
except Exception as e:
    print(f'  Error loading atp_players.csv: {e}')

# ── STEP 4: Apply Sackmann Career High ────────────────────────────
today = str(date.today())
matched_sack = 0
for p in all_players:
    full_lower = (p.get('full_name') or p['name']).lower()
    sack_id = sack_players.get(full_lower)
    if sack_id and sack_id in career_high:
        sack_ch, sack_date = career_high[sack_id]
        if p['rank'] <= sack_ch:
            p['ch'] = p['rank']
            p['ch_date'] = today
        else:
            p['ch'] = sack_ch
            p['ch_date'] = sack_date
        matched_sack += 1
    else:
        p['ch'] = p['rank']
        p['ch_date'] = today
print(f'Sackmann matched: {matched_sack}/{len(all_players)}')

# ── STEP 5: Fetch ATP rankings-history for career high ────────────
print(f'Fetching ATP rankings-history for career high verification...')

def fetch_atp_career_high(player):
    pid = player.get('id','')
    slug = (player.get('full_name') or '').lower().replace(' ','-')
    if not pid or not slug:
        return player
    try:
        url = f'https://www.atptour.com/en/players/{slug}/{pid}/rankings-history?year=all'
        r = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, 'lxml')
        for stat in soup.select('div.stat'):
            label = stat.select_one('.stat-label')
            if label and 'Career High Rank' in label.get_text():
                raw = stat.get_text(separator='|').split('|')
                rank_str = raw[0].strip()
                try:
                    ch_rank = int(rank_str)
                except:
                    continue
                m = re.search(r'\((\d{4})\.(\d{2})\.(\d{2})\)', label.get_text())
                ch_date = f'{m.group(1)}-{m.group(2)}-{m.group(3)}' if m else today
                if player['ch'] is None or ch_rank < player['ch']:
                    player['ch'] = ch_rank
                    player['ch_date'] = ch_date
                break
    except Exception:
        pass
    return player

with ThreadPoolExecutor(max_workers=15) as executor:
    futures = {executor.submit(fetch_atp_career_high, p): p for p in all_players}
    done = 0
    for future in as_completed(futures):
        done += 1
        if done % 200 == 0:
            print(f'  ATP fetch: {done}/{len(all_players)}')


# ── STEP 5b: Fetch TennisAbstract peakrank for missing/wrong CH ────
print(f'Fetching TennisAbstract peakrank for players with missing/wrong CH...')

def fetch_ta_peakrank(player):
    """Fetch peakrank + peakfirst from TA player page via codetabs proxy."""
    pid = player.get('id', '')
    full_name = player.get('full_name', '') or player.get('name', '')
    ta_slug = player.get('ta_slug') or ''
    if not ta_slug:
        # Default slug: remove non-alpha, keep first+last name combined
        ta_slug = ''.join(c for c in full_name.title() if c.isalpha())
    if not ta_slug:
        return pid, None, None
    url = f'https://www.tennisabstract.com/cgi-bin/player-classic.cgi?p={ta_slug}&f=ACareerqq'
    proxy_url = f'https://api.codetabs.com/v1/proxy?quest={url}'
    try:
        r = requests.get(proxy_url, timeout=15)
        if r.status_code != 200:
            return pid, None, None
        html = r.text
        m_peak = re.search(r'var\s+peakrank\s*=\s*(\d+)', html)
        m_first = re.search(r'var\s+peakfirst\s*=\s*[\'"]?(\d{8})', html)
        if m_peak:
            peak = int(m_peak.group(1))
            first = m_first.group(1) if m_first else None
            return pid, peak, first
    except Exception:
        pass
    return pid, None, None

# Identify players needing TA fetch:
#  - ch is None
#  - OR ch == rank with ch_date >= 2025-01-01 (means scrape_atp set fallback recently)
ta_candidates = []
for p in all_players:
    needs_fetch = False
    if p.get('ch') is None:
        needs_fetch = True
    elif p.get('ch') == p.get('rank') and p.get('ch_date', '') >= '2025-01-01':
        needs_fetch = True
    elif p.get('ch_date', '') < '2025-01-01' and p.get('rank') is not None and p.get('ch') is not None and p.get('rank') < p.get('ch') + 50:
        # Stará CH (před 2025) a aktuální rank blízko CH (nebo lepší) → CH může být zastaralá
        needs_fetch = True
    if needs_fetch:
        ta_candidates.append(p)

print(f'  TA candidates: {len(ta_candidates)} players')

# Fetch with retry strategy:
#   Pass 1: 1.2s gap (codetabs rate limit) - majority of fetches
#   Pass 2 (retry): 3s gap for those that failed in Pass 1
#   Pass 3 (Wikipedia): for stubborn cases, try Wikipedia API
import time

def apply_ta_result(p, peak, first, source='TennisAbstract peakrank'):
    """Helper: apply CH from TA/Wiki result if it improves current value."""
    if peak and (p.get('ch') is None or peak < p.get('ch', 99999)):
        p['ch'] = peak
        if first and len(first) == 8:
            p['ch_date'] = f'{first[0:4]}-{first[4:6]}-{first[6:8]}'
        p['ch_source'] = source
        return True
    return False

def fetch_wikipedia_ch(player):
    """Fallback: parse Wikipedia infobox for career-high singles ranking."""
    full_name = player.get('full_name', '') or player.get('name', '')
    if not full_name:
        return None, None
    # Try Wikipedia REST API for the page
    page_title = full_name.replace(' ', '_')
    url = f'https://en.wikipedia.org/w/api.php?action=parse&page={page_title}&format=json&prop=wikitext&section=0'
    try:
        r = requests.get(url, timeout=10, headers={'User-Agent': 'TennisScoutBot/1.0'})
        if r.status_code != 200:
            return None, None
        data = r.json()
        wikitext = data.get('parse', {}).get('wikitext', {}).get('*', '')
        if not wikitext:
            return None, None
        # Hledame: 'career-high ATP singles ranking of world No. XX' nebo podobne
        m_rank = re.search(r"[cC]areer-high\s+(?:ATP\s+)?singles?\s+rank(?:ing)?\s+of\s+(?:world\s+)?[Nn]o\.?\s*(\d+)", wikitext)
        if not m_rank:
            # Alternativni: |careerhighsingles = 99
            m_rank = re.search(r"\|\s*careerhighsingles\s*=\s*(\d+)", wikitext)
        if not m_rank:
            return None, None
        peak = int(m_rank.group(1))
        # Hledame datum
        m_date = re.search(r"achieved\s+on\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", wikitext)
        first = None
        if m_date:
            day, month_name, year = m_date.group(1), m_date.group(2), m_date.group(3)
            months = {'January':'01','February':'02','March':'03','April':'04','May':'05','June':'06',
                      'July':'07','August':'08','September':'09','October':'10','November':'11','December':'12'}
            mm = months.get(month_name, None)
            if mm:
                first = f'{year}{mm}{int(day):02d}'
        return peak, first
    except Exception:
        return None, None

# ─── Pass 1: TA fetch with 1.2s gap ───
ta_fixes = 0
ta_failures = []  # list of player dicts that failed Pass 1
for p in ta_candidates:
    pid, peak, first = fetch_ta_peakrank(p)
    if peak:
        if apply_ta_result(p, peak, first):
            ta_fixes += 1
    else:
        ta_failures.append(p)
    time.sleep(1.2)

print(f'  Pass 1: TA fixed CH for {ta_fixes} players, {len(ta_failures)} failures')

# ─── Pass 2: Retry failed with 3s gap ───
retry_fixes = 0
still_failed = []
for p in ta_failures:
    pid, peak, first = fetch_ta_peakrank(p)
    if peak:
        if apply_ta_result(p, peak, first):
            retry_fixes += 1
    else:
        still_failed.append(p)
    time.sleep(3.0)  # delsi gap aby unikl rate limit

print(f'  Pass 2 (retry 3s gap): fixed {retry_fixes} more players, {len(still_failed)} still failed')

# ─── Pass 3: Wikipedia fallback for stubborn cases ───
wiki_fixes = 0
for p in still_failed[:50]:  # cap na 50 aby nebylo prilis pomale
    peak, first = fetch_wikipedia_ch(p)
    if peak:
        if apply_ta_result(p, peak, first, source='Wikipedia infobox'):
            wiki_fixes += 1
    time.sleep(0.5)  # Wikipedia API gentle rate limit

print(f'  Pass 3 (Wikipedia fallback): fixed {wiki_fixes} players (from first 50 of {len(still_failed)} stubborn)')
print(f'  TOTAL CH fixes: TA Pass 1={ta_fixes}, Pass 2={retry_fixes}, Wiki={wiki_fixes} = {ta_fixes + retry_fixes + wiki_fixes}/{len(ta_candidates)} ({(ta_fixes + retry_fixes + wiki_fixes)*100//max(len(ta_candidates),1)}% success)')

# ── STEP 6: Apply manual overrides ───────────────────────────────
OVERRIDES_URL = 'https://raw.githubusercontent.com/Havran001/tennis-scout/main/career_high_overrides.json'
try:
    r = requests.get(OVERRIDES_URL, timeout=10)
    overrides_data = r.json().get('overrides', {})
    override_count = 0
    for p in all_players:
        pid = p.get('id', '')
        if pid in overrides_data:
            ov = overrides_data[pid]
            if 'ch' in ov:
                p['ch'] = ov['ch']
            if 'ch_date' in ov:
                p['ch_date'] = ov['ch_date']
            if 'ta_slug' in ov:
                p['ta_slug'] = ov['ta_slug']
            if 'sack_key' in ov:
                p['sack_key'] = ov['sack_key']
            if 'dob' in ov:
                p['dob'] = ov['dob']
            override_count += 1
    print(f'Applied {override_count} manual overrides')
except Exception as e:
    print(f'Overrides not loaded: {e}')

# ── STEP 7: Compute rank movement ────────────────────────────────
try:
    with open('atp_players.json', 'r') as f:
        old_data = json.load(f)
    old_items = old_data.get('items', old_data) if isinstance(old_data, dict) else old_data
    old_ranks = {p['id']: p['rank'] for p in old_items if p.get('id') and p.get('rank')}
    print(f'Loaded {len(old_ranks)} previous ranks for diff')
except Exception as e:
    old_ranks = {}
    print(f'No previous ranks available: {e}')

for p in all_players:
    pid = p.get('id', '')
    if pid and pid in old_ranks:
        prev = old_ranks[pid]
        diff = prev - p['rank']
        p['move'] = diff if diff != 0 else None
    else:
        p['move'] = None

# ── STEP 7b: Zachovej hráče kteří vypadli z žebříčku ────────────
try:
    with open('atp_players.json', 'r') as f:
        old_data = json.load(f)
    old_items = old_data.get('items', [])
    new_ids = {p['id'] for p in all_players if p.get('id')}
    dropped_count = 0
    for old_p in old_items:
        old_id = old_p.get('id', '')
        if not old_id or old_id in new_ids:
            continue
        # Hráč vypadl z žebříčku - zachovej ho bez ranku
        old_p['rank'] = None
        old_p['move'] = None
        all_players.append(old_p)
        dropped_count += 1
    print(f'Preserved {dropped_count} dropped players')
except Exception as e:
    print(f'Could not preserve dropped players: {e}')

# ── STEP 8: Save ─────────────────────────────────────────────────
# Řaď: aktivní hráči (mají rank) první, pak vypadlí
players = sorted(all_players, key=lambda p: (p['rank'] is None, p['rank'] or 9999, p.get('name','')))

MIN_PLAYERS = 1500
if len([p for p in players if p.get('rank')]) < MIN_PLAYERS:
    print(f'ERROR: Only {len(players)} ranked players scraped (minimum {MIN_PLAYERS}). Aborting!')
    exit(1)

result = {'items': players, 'updated': today, 'total': len(players)}
with open('atp_players.json', 'w') as f:
    json.dump(result, f, separators=(',', ':'))
print(f'Done: {len([p for p in players if p.get("rank")])} ranked + {len([p for p in players if not p.get("rank")])} preserved = {len(players)} total')
