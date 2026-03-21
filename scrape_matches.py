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

def extract_sets(b):
    # Kazdy blok ma kompletni data: BA=s1p1, BB=s1p2, BC=s2p1, BD=s2p2, BE=s3p1, BF=s3p2, BG=s4p1, BH=s4p2, BI=s5p1, BJ=s5p2
    sets1, sets2 = [], []
    pairs = [('BA','BB'), ('BC','BD'), ('BE','BF'), ('BG','BH'), ('BI','BJ')]
    for k1, k2 in pairs:
        v1 = b.get(k1, '')
        v2 = b.get(k2, '')
        if v1 != '' or v2 != '':
            sets1.append(v1 if v1 != '' else '0')
            sets2.append(v2 if v2 != '' else '0')
        else:
            break
    return sets1, sets2

def parse(txt):
    blocks = [pb(b) for b in txt.split(SEP_RECORD)]
    tournament = ''
    matches = []
    seen_ids = set()

    for b in blocks:
        # Turnajovy header
        if 'ZA' in b and 'AA' not in b:
            tournament = b['ZA']
            continue

        # Match blok: ma AA (match ID), AE (p1 jmeno), AF (p2 jmeno)
        if 'AA' not in b or 'AE' not in b or 'AF' not in b:
            continue

        match_id = b['AA']
        if match_id in seen_ids:
            continue
        seen_ids.add(match_id)

        ts = int(b.get('AD', 0)) * 1000
        st = int(b.get('AB', 0))

        sets1, sets2 = extract_sets(b)

        # Aktualni game score (DA = game score p1, ale nemame p2 samostatne)
        # CR = cislo aktualniho setu
        game1 = b.get('DA', '')
        game2 = b.get('DB', '')  # DB = game score p2 (pokud existuje)

        # Vitez: AG=0 -> AE vyhral, AG=1 -> AF vyhral
        ag = b.get('AG', '')
        winner = 1 if ag == '0' else 2 if ag == '1' else 0

        # Servis: IB=1 -> p1 servis (nebo kontroluj WM/WN)
        serving_code = b.get('IB', '')
        serving = 1 if serving_code == '1' else 2 if serving_code == '2' else 0

        matches.append({
            'id': match_id,
            'tournament': tournament,
            'ts': ts,
            'p1': b.get('AE', ''),
            'p2': b.get('AF', ''),
            'status': st,
            'sets1': sets1,
            'sets2': sets2,
            'game1': game1,
            'game2': game2,
            'serving': serving,
            'winner': winner,
            'url': 'https://www.flashscore.com/match/' + match_id + '/#/match-summary'
        })

    return matches

all_matches = {}
for day in [-1, 0, 1]:
    try:
        r = requests.get(
            f'https://2.flashscore.ninja/2/x/feed/f_2_{day}_1_en_1',
            headers=HEADERS, timeout=15
        )
        r.encoding = 'utf-8'
        matches = parse(r.text)
        all_matches[str(day)] = matches
        finished = [m for m in matches if m['status'] == 3]
        live = [m for m in matches if 0 < m['status'] < 3]
        print(f'Day {day}: {len(matches)} total, {len(live)} live, {len(finished)} finished')
        if finished:
            m = finished[0]
            print(f'  FIN: {m["p1"]} {m["sets1"]} vs {m["p2"]} {m["sets2"]} winner={m["winner"]}')
        if live:
            m = live[0]
            print(f'  LIVE: {m["p1"]} {m["sets1"]}({m["game1"]}) vs {m["p2"]} {m["sets2"]}({m["game2"]}) serving={m["serving"]}')
    except Exception as e:
        import traceback
        print(f'Day {day} error: {e}')
        traceback.print_exc()
        all_matches[str(day)] = []

result = {
    'updated': datetime.utcnow().isoformat() + 'Z',
    'days': all_matches
}
with open('matches.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False)
print('Done.')
