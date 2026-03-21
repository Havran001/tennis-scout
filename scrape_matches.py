import requests, json, re
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
    try:
        r = requests.get('https://2.flashscore.ninja/2/x/feed/r_2_1', headers=HEADERS, timeout=10)
        r.encoding = 'utf-8'
        scores = {}
        for b in [pb(x) for x in r.text.split(SEP_RECORD)]:
            if 'AA' not in b: continue
            mid = b['AA']
            sets1, sets2 = [], []
            for k1, k2 in [('BA','BB'),('BC','BD'),('BE','BF'),('BG','BH'),('BI','BJ')]:
                v1, v2 = b.get(k1,''), b.get(k2,'')
                if v1 != '' or v2 != '':
                    sets1.append(v1 or '0'); sets2.append(v2 or '0')
                else: break
            scores[mid] = {
                'sets1': sets1, 'sets2': sets2,
                'game1': b.get('WA',''), 'game2': b.get('WB',''),
                'serving': int(b.get('WC', 0))
            }
        print(f'r_2_1: {len(scores)} scores, IDs: {list(scores.keys())[:5]}')
        return scores
    except Exception as e:
        print(f'r_2_1 err: {e}')
        return {}

def parse_tournament(za):
    country = ''
    m = re.search(r'\(([A-Z]{2,3})\)', za)
    if m: country = m.group(1)
    surface = za.split(',')[-1].strip() if ',' in za else ''
    return country, surface

def parse_day(txt, live_scores):
    blocks = [pb(b) for b in txt.split(SEP_RECORD)]
    tournament, t_country, t_surface = '', '', ''
    matches = []
    seen = set()

    for b in blocks:
        if 'ZA' in b:
            tournament = b['ZA']
            t_country, t_surface = parse_tournament(tournament)
            continue
        if 'AA' not in b or 'AE' not in b or 'AF' not in b:
            continue
        mid = b['AA']
        if mid in seen: continue
        p1, p2 = b.get('AE',''), b.get('AF','')
        if not p1 or not p2: continue
        seen.add(mid)

        ts = int(b.get('AD', 0)) * 1000
        # AB STATUS: 1=napláno, 2=LIVE (probíhá), 3=dokončený
        ab = int(b.get('AB', 0))
        is_live = ab == 2
        is_fin = ab == 3

        sets1, sets2 = [], []
        for k1, k2 in [('BA','BB'),('BC','BD'),('BE','BF'),('BG','BH'),('BI','BJ')]:
            v1, v2 = b.get(k1,''), b.get(k2,'')
            if v1 != '' or v2 != '':
                sets1.append(v1 or '0'); sets2.append(v2 or '0')
            else: break

        game1, game2, serving = '', '', 0
        if is_live:
            ls = live_scores.get(mid)
            if ls:
                if ls['sets1']: sets1 = ls['sets1']
                if ls['sets2']: sets2 = ls['sets2']
                game1 = ls['game1']
                game2 = ls['game2']
                serving = ls['serving']
            if not sets1: sets1 = ['0']; sets2 = ['0']
            if game1 == '': game1 = '0'
            if game2 == '': game2 = '0'

        ag = b.get('AG','')
        winner = 1 if ag == '0' else 2 if ag == '1' else 0

        matches.append({
            'id': mid, 'tournament': tournament,
            'tournament_country': t_country, 'tournament_surface': t_surface,
            'ts': ts, 'p1': p1, 'p2': p2,
            'status': ab,  # Ukládáme přesné AB číslo
            'sets1': sets1, 'sets2': sets2,
            'game1': game1, 'game2': game2,
            'serving': serving, 'winner': winner,
            'url': 'https://www.flashscore.com/match/' + mid + '/#/match-summary'
        })
    return matches

live_scores = get_live_scores()
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
        live = [m for m in matches if m['status'] == 2]
        fin = [m for m in matches if m['status'] == 3]
        sch = [m for m in matches if m['status'] == 1]
        print(f'Day {day}: live={len(live)} sch={len(sch)} fin={len(fin)}')
        if live:
            m = live[0]
            print(f'  Live: {m["p1"]} {m["sets1"]} {m["game1"]}:{m["game2"]} vs {m["p2"]} {m["sets2"]}')
    except Exception as e:
        import traceback; traceback.print_exc()
        all_matches[str(day)] = []

result = {'updated': datetime.utcnow().isoformat()+'Z', 'days': all_matches}
with open('matches.json','w',encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False)
print('Done.')
