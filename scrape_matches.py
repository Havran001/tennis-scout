import requests, json, re
from datetime import datetime

HEADERS={'x-fsign':'SW9D1eZo','User-Agent':'Mozilla/5.0'}

def parse(txt):
    def pb(b):
        o={}
        for f in b.split('\u00ac'):
            i=f.find('\u00f7')
            if i>0:o[f[:i]]=f[i+1:]
        return o
    blocks=[pb(b) for b in txt.split('~')]
    tournament=''
    matches=[]
    i=0
    while i<len(blocks):
        b=blocks[i]
        if 'ZA' in b:
            tournament=b['ZA']
            i+=1
            continue
        if 'AA' in b and 'CX' in b and i+1<len(blocks):
            b2=blocks[i+1]
            if 'CX' in b2 and 'ZA' not in b2:
                ts=int(b.get('AD',0))*1000
                st=int(b.get('AB',0))
                sets1=[b.get('DE',''),b.get('DF',''),b.get('DG',''),b.get('DH',''),b.get('DI','')]
                sets2=[b2.get('DE',''),b2.get('DF',''),b2.get('DG',''),b2.get('DH',''),b2.get('DI','')]
                matches.append({
                    'id':b['AA'],'tournament':tournament,'ts':ts,
                    'p1':b['CX'],'p2':b2['CX'],
                    'status':st,
                    'sets1':[x for x in sets1 if x],
                    'sets2':[x for x in sets2 if x],
                    'game1':b.get('DA',''),'game2':b2.get('DA',''),
                    'serving':1 if b.get('IB')=='1' else 2 if b2.get('IB')=='1' else 0,
                    'winner':1 if b.get('BX')=='1' else 2 if b2.get('BX')=='1' else 0,
                    'url':'https://www.flashscore.com/match/'+b['AA']+'/#/match-summary'
                })
                i+=2
                continue
        i+=1
    return matches

all_matches={}
for day in [-1,0,1]:
    try:
        r=requests.get(
            f'https://2.flashscore.ninja/2/x/feed/f_2_{day}_1_en_1',
            headers=HEADERS,timeout=15
        )
        matches=parse(r.text)
        all_matches[str(day)]=matches
        print(f'Day {day}: {len(matches)} matches')
    except Exception as e:
        print(f'Day {day} error: {e}')
        all_matches[str(day)]=[]

result={
    'updated':datetime.utcnow().isoformat()+'Z',
    'days':all_matches
}
with open('matches.json','w',encoding='utf-8') as f:
    json.dump(result,f,ensure_ascii=False)
print('Saved matches.json')
