import requests, json, base64, os
from bs4 import BeautifulSoup
from datetime import date

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
}

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

            # Parse rank — handle "1651T" (tied) by stripping trailing letters
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
            player_id = parts[3] if len(parts) > 3 else ""

            # Skip exact duplicate (same id) but allow tied ranks
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

            all_players.append({'rank': rank, 'name': name, 'country': country, 'pts': pts, 'id': player_id})

        print(f'{rng}: {len(all_players)} total')
    except Exception as e:
        print(f'Error {rng}: {e}')

# Sort by rank then name (for tied ranks, maintain alphabetical order as on ATP)
players = sorted(all_players, key=lambda p: (p['rank'], p['name']))
result = {'items': players, 'updated': str(date.today()), 'total': len(players)}
with open('atp_players.json', 'w') as f:
    json.dump(result, f, separators=(',', ':'))
print(f'Done: {len(players)} players, updated: {date.today()}')
