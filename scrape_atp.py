import requests, json, re
from bs4 import BeautifulSoup
from datetime import date
from concurrent.futures import ThreadPoolExecutor, as_completed

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
}

ranges = ['0-100','101-200','201-300','301-400','401-500','501-600','601-700','701-800','801-900','901-1000','1001-1100','1101-1200','1201-1300','1301-1400','1401-1500','1501-5000']
all_players = []
seen_ids = set()

# Step 1: Scrape rankings pages
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

# Step 2: Fetch career high from player profiles (parallel, max 10 workers)
def fetch_career_high(player):
    pid = player.get('id')
    slug = player.get('full_name','').lower().replace(' ','-')
    if not pid or not slug:
        return player
    try:
        url = f'https://www.atptour.com/en/players/{slug}/{pid}/overview'
        r = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, 'lxml')
        for stat in soup.select('div.stat'):
            label = stat.select_one('.stat-label')
            if label and 'Career High Rank' in label.text:
                # Rank value is text node before the span
                val = stat.childNodes[0].strip() if hasattr(stat, 'childNodes') else ''
                # Use BeautifulSoup approach
                raw = stat.get_text(separator='|').split('|')
                rank_val = raw[0].strip() if raw else ''
                # Extract date from label: "Career High Rank (YYYY.MM.DD)"
                m = re.search(r'\((\d{4}\.\d{2}\.\d{2})\)', label.text)
                ch_date = m.group(1).replace('.','-') if m else None
                try:
                    player['ch'] = int(rank_val)
                    player['ch_date'] = ch_date
                except:
                    pass
                break
    except Exception as e:
        pass
    return player

print(f'Fetching career high for {len(all_players)} players...')
with ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(fetch_career_high, p): p for p in all_players}
    done = 0
    for future in as_completed(futures):
        done += 1
        if done % 100 == 0:
            print(f'  Career high: {done}/{len(all_players)}')

players = sorted(all_players, key=lambda p: (p['rank'], p['name']))
result = {'items': players, 'updated': str(date.today()), 'total': len(players)}
with open('atp_players.json', 'w') as f:
    json.dump(result, f, separators=(',', ':'))
print(f'Done: {len(players)} players, updated: {date.today()}')
