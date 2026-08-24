"""Render the remaining reference frames, backing off on Figma's per-minute rate limit."""
import json, os, time, urllib.request, urllib.error, sys

KEY = '6OT2cRhEtUALqFQy0ukNlT'
TOKEN = open('.figma-token', encoding='utf-8').read().strip()
MAP = json.load(open('.figma-cache/reference-map.json'))
OUT = os.path.join('docs', 'design', 'reference')

pending = [nid for nid, name in MAP.items() if not os.path.exists(os.path.join(OUT, name))]
known_null = {'10175:3745','664:3851','664:3772','664:3733','656:3857','10119:3717','656:3836','656:3794'}
pending = [p for p in pending if p not in known_null]
print('pending:', len(pending), flush=True)

def render(ids):
    url = 'https://api.figma.com/v1/images/%s?ids=%s&format=png&scale=1' % (KEY, ','.join(ids))
    req = urllib.request.Request(url, headers={'X-Figma-Token': TOKEN})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode())

CHUNK = 3
i = 0
while i < len(pending):
    chunk = pending[i:i+CHUNK]
    delay = 90
    for attempt in range(8):
        try:
            res = render(chunk)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print('429, sleeping %ds' % delay, flush=True); time.sleep(delay); delay = min(delay*2, 600); continue
            raise
        if res.get('status') == 429:
            print('429, sleeping %ds' % delay, flush=True); time.sleep(delay); delay = min(delay*2, 600); continue
        for nid, u in res.get('images', {}).items():
            name = MAP[nid]
            if not u:
                print('NULL', nid, name, flush=True); continue
            urllib.request.urlretrieve(u, os.path.join(OUT, name))
            print('ok', name, flush=True)
        break
    i += CHUNK
    time.sleep(25)
print('done', flush=True)
