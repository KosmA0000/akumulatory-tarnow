"""Helpery do generowania sceny SVG dla animacji kreską.

Każda funkcja zwraca tekst SVG. Składaj scenę z grup G() i F(), a wynik wstaw do <svg class="lh-art">.
Kolejność elementów w grupie to kolejność rysowania.
"""
import math

def n(v): return f"{v:.1f}".rstrip("0").rstrip(".")
def P(d): return f'<path d="{d}"/>'
def L(a, b, c, d): return P(f"M{n(a)} {n(b)}L{n(c)} {n(d)}")
def R(x, y, w, h, r=0): return f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}"' + (f' rx="{r}"' if r else "") + "/>"
def C(x, y, r): return f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r)}"/>'

def G(s, e, items, w=1.6, o=.85, detail=False, kolor=None):
    """Grupa rysowana od s do e (0-1 w skali całej animacji). detail=True znika na telefonie."""
    a = f'data-s="{s}" data-e="{e}" stroke-width="{w}" stroke-opacity="{o}"'
    a += ' class="dt"' if detail else ""
    a += f' stroke="{kolor}"' if kolor else ""
    return f"<g {a}>" + "".join(items) + "</g>"

def F(s, e, inner):
    """Element pojawiający się płynnie: tekst albo półprzezroczyste wypełnienie."""
    return f'<g data-f="{s} {e}">{inner}</g>'

def okno_etapu(granice, i, a, b):
    """Zamienia ułamki etapu i (0-1) na czas całej animacji."""
    t0, t1 = granice[i], granice[i + 1]
    return round(t0 + (t1 - t0) * a, 4), round(t0 + (t1 - t0) * b, 4)

def spirala(cx, y0, h, r, zwoje, profil=lambda u: 1, spl=.3, kroki=16):
    """Pionowa sprężyna lub śruba. profil(u) zmienia promień: stożek, beczka."""
    N = int(zwoje * kroki)
    pts = []
    for i in range(N + 1):
        u = i / N; t = u * zwoje * 2 * math.pi; rr = r * profil(u)
        pts.append(f"{n(cx + rr * math.cos(t))} {n(y0 + h * u + rr * spl * math.sin(t))}")
    return "M" + "L".join(pts)

def zebatka(cx, cy, r, zeby=12):
    pts = []
    for i in range(zeby * 4):
        a = i / (zeby * 4) * 2 * math.pi; rr = r if i % 4 in (0, 1) else r * .82
        pts.append(f"{n(cx + rr * math.cos(a))} {n(cy + rr * math.sin(a))}")
    return "M" + "L".join(pts) + "Z"

def obrys_chmurki(cx, cy, rx, ry, k, start=0):
    """Zaokrąglony obrys: korona drzewa, krzew, chmura."""
    pts = [(cx + rx * math.cos(start + 2 * math.pi * i / k), cy + ry * math.sin(start + 2 * math.pi * i / k)) for i in range(k + 1)]
    d = f"M{n(pts[0][0])} {n(pts[0][1])}"
    for a, b in zip(pts, pts[1:]):
        r = math.dist(a, b) * .62
        d += f"A{n(r)} {n(r)} 0 0 1 {n(b[0])} {n(b[1])}"
    return P(d)

def siatka_okien(x, y, w, h, kolumny, rzedy, od_dolu=True):
    """Okna elewacji. od_dolu=True: budynek rośnie od parteru."""
    out = []
    rz = range(rzedy - 1, -1, -1) if od_dolu else range(rzedy)
    for j in rz:
        for i in range(kolumny):
            out.append(R(x + i * w / kolumny + 6, y + j * h / rzedy + 6, w / kolumny - 12, h / rzedy - 12))
    return out
