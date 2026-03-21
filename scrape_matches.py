import requests, json
from datetime import datetime

HEADERS = {'x-fsign': 'SW9D1eZo', 'User-Agent': 'Mozilla/5.0'}

SEP_RECORD = '~'
SEP_FIELD = '\u00ac'   # ¬
SEP_VALUE = '\u00f7'   # ÷

def parse_block(b):
    o = {}
    for f in b.split(SEP_FIELD):
        i = f.find(SEP_VALUE)
        if i > 0:
            o[f[:i]] = f[i+1:]
    return o

def parse(txt):
    blocks = [parse_block(b) for b in txt.split(SEP_RECORD)]
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
                sets1 = [b.get(k, '') for k in ['DE','DF','DG','DH','DI']]
                sets2 = [b2.get(k, '') for k in ['DE','DF','DG','DH','DI']]
                sets1 = [x for x in sets1 if x != '']
                sets2 = [x for x in sets2 if x != '']
                matches.append({
                    'id': b['AA'],
                    'tournament': tournament,
                    'ts': ts,
                    'p1': b['CX'],
                    'p2': b2['CX'],
                    'status': st,
                    'sets1': sets1,
                    'sets2': sets2,
                    'game1': b.get('DA', ''),
                    'game2': b2.get('DA', ''),
                    'serving': 1 if b.get('IB') == '1' else 2 if b2.get('IB') == '1' else 0,
                    'winner': 1 if b.get('BX') == '1' else 2 if b2.get('BX') == '1' else 0,
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
        if matches:
            m = matches[0]
            print(f'Day {day}: {len(matches)} matches | sample: {m["p1"]} {m["sets1"]} vs {m["p2"]} {m["sets2"]} game={m["game1"]}:{m["game2"]}')
    except Exception as e:
        print(f'Day {day} error: {e}')
        all_matches[str(day)] = []

result = {
    'updated': datetime.utcnow().isoformat() + 'Z',
    'days': all_matches
}
with open('matches.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False)
print('Done.')
