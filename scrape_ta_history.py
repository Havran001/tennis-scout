"""
Scrape match history + statistics from Tennis Abstract for all active ATP players.
Uses parallel threads for faster scraping.
Skips players that already have TA stats AND were updated within last 6 days.
Always updates players that don't have TA stats yet.
"""
import requests, json, os, time, re, ast
from datetime import date
from concurrent.futures import ThreadPoolExecutor, as_completed

OUT_DIR = 'player_history'
os.makedirs(OUT_DIR, exist_ok=True)

WORKERS = 10
SKIP_DAYS = 6  # přeskoč pouze pokud má TA data A je aktuální

PROXY_URLS = [
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?url=',
]

def pct(a, b):
    return f'{a/b*100:.1f}' if b > 0 else ''

def norm_name(fn):
    return ''.join(c for c in (fn or '') if c.isalpha())

def fetch_ta(full_name, proxy_idx=0):
    slug = norm_name(full_name)
    url = f'https://www.tennisabstract.com/cgi-bin/player-classic.cgi?p={slug}&f=ACareerqq'
    for i in range(len(PROXY_URLS)):
        proxy = PROXY_URLS[(proxy_idx + i) % len(PROXY_URLS)]
        try:
            r = requests.get(proxy + requests.utils.quote(url), timeout=20)
            if r.ok and 'Tennis Abstract' in r.text and 'Player Search' not in r.text:
                return r.text
        except Exception:
            pass
    return None

def parse_ta_html(html):
    try:
        ms = html.find('var matchmx = [[')
        if ms < 0: return None
        af = html[ms+14:]
        em = re.search(r'\n\s+\];\n', af)
        if not em: return None
        raw = af[:af.index(em.group(0))+len(em.group(0))].strip()
        mx = ast.literal_eval(raw.replace('matchmx = ',''))
        if not mx or len(mx) < 3: return None
        return mx
    except Exception:
        return None

def mx_to_match(mx):
    try:
        dt = str(mx[0] or '')
        ds = dt[:4]+'-'+dt[4:6]+'-'+dt[6:8] if len(dt)==8 else dt
        pts    = int(mx[23] or 0)
        firsts = int(mx[24] or 0)
        fwon   = int(mx[25] or 0)
        swon   = int(mx[26] or 0)
        aces   = int(mx[21] or 0)
        dfs    = int(mx[22] or 0)
        saved  = int(mx[28] or 0)
        chances= int(mx[29] or 0)
        oaces  = int(mx[30] or 0)
        opts   = int(mx[32] or 0)
        seconds = pts - firsts
        dr = ''
        try:
            if pts > 0 and opts > 0:
                rpw = 1 - ((int(mx[34] or 0)+int(mx[35] or 0)) / opts)
                spl = 1 - ((fwon + swon) / pts)
                if spl > 0: dr = f'{rpw/spl:.2f}'
        except Exception: pass
        return {
            'date':       ds,
            'tournament': str(mx[1] or ''),
            'surface':    str(mx[2] or ''),
            'level':      'ta-import',
            'round':      str(mx[8] or ''),
            'result':     'W' if mx[4]=='W' else ('L' if mx[4]=='L' else ''),
            'opponent':   str(mx[11] or ''),
            'score':      str(mx[9] or ''),
            'best_of':    '',
            'rank':       str(mx[5] or ''),
            'opp_rank':   str(mx[12] or ''),
            'dr':         dr,
            'a_pct':      pct(aces, pts),
            'va_pct':     pct(oaces, opts),
            'df_pct':     pct(dfs, pts),
            'first_in':   pct(firsts, pts),
            'first_pct':  pct(fwon, firsts),
            'second_pct': pct(swon, seconds),
            'bp_saved':   f'{saved}/{chances}' if chances > 0 else '',
            'match_time': (lambda n: f'{n//60}:{n%60:02d}' if n else '')(int(mx[20] or 0)),
            'odds':       '',
        }
    except Exception:
        return None

def has_ta_stats(existing):
    """Zkontroluj jestli soubor má TA statistiky."""
    if existing.get('source') == 'tennisabstract':
        return True
    # Zkontroluj jestli zápasy mají DR nebo A%
    for m in (existing.get('matches') or [])[:5]:
        if m.get('dr') or m.get('a_pct'):
            return True
    return False

def process_player(args):
    idx, p, today = args
    pid  = p.get('id', '')
    full = p.get('full_name') or p.get('name', '')
    if not pid or not full:
        return pid, 'skip', 0

    fname = f'{OUT_DIR}/{pid}.json'

    # Přeskoč pouze pokud má TA data A je aktuální
    if os.path.exists(fname):
        try:
            with open(fname) as f:
                existing = json.load(f)
            if has_ta_stats(existing):
                upd = existing.get('updated', '')
                if upd:
                    days_old = (date.today() - date.fromisoformat(upd[:10])).days
                    if days_old < SKIP_DAYS:
                        return pid, 'skip', 0
        except Exception:
            pass

    # Fetch z Tennis Abstract
    proxy_idx = idx % len(PROXY_URLS)
    html = fetch_ta(full, proxy_idx)
    if not html:
        return pid, 'fail', 0

    mx = parse_ta_html(html)
    if not mx or len(mx) < 3:
        return pid, 'fail', 0

    matches = [mx_to_match(row) for row in mx]
    matches = [m for m in matches if m]
    matches.sort(key=lambda m: m['date'], reverse=True)

    out = {
        'player_id': pid,
        'name':      full,
        'source':    'tennisabstract',
        'updated':   today,
        'total':     len(matches),
        'matches':   matches,
    }
    with open(fname, 'w') as f:
        json.dump(out, f, separators=(',', ':'))

    return pid, 'ok', len(matches)

# ── Main ───────────────────────────────────────────────────────────
print('Loading atp_players.json...')
with open('atp_players.json') as f:
    data = json.load(f)
players = data.get('items', [])
print(f'  Total players: {len(players)}')

today = date.today().isoformat()
updated = 0
skipped = 0
failed  = 0

args_list = [(i, p, today) for i, p in enumerate(players)]

print(f'Starting parallel scrape with {WORKERS} workers...')
start = time.time()

with ThreadPoolExecutor(max_workers=WORKERS) as ex:
    futures = {ex.submit(process_player, args): args for args in args_list}
    for future in as_completed(futures):
        pid, status, n = future.result()
        if status == 'ok':
            updated += 1
        elif status == 'skip':
            skipped += 1
        else:
            failed += 1
        total = updated + skipped + failed
        if total % 100 == 0:
            elapsed = time.time() - start
            print(f'  [{total}/{len(players)}] Updated:{updated} Skipped:{skipped} Failed:{failed} ({elapsed:.0f}s)')

elapsed = time.time() - start
print(f'\nDone in {elapsed:.0f}s: {updated} updated, {skipped} skipped, {failed} failed')
print(f'Date: {today}')
