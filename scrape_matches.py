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

def get_dc(mid):
    """dc_1_{mid} - real-time score: DL=set#, DN=p1games, DO=p2games, DP=game_p1, DQ=game_p2, DR=serving"""
    try:
        r = requests.get(f'https://2.flashscore.ninja/2/x/feed/dc_1_{mid}', headers=HEADERS, timeout=8)
        r.encoding = 'utf-8'
        o = pb(r.text.split(SEP_RECORD)[0])
        return {
            'set_num': int(o.get('DL', 1)),
            'cur_p1': o.get('DN', '0'),
            'cur_p2': o.get('DO', '0'),
            'game1': o.get('DP', '0'),
            'game2': o.get('DQ', '0'),
            'serving': int(o.get('DR', 0))
        }
    except:
        return None

def parse_tournament(za):
    country = ''
    m = re.search(r'\(([A-Z]{2,3})\)', za)
    if m: country = m.group(1)
    surface = za.split(',')[-1].strip() if ',' in za else ''
    return country, surface

def parse_day(txt):
    blocks = [pb(b) for b in txt.split(SEP_RECORD)]
    tournament, t_country, t_surface = '', '', ''
    matches = []
    seen = set()
    for b in blocks:
        if 'ZA' in b:
            tournament = b['ZA']
            t_country, t_surface = parse_tournament(tournament)
            continue
        if 'AA' not in b or 'AE' not in b or 'AF' not in b: continue
        mid = b['AA']
        if mid in seen: continue
        seen.add(mid)
        p1, p2 = b.get('AE',''), b.get('AF','')
        if not p1 or not p2: continue
        ab = int(b.get('AB', 0))
        is_live = ab == 2
        # Dokoncene sety z feedu (BA=s1p1, BB=s1p2, BC=s2p1, BD=s2p2...)
        sets1, sets2 = [], []
        for k1,k2 in [('BA','BB'),('BC','BD'),('BE','BF'),('BG','BH'),('BI','BJ')]:
            v1,v2 = b.get(k1,''), b.get(k2,'')
            if v1!='' or v2!='':
                sets1.append(v1 or '0'); sets2.append(v2 or '0')
            else: break
        game1, game2, serving = '', '', 0
        if is_live:
            if not sets1: sets1=['0']; sets2=['0']
        ag = b.get('AG','')
        winner = 1 if ag=='0' else 2 if ag=='1' else 0
        matches.append({
            'id': mid, 'tournament': tournament,
            'tournament_country': t_country, 'tournament_surface': t_surface,
            'ts': int(b.get('AD',0))*1000, 'p1': p1, 'p2': p2, 'status': ab,
            'sets1': sets1, 'sets2': sets2,
            'game1': game1, 'game2': game2, 'serving': serving,
            'winner': winner,
            'url': 'https://www.flashscore.com/match/'+mid+'/#/match-summary'
        })
    return matches

all_matches = {}
for day in [-1, 0, 1]:
    try:
        r = requests.get(f'https://2.flashscore.ninja/2/x/feed/f_2_{day}_1_en_1', headers=HEADERS, timeout=15)
        r.encoding = 'utf-8'
        matches = parse_day(r.text)
        # Pro live zapasy zavolej dc_1_ pro aktualni score
        live = [m for m in matches if m['status'] == 2]
        print(f'Day {day}: {len(matches)} total, {len(live)} live')
        for m in live:
            dc = get_dc(m['id'])
            if dc:
                sn = dc['set_num']
                # Vezmi dokoncene sety (prvnich sn-1) z feedu a pridej aktualni set
                fin1 = m['sets1'][:sn-1]
                fin2 = m['sets2'][:sn-1]
                fin1.append(dc['cur_p1'])
                fin2.append(dc['cur_p2'])
                m['sets1'] = fin1
                m['sets2'] = fin2
                m['game1'] = dc['game1']
                m['game2'] = dc['game2']
                m['serving'] = dc['serving']
                if m['p1'].startswith('Gea'):
                    print(f'  GEA: sets={m["sets1"]} vs {m["sets2"]} game={m["game1"]}:{m["game2"]} srv={m["serving"]}')
        all_matches[str(day)] = matches
    except Exception as e:
        import traceback; traceback.print_exc()
        all_matches[str(day)] = []

result = {'updated': datetime.utcnow().isoformat()+'Z', 'days': all_matches}
with open('matches.json','w',encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False)
print('Done.')
