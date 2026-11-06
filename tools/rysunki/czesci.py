"""Części wspólne rysunków: poziomy linii, akumulator, koła, kable, klemy.

Rysunek ma 420 x 240 jednostek i na komputerze wyświetla się w 260 px, czyli w skali .62.
Grubości poniżej dają po przeskalowaniu poziomy linii ze skilla animacja-kreska.
"""
import math

from scena import n, P, L, R, C, G, F

AK = "#c34530"  # akcent strony, tylko dla kabla, prądu i tego, co z nich powstało
GY = 206        # wspólna linia ziemi


def plasko(items):
    out = []
    for i in items:
        if isinstance(i, (list, tuple)):
            out += plasko(i)
        else:
            out.append(i)
    return out


def glowna(s, e, *items): return G(s, e, plasko(items), w=3, o=1)
def zwykla(s, e, *items): return G(s, e, plasko(items), w=2.1, o=.8)
def detal(s, e, *items, dt=False): return G(s, e, plasko(items), w=1.4, o=.45, detail=dt)
def nic(s, e, *items, w=2.8): return G(s, e, plasko(items), w=w, o=1, kolor=AK)


def blask(s, e, d, o=.16):
    """Nagroda na końcu etapu: półprzezroczyste wypełnienie w kolorze akcentu."""
    return F(s, e, f'<path d="{d}" fill="{AK}" fill-opacity="{o}" stroke="none"/>')


def napis(s, e, x, y, tekst, size=15, anchor="middle", waga=600):
    return F(s, e, f'<text x="{n(x)}" y="{n(y)}" font-size="{size}" font-weight="{waga}" text-anchor="{anchor}" '
                   f'fill="currentColor" stroke="none">{tekst}</text>')


def gladka(pts, t=.5):
    """Krzywa przez punkty (Catmull-Rom zapisany jako krzywe Béziera)."""
    d = f"M{n(pts[0][0])} {n(pts[0][1])}"
    for i in range(len(pts) - 1):
        a, b, c, e = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        c1 = (b[0] + (c[0] - a[0]) * t / 3, b[1] + (c[1] - a[1]) * t / 3)
        c2 = (c[0] - (e[0] - b[0]) * t / 3, c[1] - (e[1] - b[1]) * t / 3)
        d += f"C{n(c1[0])} {n(c1[1])} {n(c2[0])} {n(c2[1])} {n(c[0])} {n(c[1])}"
    return d


def piorun(cx, cy, k=1):
    p = [(3, -11), (-7, 2), (-1, 2), (-3, 11), (7, -3), (1, -3)]
    return "M" + "L".join(f"{n(cx + a * k)} {n(cy + b * k)}" for a, b in p) + "Z"


def plus(cx, cy, r=4): return [L(cx - r, cy, cx + r, cy), L(cx, cy - r, cx, cy + r)]
def minus(cx, cy, r=4): return [L(cx - r, cy, cx + r, cy)]


def obrot(pts, x, y, kat, k=1):
    """Punkty lokalne obrócone o kąt w stopniach i przesunięte do (x, y)."""
    a = math.radians(kat)
    return [(x + (p * math.cos(a) - q * math.sin(a)) * k, y + (p * math.sin(a) + q * math.cos(a)) * k) for p, q in pts]


def linia(pts, zamknij=False):
    return P("M" + "L".join(f"{n(a)} {n(b)}" for a, b in pts) + ("Z" if zamknij else ""))


def klema(x, y, kat, k=1):
    """Krokodylek: szczęki w (x, y), rękojeść idzie w kierunku kąta. Zwraca kształty i punkt wejścia kabla."""
    szczeki = [linia(obrot([(0, -.6), (12, -5)], x, y, kat, k)), linia(obrot([(0, .6), (12, 5)], x, y, kat, k))]
    raczka = linia(obrot([(12, -5.4), (32, -3.6), (32, 3.6), (12, 5.4)], x, y, kat, k), True)
    return szczeki + [raczka], obrot([(32, 0)], x, y, kat, k)[0]


