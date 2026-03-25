import json, os
from datetime import date, datetime

OUT_DIR = 'player_history'
os.makedirs(OUT_DIR, exist_ok=True)

# Status codes from Flashscore proxy
# 1 = scheduled, 2 = live, 3 = finished

print('Loading matches.json...')
with open('matches.json') as f:
    data = json.load(f)

print('Loading atp_players.json...')
with open('atp_players.json') as f:
    atp_data = json.load(f)

# Build name→player lookup
# ATP format: "C. Alcaraz" → Flashscore format: "Alcaraz C."
name_to_player = {}
lastname_to_players = {}
for p in atp_data.get('items', []):
    pid = p.get('id', '')
    short = p.get('name', '')    # "C. Alcaraz"
    full  = p.get('full_name', '')
    if not pid: continue

    # Convert "C. Alcaraz" → "Alcaraz C."
    parts = short.split()
    if len(parts) >= 2:
        fs_name = ' '.join(parts[1:]) + ' ' + parts[0]
        name_to_player[fs_name.lower()] = p
    name_to_player[short.lower()] = p
    if full:
        name_to_player[full.lower()] = p

    # Last name index for fuzzy match
    last = parts[-1].lower() if parts else ''
    if last not in lastname_to_players:
        lastname_to_players[last] = []
    lastname_to_players[last].append(p)

print(f'  Players indexed: {len(name_to_player)}')

def find_player(name_raw):
    if not name_raw: return None
    nl = name_raw.strip().lower()
    if nl in name_to_player:
        return name_to_player[nl]
    # Flashscore: "Alcaraz C." → last=alcaraz, initial=c
    parts = nl.split()
    last = parts[0] if parts else ''
    initial = parts[1][0] if len(parts) > 1 and parts[1] else ''
    candidates = lastname_to_players.get(last, [])
    if len(candidates) == 1:
        return candidates[0]
    for c in candidates:
        cname = (c.get('name','') or '').split()
        if cname and cname[-1][:1].lower() == last[:1]:
            # check initial matches first part of ATP name
            if initial and cname[0][:1].lower() == initial:
                return c
    return candidates[0] if len(candidates) == 1 else None

today = date.today().isoformat()
updated_players = {}

all_days = data.get('days', {})
total_finished = 0
for day_key, matches in all_days.items():
    for m in matches:
        # Only finished matches (status=3)
        if m.get('status') != 3:
            continue
        total_finished += 1

        p1_name = m.get('p1', '')
        p2_name = m.get('p2', '')
        winner  = m.get('winner', 0)  # 1=p1 won, 2=p2 won
        sets1   = m.get('sets1', [])
        sets2   = m.get('sets2', [])
        match_id = m.get('id', '')
        ts = m.get('ts', 0)

        # Calculate sets won
        s1_won = sum(1 for a,b in zip(sets1,sets2) if str(a)>str(b))
        s2_won = sum(1 for a,b in zip(sets1,sets2) if str(b)>str(a))

        # Date from timestamp (ms)
        try:
            match_date = datetime.utcfromtimestamp(ts/1000).strftime('%Y%m%d') if ts else today.replace('-','')
        except Exception:
            match_date = today.replace('-','')

        tournament = m.get('tournament','')
        surface = m.get('tournament_surface','')

        for is_p1, pname, opp_name, won, my_sets, opp_sets in [
            (True,  p1_name, p2_name, winner==1, s1_won, s2_won),
            (False, p2_name, p1_name, winner==2, s2_won, s1_won),
        ]:
            player = find_player(pname)
            if not player: continue
            pid = player.get('id','')
            if not pid: continue

            score = f'{my_sets}-{opp_sets}'
            entry = {
                'id':         match_id,
                'date':       match_date,
                'tournament': tournament,
                'surface':    surface.capitalize() if surface else '',
                'level':      'A',  # ATP tour
                'round':      m.get('round',''),
                'result':     'W' if won else 'L',
                'opponent':   opp_name,
                'score':      score,
                'best_of':    '3',
                'rank':       '',
                'opp_rank':   '',
                'src':        'live',
            }
            if pid not in updated_players:
                updated_players[pid] = []
            updated_players[pid].append(entry)

print(f'Finished matches in matches.json: {total_finished}')
print(f'New match entries for {len(updated_players)} players')

saved = 0
for pid, new_matches in updated_players.items():
    fname = f'{OUT_DIR}/{pid}.json'
    existing = {}
    if os.path.exists(fname):
        try:
            with open(fname) as f:
                existing = json.load(f)
        except Exception:
            existing = {}
    existing_matches = existing.get('matches', [])
    existing_ids = {m.get('id','') for m in existing_matches if m.get('id')}
    added = 0
    for nm in new_matches:
        if nm.get('id') and nm['id'] in existing_ids:
            continue
        existing_matches.append(nm)
        added += 1
    if added == 0:
        continue
    existing_matches.sort(key=lambda x: x.get('date',''), reverse=True)
    existing['matches'] = existing_matches
    existing['total']   = len(existing_matches)
    existing['updated'] = today
    with open(fname,'w') as f:
        json.dump(existing, f, separators=(',',':'))
    saved += 1
    print(f'  {pid}: +{added} matches (total {len(existing_matches)})')

print(f'Done: updated {saved} player history files')
print(f'Date: {today}')
