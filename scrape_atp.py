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
# Build map: sackmann_player_id -> (best_rank, best_date)
print('Loading Sackmann ranking files for Career High...')
SACK_BASE = 'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/'
ranking_files = [
    'atp_rankings_70s.csv', 'atp_rankings_80s.csv', 'atp_rankings_90s.csv',
    'atp_rankings_00s.csv', 'atp_rankings_10s.csv', 'atp_rankings_20s.csv',
    'atp_rankings_current.csv'
]

# career_high[player_id] = (best_rank, best_date_str)
career_high = {}
for fname in ranking_files:
    try:
        r = requests.get(SACK_BASE + fname, timeout=30)
        reader = csv.reader(io.StringIO(r.text))
        next(reader, None)  # skip header: ranking_date,rank,player,points
        for row in reader:
            if len(row) < 4: continue
            try:
                rdate, rnk, pid = row[0].strip(), int(row[1].strip()), row[2].strip()
            except:
                continue
            if pid not in career_high or rnk < career_high[pid][0]:
                # Format date: 20220912 -> 2022-09-12
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
# Sackmann players CSV: player_id, name_first, name_last, hand, dob, ioc, height
print('Loading Sackmann player list...')
sack_players = {}  # full_name_lower -> sackmann_id
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

# ── STEP 4: Apply Career High to players ──────────────────────
# Also include 20s file (has more recent data up to ~2024)
matched = 0
today = str(date.today())
for p in all_players:
    full_lower = (p.get('full_name') or p['name']).lower()
    sack_id = sack_players.get(full_lower)
    if sack_id and sack_id in career_high:
        sack_ch, sack_date = career_high[sack_id]
        # Compare with current rank — current rank may be better (Sackmann may be outdated)
        current_rank = p['rank']
        if current_rank <= sack_ch:
            p['ch'] = current_rank
            p['ch_date'] = today
        else:
            p['ch'] = sack_ch
            p['ch_date'] = sack_date
        matched += 1
    else:
        # No Sackmann match — use current rank as best known
        p['ch'] = p['rank']
        p['ch_date'] = today

print(f'Career High matched: {matched}/{len(all_players)}')

# ── STEP 5: Save ──────────────────────────────────────────────
players = sorted(all_players, key=lambda p: (p['rank'], p['name']))
result = {'items': players, 'updated': str(date.today()), 'total': len(players)}
with open('atp_players.json', 'w') as f:
    json.dump(result, f, separators=(',', ':'))
print(f'Done: {len(players)} players, updated: {date.today()}')
