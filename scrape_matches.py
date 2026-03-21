import requests, json
from datetime import datetime

HEADERS = {'x-fsign': 'SW9D1eZo', 'User-Agent': 'Mozilla/5.0'}
SEP_RECORD = '~'
SEP_FIELD = '\u00ac'
SEP_VALUE = '\u00f7'

def pb(b):
    o = {}
    for f in b.split(SEP_FIELD):
        i = f.find(SEP_VALUE)
        if i > 0:
            o[f[:i]] = f[i+1:]
    return o

def get_live_scores():
    """Stahuje live skóre z r_2_1 feedu"""
    try:
        r = requests.get('https://2.flashscore.ninja/2/x/feed/r_2_1',
                         headers=HEADERS, timeout=10)
        r.encoding = 'utf-8'
        blocks = [pb(b) for b in r.text.split(SEP_RECORD)]
        scores = {}
        for b in blocks:
            if 'AA' not in b:
                continue
            mid = b['AA']
            # Sety: BA=set1p1, BB=set1p2, BC=set2p1, BD=set2p2, BE=set3p1, BF=set3p2...
            sets1, sets2 = [], []
            for k1,k2 in [('BA','BB'),('BC','BD'),('BE','BF'),('BG','BH'),('BI','BJ')]:
                v1 = b.get(k1,'')
                v2 = b.get(k2,'')
                if v1 != '' or v2 != '':
                    sets1.append(v1 if v1 != '' else '0')
                    sets2.append(v2 if v2 != '' else '0')
                else:
                    break
            scores[mid] = {
                'sets1': sets1,
                'sets2': sets2,
                'game1': b.get('WA', ''),  # game score p1
                'game2': b.get('WB', ''),  # game score p2
                'serving': int(b.get('WC', 0)),  # 1=p1 serves, 2=p2 serves
            }
        return scores
    except Exception as e:
        print(f'Live scores error: {e}')
        return {}

def extract_sets(b1, b2):
    """Extrahuje sety z hlavního feedu (pro dokoncene zapasy)"""
    sets1, sets2 = [], []
    for k1,k2 in [('BA','BB'),('BC','BD'),('BE','BF'),('BG','BH'),('BI','BJ')]:
        v1 = b1.get(k1,'')
        v2 = b2.get(k2,'') or b1.get(k2,'')
        if v1 != '' or v2 != '':
            sets1.append(v1 if v1 != '' else '0')
            sets2.append(v2 if v2 != '' else '0')
        else:
            break
    return sets1, sets2

def parse_tournament(za):
    """Parsuje název turnaje - vrátí zemi a typ"""
    # Format: "ATP - SINGLES: Miami (USA), hard"
    # nebo: "WTA - SINGLES: Miami (USA), hard"
    parts = za.split(':')
    if len(parts) < 2:
        return za, '', ''
    name_part = parts[1].strip()
    # Extrahuj zemi z závorek
    country = ''
    import re
    m = re.search(r'\(([A-Z]{2,3})\)', name_part)
    if m:
        country = m.group(1)
    # Povrch
    surface = ''
    if ',' in name_part:
        surface = name_part.split(',')[-1].strip()
    return za, country, surface

def parse_day(txt, live_scores):
    blocks = [pb(b) for b in txt.split(SEP_RECORD)]
    tournament = ''
    tournament_id = ''
    matches = []
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if 'ZA' in b:
            tournament = b['ZA']
            tournament_id = b.get('ZEE', '')
            i += 1
            continue
        if 'AA' in b and 'CX' in b and i + 1 < len(blocks):
            b2 = blocks[i + 1]
            if 'CX' in b2 and 'ZA' not in b2:
                ts = int(b.get('AD', 0)) * 1000
                st = int(b.get('AB', 0))
                is_live = 0 < st < 3
                
                if is_live and b['AA'] in live_scores:
                    ls = live_scores[b['AA']]
                    sets1 = ls['sets1']
                    sets2 = ls['sets2']
                    game1 = ls['game1']
                    game2 = ls['game2']
                    serving = ls['serving']
                else:
                    sets1, sets2 = extract_sets(b, b2)
                    game1 = b.get('DA', '')
                    game2 = b2.get('DA', '')
                    ag = b.get('AG', '')
                    serving = 0
                
                # Vítěz
                ag = b.get('AG', '')
                winner = 1 if ag == '0' else 2 if ag == '1' else 0
                
                # Turnaj info
                _, country, surface = parse_tournament(tournament)
                
                matches.append({
                    'id': b['AA'],
                    'tournament': tournament,
                    'tournament_id': tournament_id,
                    'tournament_country': country,
                    'tournament_surface': surface,
                    'ts': ts,
                    'p1': b['CX'],
                    'p2': b2['CX'],
                    'status': st,
                    'sets1': sets1,
                    'sets2': sets2,
                    'game1': game1,
                    'game2': game2,
                    'serving': serving,
                    'winner': winner,
                    'url': 'https://www.flashscore.com/match/' + b['AA'] + '/#/match-summary'
                })
                i += 2
                continue
        i += 1
    return matches

# Hlavní logika
live_scores = get_live_scores()
print(f'Live scores fetched: {len(live_scores)} matches')

all_matches = {}
for day in [-1, 0, 1]:
    try:
        r = requests.get(
            f'https://2.flashscore.ninja/2/x/feed/f_2_{day}_1_en_1',
            headers=HEADERS, timeout=15
        )
        r.encoding = 'utf-8'
        matches = parse_day(r.text, live_scores)
        all_matches[str(day)] = matches
        live = [m for m in matches if 0 < m['status'] < 3]
        fin = [m for m in matches if m['status'] == 3]
        print(f'Day {day}: {len(matches)} total, {len(live)} live, {len(fin)} finished')
        if live:
            m = live[0]
            print(f'  Live: {m["p1"]} {m["sets1"]} {m["game1"]} vs {m["p2"]} {m["sets2"]} {m["game2"]} serv={m["serving"]}')
        if fin:
            m = fin[0]
            print(f'  Fin: {m["p1"]} {m["sets1"]} vs {m["p2"]} {m["sets2"]} win={m["winner"]}')
    except Exception as e:
        import traceback; traceback.print_exc()
        all_matches[str(day)] = []

result = {
    'updated': datetime.utcnow().isoformat() + 'Z',
    'days': all_matches
}
with open('matches.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False)
print('Done.')