def wymiar(x0, x1, y, s=.8, e=.96, pion=False):
    """Linia wymiarowa z kreskami ukośnymi na końcach, warstwa rzemieślnicza."""
    if pion:
        return detal(s, e, L(y, x0, y, x1), L(y - 3, x0 + 3, y + 3, x0 - 3), L(y - 3, x1 + 3, y + 3, x1 - 3), dt=True)
    return detal(s, e, L(x0, y, x1, y), L(x0 - 3, y + 3, x0 + 3, y - 3), L(x1 - 3, y + 3, x1 + 3, y - 3), dt=True)


def kreskowanie(x0, x1, y, krok=9, h=7, s=.04, e=.3):
    """Ukośne kreski pod linią ziemi."""
    return detal(s, e, [L(x, y, x - h, y + h) for x in range(int(x0), int(x1), krok)], dt=True)


def ziemia(s=0, e=.14, x0=6, x1=414):
    return zwykla(s, e, L(x0, GY, x1, GY))


def promienie(x, y, kierunek, dl=18, ile=3, rozstaw=18, odstep=5):
    """Krótkie promienie światła rozchodzące się od punktu, kierunek to kąt środkowy w stopniach."""
    out = []
    for i in range(ile):
        a = math.radians(kierunek + (i - (ile - 1) / 2) * rozstaw)
        out.append(L(x + odstep * math.cos(a), y + odstep * math.sin(a), x + (odstep + dl) * math.cos(a), y + (odstep + dl) * math.sin(a)))
    return out


def os_symetrii(s, e, d):
    """Cienka linia osi, kreska-kropka. Wzór kresek wyklucza rysowanie, więc pojawia się płynnie."""
    return f'<g class="dt">' + F(s, e, f'<path d="{d}" stroke-width="1.2" stroke-opacity=".32" stroke-dasharray="9 4 2 4"/>') + "</g>"


def bateria(x, y, w, h, s, e, plus_prawo=True, ogniwa=True, korki=True, znaki=True):
    """Akumulator od frontu: (x, y) to lewy dolny róg. Sześć ogniw, bo tyle ma akumulator 12 V."""
    d = e - s
    t = lambda a, b: (round(s + d * a, 4), round(s + d * b, 4))
    lid = max(11, h * .2)
    top = y - h
    tw = max(9, w * .08)
    th = max(6, h * .085)
    tl, tr = x + w * .14, x + w * .86
    bieg = lambda c: P(f"M{n(c - tw / 2)} {n(top)}L{n(c - tw / 2 + 1.5)} {n(top - th)}H{n(c + tw / 2 - 1.5)}L{n(c + tw / 2)} {n(top)}")
    out = [glowna(*t(0, .42),
                  R(x - 4, y - 7, w + 8, 7, 1),
                  P(f"M{n(x)} {n(y - 7)}V{n(top + lid)}H{n(x + w)}V{n(y - 7)}")),
           glowna(*t(.3, .6), R(x - 2, top, w + 4, lid, 3)),
           zwykla(*t(.5, .72), bieg(tl), bieg(tr))]
    if ogniwa:
        out.append(detal(*t(.56, .86), [L(x + w * i / 6, top + lid + 5, x + w * i / 6, y - 12) for i in range(1, 6)]))
    if korki:
        cw = w * .062
        out.append(detal(*t(.66, .92), [R(x + w * (i + .5) / 6 - cw / 2, top + lid * .3, cw, lid * .4, 1) for i in range(1, 5)]))
    if znaki:
        a, b = (tl, tr) if plus_prawo else (tr, tl)
        out.append(zwykla(*t(.8, 1), minus(a, top + lid / 2, 3.4), plus(b, top + lid / 2, 3.4)))
    return "".join(out), {"plus": (tr if plus_prawo else tl, top - th), "minus": (tl if plus_prawo else tr, top - th), "gora": top, "lid": lid}


def kolo(cx, cy, r, s, e, szprychy=5, felga=.66):
    d = e - s
    t = lambda a, b: (round(s + d * a, 4), round(s + d * b, 4))
    sz = []
    for i in range(szprychy):
        a = i / szprychy * 2 * math.pi - math.pi / 2
        sz.append(L(cx + r * .2 * math.cos(a), cy + r * .2 * math.sin(a), cx + r * (felga - .04) * math.cos(a), cy + r * (felga - .04) * math.sin(a)))
    return (glowna(*t(0, .5), C(cx, cy, r))
            + zwykla(*t(.3, .7), C(cx, cy, r * felga))
            + detal(*t(.5, 1), C(cx, cy, r * .18), sz))
