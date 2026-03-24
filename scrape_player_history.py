import requests, json, csv, io, os
from datetime import date, datetime

SACK_BASE = 'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/'
OUT_DIR = 'player_history'

# ── STEP 1: Load active players from atp_players.json ─────────────
print('Loading active players...')
with open('atp_players.json') as f:
    data = json.load(f)
active = data['items']
print(f'  Active players: {len(active)}')

# Build lookup: sackmann_id -> player info
# We need to match atp_players.json (which has sackmann id via name matching)
# Load sackmann player list for name->id mapping
print('Loading Sackmann player list...')
r = requests.get(SACK_BASE + 'atp_players.csv', timeout=30)
sack_name_to_id = {}
sack_id_to_name = {}
reader = csv.reader(io.StringIO(r.text))
next(reader, None)
for row in reader:
    if len(row) < 3: continue
    pid, first, last = row[0].strip(), row[1].strip(), row[2].strip()
    full = (first + ' ' + last).strip().lower()
    sack_name_to_id[full] = pid
    sack_id_to_name[pid] = (first + ' ' + last).strip()
print(f'  Sackmann players: {len(sack_name_to_id)}')

# Match active ATP players to Sackmann IDs
active_sack_ids = {}
unmatched = []
for p in active:
    full_lower = (p.get('full_name') or p['name']).lower()
    sid = sack_name_to_id.get(full_lower)
    if sid:
        active_sack_ids[sid] = p
    else:
        unmatched.append(p['name'])

print(f'  Matched: {len(active_sack_ids)}/{len(active)}')
if unmatched[:5]:
    print(f'  Unmatched examples: {unmatched[:5]}')

# ── STEP 2: Load all Sackmann match CSVs ──────────────────────────
print('Loading Sackmann match files...')
current_year = date.today().year
years = list(range(1968, current_year + 1))

# Collect all matches for active players
player_matches = {sid: [] for sid in active_sack_ids}

for year in years:
    fname = f'atp_matches_{year}.csv'
    try:
        r = requests.get(SACK_BASE + fname, timeout=30)
        if r.status_code != 200:
            continue
        lines = r.text.strip().split('\n')
        if len(lines) < 2:
            continue
        header = lines[0].split(',')
        # Key column indices
        try:
            wi = header.index('winner_id')
            li = header.index('loser_id')
            wn = header.index('winner_name')
            ln = header.index('loser_name')
            tn = header.index('tourney_name')
            td = header.index('tourney_date')
            sf = header.index('surface')
            rd = header.index('round')
            sc = header.index('score')
            bo = header.index('best_of')
            mn = header.index('minutes') if 'minutes' in header else -1
            wr = header.index('winner_rank') if 'winner_rank' in header else -1
            lr = header.index('loser_rank') if 'loser_rank' in header else -1
            tl = header.index('tourney_level') if 'tourney_level' in header else -1
        except ValueError:
            continue

        matched_year = 0
        for line in lines[1:]:
            if not line.strip(): continue
            row = line.split(',')
            if len(row) <= max(wi, li, wn, ln, tn, td, sf, rd, sc): continue
            wid = row[wi].strip()
            lid = row[li].strip()

            match_data = None
            if wid in player_matches:
                match_data = {
                    'date': row[td].strip(),
                    'tournament': row[tn].strip(),
                    'surface': row[sf].strip(),
                    'level': row[tl].strip() if tl >= 0 and tl < len(row) else '',
                    'round': row[rd].strip(),
                    'result': 'W',
                    'opponent': row[ln].strip(),
                    'opponent_id': lid,
                    'score': row[sc].strip(),
                    'best_of': row[bo].strip() if bo < len(row) else '',
                    'minutes': row[mn].strip() if mn >= 0 and mn < len(row) else '',
                    'rank': row[wr].strip() if wr >= 0 and wr < len(row) else '',
                    'opp_rank': row[lr].strip() if lr >= 0 and lr < len(row) else '',
                }
                player_matches[wid].append(match_data)
                matched_year += 1
            if lid in player_matches:
                match_data = {
                    'date': row[td].strip(),
                    'tournament': row[tn].strip(),
                    'surface': row[sf].strip(),
                    'level': row[tl].strip() if tl >= 0 and tl < len(row) else '',
                    'round': row[rd].strip(),
                    'result': 'L',
                    'opponent': row[wn].strip(),
                    'opponent_id': wid,
                    'score': row[sc].strip(),
                    'best_of': row[bo].strip() if bo < len(row) else '',
                    'minutes': row[mn].strip() if mn >= 0 and mn < len(row) else '',
                    'rank': row[lr].strip() if lr >= 0 and lr < len(row) else '',
                    'opp_rank': row[wr].strip() if wr >= 0 and wr < len(row) else '',
                }
                player_matches[lid].append(match_data)
                matched_year += 1

        print(f'  {year}: {matched_year} matches for active players')
    except Exception as e:
        print(f'  {year}: error - {e}')

# ── STEP 3: Save per-player JSON files ────────────────────────────
print(f'Saving player history files...')
os.makedirs(OUT_DIR, exist_ok=True)
saved = 0
today = str(date.today())

for sid, player in active_sack_ids.items():
    matches = player_matches.get(sid, [])
    # Sort by date descending (newest first)
    matches.sort(key=lambda m: m['date'], reverse=True)
    out = {
        'player_id': player.get('id', ''),
        'sack_id': sid,
        'name': player.get('full_name') or player['name'],
        'updated': today,
        'total': len(matches),
        'matches': matches
    }
    fname = f'{OUT_DIR}/{sid}.json'
    with open(fname, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    saved += 1
    if saved % 100 == 0:
        print(f'  Saved {saved}/{len(active_sack_ids)}...')

print(f'Done: {saved} player history files saved to {OUT_DIR}/')
print(f'Updated: {today}')
