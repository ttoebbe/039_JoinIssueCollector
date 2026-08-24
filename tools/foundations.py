"""Resolve Figma style definitions to their actual values from the node tree."""
import sys, json, collections
sys.path.insert(0,'tools')
from fig import *

d = load()
styles = d['styles']
# map styleId -> list of (nodeName, resolvedValue)
fillvals = collections.defaultdict(collections.Counter)
textvals = collections.defaultdict(collections.Counter)
strokevals = collections.defaultdict(collections.Counter)
effectvals = collections.defaultdict(collections.Counter)

def textkey(st):
    return json.dumps({
        'family': st.get('fontFamily'), 'weight': st.get('fontWeight'),
        'size': st.get('fontSize'), 'lineHeightPx': round(st.get('lineHeightPx',0),2),
        'lineHeightPercent': round(st.get('lineHeightPercentFontSize',0),1) if st.get('lineHeightPercentFontSize') else None,
        'letterSpacing': round(st.get('letterSpacing',0),3),
        'align': st.get('textAlignHorizontal'), 'case': st.get('textCase'),
        'decoration': st.get('textDecoration'),
    }, sort_keys=True)

def effkey(node):
    out=[]
    for e in node.get('effects',[]) or []:
        if e.get('visible') is False: continue
        o=e.get('offset',{})
        out.append('%s x=%s y=%s blur=%s spread=%s color=%s' % (
            e.get('type'), o.get('x'), o.get('y'), e.get('radius'), e.get('spread',0), hexcol(e.get('color'))))
    return ' | '.join(out)

for p in pages(d):
    for n,_,_,_ in walk(p):
        s = n.get('styles') or {}
        for k, sid in s.items():
            if k == 'fill' or k == 'fills':
                fillvals[sid][fill_desc(n)] += 1
            elif k == 'text':
                textvals[sid][textkey(n.get('style',{}))] += 1
            elif k in ('stroke','strokes'):
                cols=[]
                for f in n.get('strokes',[]) or []:
                    if f.get('type')=='SOLID': cols.append(hexcol(f.get('color'), f.get('opacity')))
                strokevals[sid]['%s w=%s' % (', '.join(cols), n.get('strokeWeight'))] += 1
            elif k in ('effect','effects'):
                effectvals[sid][effkey(n)] += 1

groups = collections.defaultdict(list)
for sid, meta in styles.items():
    groups[meta['styleType']].append((sid, meta))

for st in ['FILL','TEXT','EFFECT','GRID']:
    items = groups.get(st, [])
    print('='*74); print('STYLE TYPE:', st, '(%d)' % len(items))
    for sid, meta in sorted(items, key=lambda x: x[1]['name']):
        vals = {'FILL':fillvals,'TEXT':textvals,'EFFECT':effectvals}.get(st, {}).get(sid)
        used = strokevals.get(sid)
        print('- %-42s | key=%s' % (meta['name'], meta.get('key','')[:8]))
        if meta.get('description'): print('    desc:', meta['description'])
        if vals:
            for v,c in vals.most_common():
                print('    value(%dx): %s' % (c, v))
        if used:
            for v,c in used.most_common():
                print('    stroke(%dx): %s' % (c, v))
        if not vals and not used:
            print('    value: NOT USED on any node (unresolved)')
