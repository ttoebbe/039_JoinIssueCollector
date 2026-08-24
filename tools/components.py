"""Dump every COMPONENT_SET and COMPONENT with per-variant geometry and styling."""
import sys, json, collections
sys.path.insert(0,'tools')
from fig import *

d = load()

def geom(n):
    ab = n.get('absoluteBoundingBox') or {}
    p = (n.get('paddingTop',0), n.get('paddingRight',0), n.get('paddingBottom',0), n.get('paddingLeft',0))
    r = n.get('cornerRadius')
    if r is None and n.get('rectangleCornerRadii'): r = tuple(n['rectangleCornerRadii'])
    strokes=[]
    for s in n.get('strokes',[]) or []:
        if s.get('type')=='SOLID': strokes.append(hexcol(s.get('color'), s.get('opacity')))
    eff=[]
    for e in n.get('effects',[]) or []:
        if e.get('visible') is False: continue
        o=e.get('offset',{})
        eff.append('%s %s/%s b%s s%s %s' % (e.get('type'),o.get('x'),o.get('y'),e.get('radius'),e.get('spread',0),hexcol(e.get('color'))))
    return {
        'size': '%sx%s' % (round(ab.get('width',0)), round(ab.get('height',0))),
        'layout': n.get('layoutMode'), 'gap': n.get('itemSpacing'),
        'pad': 'T%s R%s B%s L%s' % p if any(p) else '-',
        'radius': r, 'fill': fill_desc(n),
        'stroke': '%s w%s' % (','.join(strokes), n.get('strokeWeight')) if strokes else '-',
        'effect': ' | '.join(eff) or '-',
        'sizing': '%s/%s' % (n.get('layoutSizingHorizontal') or n.get('primaryAxisSizingMode') or '-', n.get('layoutSizingVertical') or n.get('counterAxisSizingMode') or '-'),
    }

def firsttext(n):
    for c,_,_,_ in walk(n):
        if c['type']=='TEXT':
            st=c.get('style',{})
            return '%s %spx/%s lh%s "%s"' % (st.get('fontFamily'), st.get('fontSize'), st.get('fontWeight'), round(st.get('lineHeightPx',0),1), (c.get('characters') or '')[:24].replace('\n','\n'))
    return '-'

sets = {}
loose = []
for p in pages(d):
    for n,par,_,_ in walk(p):
        if n['type']=='COMPONENT_SET':
            sets[n['id']] = (p['name'], n, par)
        elif n['type']=='COMPONENT' and (par is None or par.get('type')!='COMPONENT_SET'):
            loose.append((p['name'], n, par))

print('COMPONENT_SETS: %d   loose COMPONENTS: %d' % (len(sets), len(loose)))
print()
for sid,(pg,n,par) in sorted(sets.items(), key=lambda x: (x[1][0], x[1][1]['name'])):
    ab=n.get('absoluteBoundingBox') or {}
    print('#'*76)
    print('SET %s | %s | page=%s | container %sx%s' % (sid, n['name'], pg, round(ab.get('width',0)), round(ab.get('height',0))))
    for v in n.get('children',[]):
        g=geom(v)
        print('  VARIANT %-13s %-44s' % (v['id'], v['name'][:44]))
        print('     size=%-11s layout=%-10s gap=%-6s pad=%-24s radius=%s' % (g['size'],g['layout'],g['gap'],g['pad'],g['radius']))
        print('     fill=%-34s stroke=%-22s' % (g['fill'][:34], g['stroke'][:22]))
        print('     effect=%s' % g['effect'])
        print('     text=%s' % firsttext(v))
print()
print('='*76)
print('LOOSE COMPONENTS')
for pg,n,par in sorted(loose, key=lambda x:(x[0], x[1]['name'])):
    g=geom(n)
    print('  %-14s %-46s page=%s' % (n['id'], n['name'][:46], pg))
    print('     size=%-11s layout=%-10s gap=%-6s pad=%-24s radius=%s' % (g['size'],g['layout'],g['gap'],g['pad'],g['radius']))
    print('     fill=%-34s stroke=%-22s effect=%s' % (g['fill'][:34], g['stroke'][:22], g['effect']))
    print('     text=%s' % firsttext(n))
