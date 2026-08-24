"""Print a detailed layout tree for one node id."""
import sys
sys.path.insert(0,'tools')
from fig import *
d=load()
target=sys.argv[1]; maxdepth=int(sys.argv[2]) if len(sys.argv)>2 else 99
def find(nid):
    for p in pages(d):
        for n,_,_,_ in walk(p):
            if n['id']==nid: return n
root=find(target)
if not root: print('NOT FOUND'); sys.exit(1)
rb=root.get('absoluteBoundingBox') or {}
for n,par,dep,_ in walk(root):
    if dep>maxdepth: continue
    ab=n.get('absoluteBoundingBox') or {}
    ind='  '*dep
    bits=[]
    if n.get('layoutMode'): bits.append('AL=%s gap=%s' % (n['layoutMode'][:1], n.get('itemSpacing')))
    p=(n.get('paddingTop',0),n.get('paddingRight',0),n.get('paddingBottom',0),n.get('paddingLeft',0))
    if any(p): bits.append('pad=%g/%g/%g/%g'%p)
    r=n.get('cornerRadius')
    if r is None and n.get('rectangleCornerRadii'): r=tuple(n['rectangleCornerRadii'])
    if r: bits.append('r=' + str(r))
    f=fill_desc(n)
    if f: bits.append('fill=%s'%f)
    st=[hexcol(s.get('color'),s.get('opacity')) for s in (n.get('strokes') or []) if s.get('type')=='SOLID']
    if st: bits.append('stroke=%s w%s'%(','.join(st),n.get('strokeWeight')))
    for e in n.get('effects',[]) or []:
        if e.get('visible') is False: continue
        o=e.get('offset',{})
        bits.append('shadow=%s %g/%g b%g s%g %s'%(e.get('type'),o.get('x',0),o.get('y',0),e.get('radius',0),e.get('spread',0),hexcol(e.get('color'))))
    if n['type']=='TEXT':
        s=n.get('style',{})
        bits.append('%s %spx/%s lh%g ls%g' % (s.get('fontFamily'),s.get('fontSize'),s.get('fontWeight'),round(s.get('lineHeightPx',0),1),round(s.get('letterSpacing',0),2)))
    rel = '@%g,%g' % (ab.get('x',0)-rb.get('x',0), ab.get('y',0)-rb.get('y',0))
    print('%s%s %s [%s] %gx%g %s %s' % (ind, n['id'], n['name'][:38], n['type'][:11], round(ab.get('width',0)), round(ab.get('height',0)), rel, ' '.join(bits)))
    if n['type']=='TEXT':
        print('%s    TEXT: %r' % (ind, (n.get('characters') or '')[:160]))
