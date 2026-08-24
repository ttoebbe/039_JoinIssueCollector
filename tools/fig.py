"""Shared helpers for reading the cached Figma file dump."""
import json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

CACHE = os.path.join(os.path.dirname(__file__), '..', '.figma-cache')

def load():
    with open(os.path.join(CACHE, 'file.json'), encoding='utf-8') as f:
        return json.load(f)

def walk(node, parent=None, depth=0, page=None):
    yield node, parent, depth, page
    for c in node.get('children', []) or []:
        yield from walk(c, node, depth + 1, page)

def pages(doc):
    return doc['document']['children']

def hexcol(c, opacity=None):
    if c is None: return None
    r = round(c.get('r',0)*255); g = round(c.get('g',0)*255); b = round(c.get('b',0)*255)
    a = c.get('a',1) if opacity is None else opacity*c.get('a',1)
    h = '#%02X%02X%02X' % (r,g,b)
    if abs(a-1) > 0.001:
        h += ' @%.0f%%' % (a*100)
    return h

def fill_desc(node):
    out=[]
    for f in node.get('fills',[]) or []:
        if f.get('visible') is False: continue
        t=f.get('type')
        if t=='SOLID':
            out.append(hexcol(f.get('color'), f.get('opacity')))
        elif t and t.startswith('GRADIENT'):
            stops=[hexcol(s['color']) for s in f.get('gradientStops',[])]
            out.append('%s(%s)' % (t, ', '.join(stops)))
        elif t=='IMAGE':
            out.append('IMAGE:%s' % f.get('imageRef'))
        else:
            out.append(str(t))
    return ', '.join(x for x in out if x)
