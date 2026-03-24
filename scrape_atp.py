import requests, json, re, csv, io
from bs4 import BeautifulSoup
from datetime import date
from concurrent.futures import ThreadPoolExecutor, as_completed

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
}

# ── STEP 1: Scrape ATP rankings ───────────────────────────────
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

# ── STEP 2: Career High from Sackmann historical rankings ─────
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

# ── STEP 3: Match ATP players to Sackmann IDs ─────────────────
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

# ── STEP 4: Apply Sackmann Career High ────────────────────────
today = str(date.today())
matched_sack = 0
for p in all_players:
    full_lower = (p.get('full_name') or p['name']).lower()
    sack_id = sack_players.get(full_lower)
    if sack_id and sack_id in career_high:
        sack_ch, sack_date = career_high[sack_id]
        # Current rank might be better than outdated Sackmann data
        if p['rank'] <= sack_ch:
            p['ch'] = p['rank']
            p['ch_date'] = today
        else:
            p['ch'] = sack_ch
            p['ch_date'] = sack_date
        matched_sack += 1
    else:
        # No Sackmann match — use current rank as placeholder
        p['ch'] = p['rank']
        p['ch_date'] = today
print(f'Sackmann matched: {matched_sack}/{len(all_players)}')

# ── STEP 5: Fetch ATP rankings-history to fix post-2024 gaps ──
# Only fetch for players where current rank < ch (possible improvement)
# or where we have no Sackmann match
# rankings-history page has Career High in div.stat SSR-rendered
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
                # Text node before label = rank number
                raw = stat.get_text(separator='|').split('|')
                rank_str = raw[0].strip()
                try:
                    ch_rank = int(rank_str)
                except:
                    continue
                # Extract date: "Career High Rank (2022.09.12)"
                m = re.search(r'\((\d{4})\.(\d{2})\.(\d{2})\)', label.get_text())
                ch_date = f'{m.group(1)}-{m.group(2)}-{m.group(3)}' if m else today
                # Only update if ATP says it's better than what we have
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

# ── STEP 6: Apply manual overrides ───────────────────────────
OVERRIDES_URL = 'https://raw.githubusercontent.com/Havran001/tennis-scout/main/career_high_overrides.json'
try:
    r = requests.get(OVERRIDES_URL, timeout=10)
    overrides_data = r.json().get('overrides', {})
    override_count = 0
    for p in all_players:
        pid = p.get('id', '')
        if pid in overrides_data:
            ov = overrides_data[pid]
            p['ch'] = ov['ch']
            p['ch_date'] = ov['ch_date']
            override_count += 1
    print(f'Applied {override_count} manual overrides')
except Exception as e:
    print(f'Overrides not loaded: {e}')

# ── STEP 7: Save ──────────────────────────────────────────────
players = sorted(all_players, key=lambda p: (p['rank'], p['name']))
result = {'items': players, 'updated': today, 'total': len(players)}
with open('atp_players.json', 'w') as f:
    json.dump(result, f, separators=(',', ':'))
print(f'Done: {len(players)} players, updated: {today}')
