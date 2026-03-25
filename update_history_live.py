import json, os, re
from datetime import date, datetime

OUT_DIR = 'player_history'
os.makedirs(OUT_DIR, exist_ok=True)

# ── Load matches.json ──────────────────────────────────────────────
print('Loading matches.json...')
with open('matches.json') as f:
    data = json.load(f)

# ── Load atp_players.json for name→id mapping ──────────────────────
print('Loading atp_players.json...')
with open('atp_players.json') as f:
    atp_data = json.load(f)

# Build lookup: short name (e.g. "Alcaraz C.") → {id, full_name}
# and last name → list of players (fuzzy fallback)
name_to_player = {}
lastname_to_players = {}
for p in atp_data.get('items', []):
    pid = p.get('id', '')
    short = p.get('name', '')        # e.g. "C. Alcaraz"
    full  = p.get('full_name', '')   # e.g. "Carlos Alcaraz"
    if not pid: continue

    # Flashscore format is "Alcaraz C." — reverse of ATP "C. Alcaraz"
    # Convert "C. Alcaraz" → "Alcaraz C."
    parts = short.split()
    if len(parts) >= 2:
        fs_name = ' '.join(parts[1:]) + ' ' + parts[0]  # "Alcaraz C."
        name_to_player[fs_name.lower()] = p
        name_to_player[short.lower()] = p

    # Also index by last name for fuzzy matching
    last = parts[-1].lower() if parts else ''
    if last not in lastname_to_players:
        lastname_to_players[last] = []
    lastname_to_players[last].append(p)

    # Full name lookup
    name_to_player[full.lower()] = p

print(f'  Players indexed: {len(name_to_player)}')

def find_player(name_raw):
    """Match Flashscore name (e.g. 'Zverev A.') to ATP player."""
    if not name_raw: return None
    nl = name_raw.strip().lower()

    # Direct lookup
    if nl in name_to_player:
        return name_to_player[nl]

    # Try last name + initial matching
    parts = nl.split()
    if not parts: return None
    last = parts[0]   # Flashscore: last name first
    initial = parts[1][0] if len(parts) > 1 else ''

    candidates = lastname_to_players.get(last, [])
    if len(candidates) == 1:
        return candidates[0]
    if initial and candidates:
        for c in candidates:
            if (c.get('name','') or '').split()[-1][:1].lower() == initial:
                return c
    return None

# ── Process completed matches ──────────────────────────────────────
today = date.today().isoformat()
updated_players = {}  # pid → list of new matches

all_days = data.get('days', {})
for day_key, matches in all_days.items():
    for m in matches:
        # Only process finished matches
        if m.get('status', '') not in ('ended', 'finished', 'Konec', 'completed'):
            continue

        p1_name = m.get('p1', '')
        p2_name = m.get('p2', '')
        sets1 = m.get('sets1', 0)
        sets2 = m.get('sets2', 0)
        tournament = m.get('tournament', '')
        url = m.get('url', '')
        match_id = m.get('id', '')

        # Determine winner
        p1_won = sets1 > sets2

        # Try to find both players
        for is_p1, pname, opp_name, won in [
            (True, p1_name, p2_name, p1_won),
            (False, p2_name, p1_name, not p1_won),
        ]:
            player = find_player(pname)
            if not player: continue
            pid = player.get('id', '')
            if not pid: continue

            score = f'{sets1}-{sets2}' if is_p1 else f'{sets2}-{sets1}'
            result = 'W' if won else 'L'

            # Date: use today as approximation (matches.json has no match date)
            match_entry = {
                'id': match_id,
                'date': today.replace('-', ''),  # YYYYMMDD
                'tournament': tournament,
                'surface': m.get('surface', ''),
                'level': m.get('level', ''),
                'round': m.get('round', ''),
                'result': result,
                'opponent': opp_name,
                'score': score,
                'best_of': '3',
                'rank': '',
                'opp_rank': '',
                'src': 'live',
            }

            if pid not in updated_players:
                updated_players[pid] = []
            updated_players[pid].append(match_entry)

print(f'New matches found for {len(updated_players)} players')

# ── Merge into existing player_history files ───────────────────────
saved = 0
for pid, new_matches in updated_players.items():
    fname = f'{OUT_DIR}/{pid}.json'

    # Load existing
    existing = {}
    if os.path.exists(fname):
        try:
            with open(fname) as f:
                existing = json.load(f)
        except Exception:
            existing = {}

    existing_matches = existing.get('matches', [])
    existing_ids = {m.get('id', '') for m in existing_matches if m.get('id')}

    # Only add matches not already in history
    added = 0
    for nm in new_matches:
        mid = nm.get('id', '')
        if mid and mid in existing_ids:
            continue  # already saved
        existing_matches.append(nm)
        added += 1

    if added == 0:
        continue  # nothing new

    # Sort newest first
    existing_matches.sort(key=lambda x: x.get('date', ''), reverse=True)

    existing['matches'] = existing_matches
    existing['total'] = len(existing_matches)
    existing['updated'] = today

    with open(fname, 'w') as f:
        json.dump(existing, f, separators=(',', ':'))
    saved += 1
    print(f'  Updated {pid}: +{added} matches (total {len(existing_matches)})')

print(f'Done: updated {saved} player history files')
print(f'Date: {today}')
