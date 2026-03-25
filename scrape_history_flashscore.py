"""
Backfill 2025/2026 match history from Flashscore proxy.
Proxy supports historical days via ?day=-N parameter.
Response for day != -1/0/1 returns {"day":N, "matches":[...]} directly.
"""
import requests, json, os, re, time
from datetime import date, datetime, timedelta

PROXY = 'https://tennis-proxy.vavra-radovan.workers.dev/'
OUT_DIR = 'player_history'
os.makedirs(OUT_DIR, exist_ok=True)

# Load player name → id mapping from atp_players.json
print('Loading atp_players.json...')
with open('atp_players.json') as f:
    atp_data = json.load(f)

name_to_id = {}
lastname_to_players = {}
for p in atp_data.get('items', []):
    pid  = p.get('id', '')
    name = p.get('name', '')       # "C. Alcaraz"
    full = p.get('full_name', '')  # "Carlos Alcaraz"
    if not pid: continue
    # Flashscore format: "Alcaraz C." — reverse of ATP "C. Alcaraz"
    parts = name.split()
    if len(parts) >= 2:
        fs = ' '.join(parts[1:]) + ' ' + parts[0]
        name_to_id[fs.lower()] = pid
    name_to_id[name.lower()] = pid
    if full: name_to_id[full.lower()] = pid
    last = parts[-1].lower() if parts else ''
    if last not in lastname_to_players:
        lastname_to_players[last] = []
    lastname_to_players[last].append({'id': pid, 'name': name})

def find_pid(name_raw):
    if not name_raw: return None
    nl = name_raw.strip().lower()
    if nl in name_to_id: return name_to_id[nl]
    parts = nl.split()
    last = parts[0] if parts else ''
    initial = parts[1][0] if len(parts) > 1 and parts[1] else ''
    candidates = lastname_to_players.get(last, [])
    if len(candidates) == 1: return candidates[0]['id']
    for c in candidates:
        cparts = c['name'].split()
        if cparts and cparts[-1][:1].lower() == last[:1]:
            if initial and cparts[0][:1].lower() == initial:
                return c['id']
    return None

# Load existing player history
def load_history(pid):
    fname = f'{OUT_DIR}/{pid}.json'
    if os.path.exists(fname):
        try:
            with open(fname) as f: return json.load(f)
        except Exception: pass
    return {}

def save_history(pid, hist):
    with open(f'{OUT_DIR}/{pid}.json', 'w') as f:
        json.dump(hist, f, separators=(',', ':'))

# Fetch one day from proxy
def fetch_day(day_offset):
    try:
        r = requests.get(PROXY, params={'day': day_offset, 't': int(time.time()*1000)}, timeout=15)
        if r.status_code != 200: return []
        data = r.json()
        # Response is either {"day":N,"matches":[...]} or {"days":{...}}
        if 'matches' in data:
            return data['matches']
        elif 'days' in data:
            all_m = []
            for v in data['days'].values():
                all_m.extend(v)
            return all_m
        return []
    except Exception as e:
        print(f'  fetch_day({day_offset}) error: {e}')
        return []

# Process matches into player history entries
def process_matches(matches, pid_cache, history_cache):
    today = date.today().isoformat()
    added_total = 0
    for m in matches:
        if m.get('status') != 3: continue  # only finished
        p1, p2 = m.get('p1',''), m.get('p2','')
        winner = m.get('winner', 0)
        sets1, sets2 = m.get('sets1',[]), m.get('sets2',[])
        ts = m.get('ts', 0)
        match_id = m.get('id', '')
        tournament = m.get('tournament','')
        surface = m.get('tournament_surface','').capitalize()
        try:
            match_date = datetime.utcfromtimestamp(ts/1000).strftime('%Y%m%d') if ts else today.replace('-','')
        except Exception:
            match_date = today.replace('-','')
        s1_won = sum(1 for a,b in zip(sets1,sets2) if str(a)>str(b))
        s2_won = sum(1 for a,b in zip(sets1,sets2) if str(b)>str(a))

        for is_p1, pname, opp, won, ms, os_ in [
            (True,  p1, p2, winner==1, s1_won, s2_won),
            (False, p2, p1, winner==2, s2_won, s1_won),
        ]:
            if pname not in pid_cache:
                pid_cache[pname] = find_pid(pname)
            pid = pid_cache[pname]
            if not pid: continue

            if pid not in history_cache:
                history_cache[pid] = load_history(pid)
            hist = history_cache[pid]
            existing = hist.get('matches', [])
            existing_ids = {em.get('id','') for em in existing if em.get('id')}
            if match_id and match_id in existing_ids: continue

            existing.append({
                'id': match_id, 'date': match_date,
                'tournament': tournament, 'surface': surface,
                'level': 'A', 'round': m.get('round',''),
                'result': 'W' if won else 'L',
                'opponent': opp, 'score': f'{ms}-{os_}',
                'best_of': '3', 'rank': '', 'opp_rank': '', 'src': 'live',
            })
            hist['matches'] = existing
            added_total += 1
    return added_total

# ── Main: iterate over last 365 days ──────────────────────────────
START_DAY = -365
END_DAY   = -2  # stop at -2, current pipeline handles -1, 0, +1

pid_cache = {}
history_cache = {}
total_matches = 0
total_days = 0

print(f'Fetching Flashscore history from day {START_DAY} to {END_DAY}...')
for day in range(START_DAY, END_DAY + 1):
    matches = fetch_day(day)
    if not matches:
        continue
    added = process_matches(matches, pid_cache, history_cache)
    if added > 0:
        total_matches += added
        total_days += 1
        if total_days % 10 == 0:
            print(f'  Day {day}: {added} entries, cumulative: {total_matches}')
    time.sleep(0.05)  # gentle rate limiting

# Save all updated histories
today_str = date.today().isoformat()
saved = 0
for pid, hist in history_cache.items():
    matches = hist.get('matches', [])
    if not matches: continue
    matches.sort(key=lambda x: x.get('date',''), reverse=True)
    hist['matches'] = matches
    hist['total']   = len(matches)
    hist['updated'] = today_str
    save_history(pid, hist)
    saved += 1

print(f'Done: {saved} players updated, {total_matches} entries added across {total_days} days')
print(f'Date: {today_str}')
