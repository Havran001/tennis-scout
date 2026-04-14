import json, os, glob

OUT_DIR = 'player_history'
files = glob.glob(f'{OUT_DIR}/*.json')
print(f'Found {len(files)} player history files')

cleaned = 0
total_removed = 0

for fpath in files:
    try:
        with open(fpath) as f:
            data = json.load(f)
        
        matches = data.get('matches', [])
        before = len(matches)
        
        def is_flashscore(m):
            if m.get('src') == 'live':
                return True
            d = str(m.get('date', ''))
            if len(d) == 8 and d.isdigit():
                return True
            return False
        
        kept = [m for m in matches if not is_flashscore(m)]
        removed = before - len(kept)
        
        if removed > 0:
            data['matches'] = kept
            data['total'] = len(kept)
            with open(fpath, 'w') as f:
                json.dump(data, f, separators=(',', ':'))
            cleaned += 1
            total_removed += removed
            print(f'  {os.path.basename(fpath)}: removed {removed} FS, kept {len(kept)}')
    
    except Exception as e:
        print(f'  ERROR {fpath}: {e}')

print(f'Done: cleaned {cleaned} files, removed {total_removed} Flashscore matches total')
