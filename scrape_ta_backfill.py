"""
Backfill 2025+2026 match history from Tennis Abstract (tennisabstract.com).
TA HTML structure: td[0]=DD-Mon-YYYY, td[1]=tournament, td[2]=surface,
                   td[3]=round, td[6]=result ("Zverev d. Opponent" or "Opponent d. Zverev"),
                   td[7]=score
"""
import requests, json, os, re, time
from datetime import date

OUT_DIR = 'player_history'
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; tennis-scout/1.0)'}

MONTH_MAP = {
    'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06',
    'Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'
}

# Date pattern: "22-Nov-2025" or "03-Jan-2026"
DATE_RE = re.compile(r'^\d{2}-[A-Z][a-z]{2}-202[56]$')

def parse_date(s):
    try:
        parts = s.strip().split('-')
        if len(parts) == 3:
            d, m, y = parts
            return y + MONTH_MAP.get(m, '00') + d.zfill(2)
    except Exception:
        pass
    return ''

def name_to_slug(full_name):
    return re.sub(r"[^a-zA-Z]", '', full_name)

def scrape_player(slug, player_last_name):
    url = f'https://www.tennisabstract.com/cgi-bin/player.cgi?p={slug}'
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200 or len(r.text) < 2000:
            return []
        html = r.text
    except Exception:
        return []

    matches = []
    row_pat = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
    td_pat  = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)
    tag_re  = re.compile(r'<[^>]+>')

    for row_m in row_pat.finditer(html):
        row = row_m.group(1)
        tds = [tag_re.sub('', td).strip() for td in td_pat.findall(row)]
        if len(tds) < 7:
            continue
        date_raw = tds[0]
        if not DATE_RE.match(date_raw):
            continue
        match_date = parse_date(date_raw)
        if not match_date:
            continue

        tournament = tds[1]
        surface    = tds[2]
        rnd        = tds[3]
        result_td  = tds[6]
        score      = tds[7] if len(tds) > 7 else ''

        # "Zverev d. Munar" → W,  "Sinner d. Zverev" → L
        if ' d. ' in result_td:
            before = result_td.split(' d. ')[0].lower()
            result = 'W' if player_last_name.lower() in before else 'L'
            opp_part = result_td.split(' d. ')[1] if result == 'W' else result_td.split(' d. ')[0]
        else:
            result = 'W'
            opp_part = result_td

        opponent = re.sub(r'\s*\[\w+\].*', '', opp_part).strip()

        matches.append({
            'date':       match_date,
            'tournament': tournament,
            'surface':    surface,
            'level':      '',
            'round':      rnd,
            'result':     result,
            'opponent':   opponent,
            'score':      score,
            'best_of':    '3',
            'rank':       '',
            'opp_rank':   '',
            'src':        'tennisabstract',
        })
    return matches

# ── Main ───────────────────────────────────────────────────────────
print('Loading atp_players.json...')
with open('atp_players.json') as f:
    atp_data = json.load(f)

today = date.today().isoformat()
saved = 0
errors = 0
total_added = 0
players = atp_data.get('items', [])
print(f'Processing {len(players)} players...')

for i, p in enumerate(players):
    pid       = p.get('id', '')
    full_name = p.get('full_name', '') or p.get('name', '')
    if not pid or not full_name:
        continue

    fname = f'{OUT_DIR}/{pid}.json'
    existing = {}
    if os.path.exists(fname):
        try:
            with open(fname) as f:
                existing = json.load(f)
        except Exception:
            existing = {}

    existing_matches = existing.get('matches', [])
    existing_keys = {(m.get('date',''), m.get('opponent','').lower()[:10]) for m in existing_matches}

    slug = name_to_slug(full_name)
    last_name = full_name.split()[-1]

    new_matches = scrape_player(slug, last_name)

    # Debug first 3 players
    if i < 3:
        print(f'  DEBUG {pid} ({full_name}): got {len(new_matches)} TA matches')

    added = 0
    for m in new_matches:
        key = (m['date'], m['opponent'].lower()[:10])
        if key not in existing_keys:
            existing_matches.append(m)
            existing_keys.add(key)
            added += 1

    if added > 0:
        existing_matches.sort(key=lambda x: x.get('date', ''), reverse=True)
        existing['matches'] = existing_matches
        existing['total']   = len(existing_matches)
        existing['updated'] = today
        with open(fname, 'w') as f:
            json.dump(existing, f, separators=(',', ':'))
        saved += 1
        total_added += added
        print(f'  {pid} ({full_name}): +{added} (total {len(existing_matches)})')

    if i % 50 == 0 and i > 0:
        print(f'Progress: {i}/{len(players)}...')

    time.sleep(0.25)

print(f'Done: {saved} players updated, {total_added} matches added, {errors} errors')
print(f'Date: {today}')
