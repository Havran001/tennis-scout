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

def extract_sets(b1, b2):
    # Sety jsou v BA,BC,BE,BG,BI (hrac1) a BB,BD,BF,BH,BJ (hrac2)
    sets1, sets2 = [], []
    pairs = [('BA','BB'),('BC','BD'),('BE','BF'),('BG','BH'),('BI','BJ')]
    for k1,k2 in pairs:
        v1 = b1.get(k1,'')
        v2 = b2.get(k2,'')
        # Pouzij data z b1 pro oba hrace (oba bloky maji cela data)
        if not v2:
            v2 = b1.get(k2,'')
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
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if 'ZA' in b:
            tournament = b['ZA']
            i += 1
            continue
        if 'AA' in b and 'CX' in b and i + 1 < len(blocks):
            b2 = blocks[i + 1]
            if 'CX' in b2 and 'ZA' not in b2:
                ts = int(b.get('AD', 0)) * 1000
                st = int(b.get('AB', 0))
                sets1, sets2 = extract_sets(b, b2)
                # Game score pro live
                game1 = b.get('DA', '')
                game2 = b2.get('DA', '')
                # Vítěz: AG=0 znamená p1 vyhrál, AG=1 p2 vyhrál
                ag = b.get('AG', '')
                winner = 1 if ag == '0' else 2 if ag == '1' else 0
                # Servis
                serving = 1 if b.get('IB') == '1' else 2 if b2.get('IB') == '1' else 0
                # Aktualni gem score pro live (CR=cislo setu)
                cur_set = int(b.get('CR', 0))
                
                matches.append({
                    'id': b['AA'],
                    'tournament': tournament,
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
            print(f'  Finished: {m["p1"]} {m["sets1"]} vs {m["p2"]} {m["sets2"]} winner={m["winner"]}')
        if live:
            m = live[0]
            print(f'  Live: {m["p1"]} {m["sets1"]}:{m["game1"]} vs {m["p2"]} {m["sets2"]}:{m["game2"]}')
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
