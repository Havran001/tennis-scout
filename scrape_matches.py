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
            for k1,k2 in [('BA','BB'),('BC','BD'),('BE','BF'),('BG','BH'),('BI','BJ')]:
                v1,v2 = b.get(k1,''), b.get(k2,'')
                if v1!='' or v2!='':
                    sets1.append(v1 or '0'); sets2.append(v2 or '0')
                else: break
            scores[mid] = {
                'sets1': sets1, 'sets2': sets2,
                'game1': b.get('WA',''), 'game2': b.get('WB',''),
                'serving': int(b.get('WC',0))
            }
        print(f'r_2_1: {len(scores)} live scores')
        return scores
    except Exception as e:
        print(f'live scores err: {e}')
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
        p1 = b.get('AE',''); p2 = b.get('AF','')
        if not p1 or not p2: continue
        seen.add(mid)

        ts = int(b.get('AD',0)) * 1000
        st = int(b.get('AB',0))
        is_live = 0 < st < 3

        # Sety z hlavniho feedu (BA=s1p1, BB=s1p2 atd.)
        sets1, sets2 = [], []
        for k1,k2 in [('BA','BB'),('BC','BD'),('BE','BF'),('BG','BH'),('BI','BJ')]:
            v1,v2 = b.get(k1,''), b.get(k2,'')
            if v1!='' or v2!='':
                sets1.append(v1 or '0'); sets2.append(v2 or '0')
            else: break

        # Game score ze live feedu
        game1, game2, serving = '', '', 0
        if is_live and mid in live_scores:
            ls = live_scores[mid]
            # Pouzij live sety pokud jsou lepsi
            if ls['sets1']: sets1 = ls['sets1']
            if ls['sets2']: sets2 = ls['sets2']
            game1 = ls['game1']
            game2 = ls['game2']
            serving = ls['serving']
        elif is_live:
            # Zapas v 1. setu bez skore - zobraz 0:0
            if not sets1:
                cur_set = int(b.get('CR',1))
                # Pridej prazdne sety pro sety co uz prob. skoncily
                # CR je cislo aktualniho setu
                for _ in range(cur_set - 1):
                    sets1.append('?'); sets2.append('?')
                # Aktualni set
                sets1.append('0'); sets2.append('0')
                game1 = '0'; game2 = '0'

        ag = b.get('AG','')
        winner = 1 if ag=='0' else 2 if ag=='1' else 0

        matches.append({
            'id': mid, 'tournament': tournament,
            'tournament_country': t_country, 'tournament_surface': t_surface,
            'ts': ts, 'p1': p1, 'p2': p2, 'status': st,
            'sets1': sets1, 'sets2': sets2,
            'game1': game1, 'game2': game2,
            'serving': serving, 'winner': winner,
            'url': f'https://www.flashscore.com/match/{mid}/#/match-summary'
        })
    return matches

live_scores = get_live_scores()
all_matches = {}
for day in [-1, 0, 1]:
    try:
        r = requests.get(f'https://2.flashscore.ninja/2/x/feed/f_2_{day}_1_en_1', headers=HEADERS, timeout=15)
        r.encoding = 'utf-8'
        matches = parse_day(r.text, live_scores)
        all_matches[str(day)] = matches
        live = [m for m in matches if 0 < m['status'] < 3]
        fin = [m for m in matches if m['status'] == 3]
        print(f'Day {day}: {len(matches)} total, {len(live)} live, {len(fin)} fin')
        if live: m=live[0]; print(f'  Live: {m["p1"]} {m["sets1"]}:{m["game1"]} vs {m["p2"]} {m["sets2"]}:{m["game2"]}')
        if fin: m=fin[0]; print(f'  Fin: {m["p1"]} {m["sets1"]} vs {m["p2"]} {m["sets2"]} w={m["winner"]}')
    except Exception as e:
        import traceback; traceback.print_exc()
        all_matches[str(day)] = []

result = {'updated': datetime.utcnow().isoformat()+'Z', 'days': all_matches}
with open('matches.json','w',encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False)
print('Done.')
