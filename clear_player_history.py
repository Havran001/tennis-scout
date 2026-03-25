import json, os, glob

OUT_DIR = 'player_history'
files = glob.glob(f'{OUT_DIR}/*.json')
print(f'Found {len(files)} player history files')

cleared = 0
for fpath in files:
    try:
        with open(fpath) as f:
            data = json.load(f)
        data['matches'] = []
        data['total'] = 0
        data.pop('updated', None)
        with open(fpath, 'w') as f:
            json.dump(data, f, separators=(',', ':'))
        cleared += 1
    except Exception as e:
        print(f'  ERROR {fpath}: {e}')

print(f'Done: cleared {cleared} files')
