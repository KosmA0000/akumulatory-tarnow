"""Rysunki usług i kategorii na stronie głównej, animacja kreską.

Uruchom: python tools/rysunki/rysunki.py
Wynik zastępuje w całości public/akumulatory-tarnow/assets/offer-drawings-art.js.
Czasy data-s, data-e i data-f mają skalę 0-1 w obrębie jednego rysunku.
Kolejność w kodzie to kolejność rysowania: od ziemi, przez obiekt, po kabel i nagrodę.
"""
import json
import math
import os

from scena import n, P, L, R, C
from czesci import (GY, blask, bateria, detal, glowna, gladka, klema, kolo, kreskowanie, linia, napis, nic, obrot,
                    os_symetrii, piorun, promienie, wymiar, ziemia, zwykla)


def czas(s, e):
    return lambda a, b: (round(s + (e - s) * a, 4), round(s + (e - s) * b, 4))


def auto(x0, k, s, e, maska=False):
    """Auto z boku, przodem w lewo. Zwraca kształty i funkcje przeliczające punkty lokalne."""
    t = czas(s, e)
    p = lambda x, y: f"{n(x0 + x * k)} {n(GY - y * k)}"
    q = lambda x, y: (x0 + x * k, GY - y * k)
    a1, a2, r, ar, ch = 52, 216, 21, 25.5 * k, 24.2
    blotnik = f"C{p(26, 54)} {p(58, 57)} {p(90, 62)}" if maska else f"C{p(24, 58)} {p(52, 62)} {p(90, 66)}"
    nadwozie = (f"M{p(a1 - ch, 13)}L{p(12, 13)}C{p(5, 14)} {p(2, 19)} {p(2, 25)}L{p(2, 34)}C{p(2, 41)} {p(5, 46)} {p(10, 49)}"
                + blotnik
                + f"C{p(102, 74)} {p(118, 88)} {p(136, 93)}C{p(158, 98)} {p(192, 98)} {p(212, 91)}"
                + f"C{p(230, 85)} {p(246, 74)} {p(256, 63)}C{p(262, 57)} {p(266, 50)} {p(266, 42)}"
                + f"L{p(266, 26)}C{p(266, 19)} {p(262, 14)} {p(256, 13)}L{p(a2 + ch, 13)}"
                + f"A{n(ar)} {n(ar)} 0 1 0 {p(a2 - ch, 13)}L{p(a1 + ch, 13)}A{n(ar)} {n(ar)} 0 1 0 {p(a1 - ch, 13)}")
    szyby = [P(f"M{p(110, 68)}C{p(122, 77)} {p(132, 85)} {p(144, 87)}L{p(166, 88.5)}V{n(GY - 68 * k)}Z"),
             P(f"M{p(171, 68)}V{n(GY - 88.5 * k)}L{p(196, 88)}C{p(212, 86)} {p(226, 76)} {p(238, 68)}Z")]
    drzwi = [P(f"M{p(98, 64)}L{p(95, 27)}Q{p(95, 18)} {p(104, 18)}L{p(186, 18)}"), L(*q(168, 18), *q(168, 66)),
             P(f"M{p(226, 64)}C{p(226, 54)} {p(224, 46)} {p(220, 44)}")]
    detale = [L(*q(148, 59), *q(160, 59)), L(*q(204, 59), *q(216, 59)),
              L(*q(10, 26), *q(24, 26)), L(*q(250, 22), *q(263, 22))]
    lampy = [P(f"M{p(9, 47)}L{p(34, 53)}C{p(36, 50)} {p(35, 47)} {p(31, 45)}L{p(7, 40)}"),
             P(f"M{p(265, 49)}L{p(244, 55)}L{p(243, 48)}L{p(265, 43)}")]
    lustro = P(f"M{p(107, 70)}C{p(104, 75)} {p(96, 75)} {p(94, 72)}C{p(93, 69)} {p(97, 67)} {p(103, 67)}")
    out = (kolo(*q(a1, r), r * k, *t(0, .3)) + kolo(*q(a2, r), r * k, *t(.05, .34))
           + glowna(*t(.2, .68), P(nadwozie))
           + zwykla(*t(.56, .8), szyby, lustro)
           + zwykla(*t(.64, .86), lampy)
           + detal(*t(.68, 1), drzwi, detale))
    return out, q, p


def kabel_klema(s, e, pts, koniec, kat, czarny=False, k=.9):
    """Kabel przez punkty pts do krokodylka w punkcie koniec. Czerwony to nić przewodnia."""
    ksztalty, wejscie = klema(*koniec, kat, k)
    d, srodek = gladka(pts + [wejscie]), e - (e - s) * .2
    if czarny:
        return zwykla(s, srodek, P(d)) + zwykla(srodek, e, ksztalty)
    return nic(s, srodek, P(d)) + nic(srodek, e, ksztalty, w=2.2)


def wydruk(x, w, y0, y1):
    """Papier z drukarki, górna krawędź oderwana w ząbki."""
    krok = w / round(w / 6)
    zeby = "".join(f"L{n(x + i * krok)} {y0 + (5 if i % 2 == 0 else 0)}" for i in range(1, int(round(w / krok)) + 1))
    return P(f"M{n(x)} {y1}V{y0 + 5}{zeby}V{y1}")


# Odpalenie: pojazd stoi z otwartą maską, mobilny serwis podpina rozruch, auto rusza.
def odpalenie():
    x0, k = 150, .98
    car, q, p = auto(x0, k, .05, .44, maska=True)
    zawias, szczyt = q(90, 62), q(40, 124)
    uklad = lambda a, b: f"M{n(a[0])} {n(a[1])}Q{n((a[0] + b[0]) / 2 - 6)} {n((a[1] + b[1]) / 2 - 4)} {n(b[0])} {n(b[1])}"
    maska = P(uklad(zawias, szczyt))
    # w komorze silnika widać górę akumulatora i pokrywę silnika
    bl, br, bt, bd = q(16, 0)[0], q(50, 0)[0], q(0, 74)[1], q(0, 55)[1]
    t1, t2 = bl + 7, br - 7
    slupek = lambda c: P(f"M{n(c - 3.5)} {n(bt)}V{n(bt - 5)}H{n(c + 3.5)}V{n(bt)}")
    aku = [P(f"M{n(bl)} {n(bd)}V{n(bt)}H{n(br)}V{n(bd)}"), slupek(t1), slupek(t2)]
    silnik = [P(f"M{p(56, 58)}V{n(q(0, 76)[1])}H{n(q(84, 0)[0])}V{n(q(0, 62)[1])}"), L(*q(62, 76), *q(62, 81))]
    # rozruch na ziemi
    bx, bw, bh = 14, 100, 52
    top = GY - bh
    obudowa = R(bx, top, bw, bh, 6)
    uchwyt = P(f"M{bx + 12} {top}C{bx + 12} {top - 14} {bx + 50} {top - 14} {bx + 50} {top}")
    ekran = R(bx + 10, top + 10, 46, 26, 2)
    slupki = [R(bx + 16 + i * 9.5, top + 31 - (6 + i * 4), 5, 6 + i * 4, .5) for i in range(4)]
    gniazda = [R(bx + 62, top - 5, 8, 5, 1), R(bx + 82, top - 5, 8, 5, 1)]
    szczeliny = [L(bx + 12 + i * 8, top + 42, bx + 12 + i * 8, top + 46) for i in range(10)]
    czarny = kabel_klema(.54, .76, [(bx + 66, top - 5), (bx + 70, top - 36), (bx + 108, top - 62), (x0 + 16, top - 62)], q(62, 81), -135, czarny=True)
    czerwony = kabel_klema(.58, .84, [(bx + 86, top - 5), (bx + 96, top - 26), (bx + 118, top - 38)], (t1, bt - 5), -150)
    lampa = q(6, 44)
    return (ziemia() + kreskowanie(bx, bx + bw, GY + 1) + kreskowanie(x0 + 6, x0 + 256, GY + 1, s=.06, e=.34)
            + car
            + glowna(.42, .52, maska) + zwykla(.46, .56, aku) + detal(.48, .58, silnik)
            + glowna(.26, .42, obudowa) + zwykla(.36, .46, uchwyt) + zwykla(.42, .52, ekran, gniazda)
            + detal(.48, .58, szczeliny, dt=True) + detal(.5, .58, slupki)
            + czarny + czerwony
            + blask(.84, .92, piorun(bx + 82, top + 24, .9), .9)
            + nic(.9, 1, promienie(lampa[0] - 2, lampa[1] + 3, 180), w=2.4))


# Montaż: akumulator zjeżdża na tacę, potem docisk, klemy i klucz na minusie, który podłącza się na końcu.
def montaz():
    x, w, h, dol = 128, 164, 100, 186
    bat, b = bateria(x, dol, w, h, .22, .46)
    bp, bm = b["plus"], b["minus"]
    taca = (glowna(.04, .2, P(f"M92 172V{dol}H328V172"))
            + zwykla(.12, .24, P(f"M92 {dol}V{dol + 7}H328V{dol}"))
            + zwykla(.18, .28, L(120, dol + 7, 120, GY), L(300, dol + 7, 300, GY))
            + detal(.2, .32, [L(c, dol + 2, c - 5, dol + 7) for c in range(102, 328, 9)], dt=True))
    docisk = lambda c, z: [P(f"M{c} {dol}V{dol - 15}H{c + z * 13}V{dol - 10}"), R(c - 4, dol - 21, 8, 6, 1)]
    zacisk = lambda c: [R(c[0] - 8, c[1] - 5, 16, 8, 2), C(c[0], c[1] - 1, 2)]
    sciana = lambda a, z: [P(f"M{a} {GY}V150H{a + z * 34}")]
    oczko = lambda c: [C(c[0], c[1], 5), C(c[0], c[1], 1.6)]
    koniec_m, koniec_p = (34, 144), (386, 144)
    kabel_m = gladka([(bm[0] - 8, bm[1] - 1), (bm[0] - 34, bm[1] - 6), (70, 86), (40, 116), koniec_m])
    kabel_p = gladka([(bp[0] + 8, bp[1] - 1), (bp[0] + 34, bp[1] - 6), (350, 86), (380, 116), koniec_p])
    glowica = (bm[0], bm[1] - 7)
    kat = -22
    klucz = obrot([(12, -4.4), (92, -3.4)], *glowica, kat) + obrot([(92, 3.4), (12, 4.4)], *glowica, kat)
    konc = obrot([(103, 0)], *glowica, kat)[0]
    szesc = [(6.5 * math.cos(math.radians(a + 30)) + glowica[0], 6.5 * math.sin(math.radians(a + 30)) + glowica[1]) for a in range(0, 360, 60)]
    luk = [(glowica[0] + 84 * math.cos(math.radians(a)), glowica[1] + 84 * math.sin(math.radians(a))) for a in range(-12, 15, 3)]
    grot = obrot([(-7, -4), (0, 0), (-7, 4)], *luk[-1], 102)
    return (ziemia() + kreskowanie(100, 320, GY + 1) + zwykla(.08, .2, sciana(18, 1), sciana(402, -1)) + taca
            + '<g data-m="0 -50 .46 .62">' + bat + blask(.9, 1, piorun(x + w / 2, dol - 42, 1.7), .9) + '</g>'
            + zwykla(.6, .7, docisk(110, 1), docisk(310, -1))
            + zwykla(.62, .72, zacisk(bp), zacisk(bm))
            + nic(.66, .86, P(kabel_p)) + zwykla(.64, .82, P(kabel_m))
            + nic(.84, .9, oczko(koniec_p), w=2.2) + zwykla(.8, .88, oczko(koniec_m))
            + glowna(.76, .88, C(*glowica, 13), linia(szesc, True)) + glowna(.8, .92, linia(klucz), C(*konc, 11))
            + detal(.88, .94, C(*konc, 5)) + zwykla(.9, 1, linia(luk), linia(grot))
            + wymiar(x, x + w, 226, .7, .9))


# Test: klemy na biegunach, tester mierzy, z drukarki wychodzi papierowy wydruk.
def test_akumulatora():
    bat, b = bateria(26, GY, 160, 94, .04, .34)
    tx, tw, ty = 266, 96, 92
    ekran = R(tx + 11, ty + 12, tw - 22, 44, 3)
    klawisze = [R(tx + 13 + i * 25, ty + 68 + j * 18, 20, 11, 2) for j in range(2) for i in range(3)]
    px, pw, py = tx + 21, 54, 16
    wiersze = [L(px + 8, ty - 12 - i * 9, px + pw - 8 - (i % 3) * 8, ty - 12 - i * 9) for i in range(3)]
    ptak = linia([(px + 16, py + 24), (px + 24, py + 32), (px + 39, py + 15)])
    skala = gladka([(tx + 19, ty + 46), (tx + 30, ty + 26), (tx + 48, ty + 20), (tx + 66, ty + 26), (tx + 77, ty + 46)])
    return (ziemia() + kreskowanie(30, 186, GY + 1) + kreskowanie(tx, tx + tw, GY + 1, s=.2, e=.4)
            + bat
            + glowna(.2, .42, R(tx, ty, tw, GY - ty, 9)) + zwykla(.34, .48, ekran, L(tx + 16, ty, tx + tw - 16, ty)) + detal(.42, .56, klawisze)
            + kabel_klema(.44, .66, [(tx, ty + 28), (232, 66), (150, 34), (72, 44)], b["minus"], -90, czarny=True)
            + kabel_klema(.48, .7, [(tx, ty + 54), (238, 122), (206, 76)], b["plus"], -58)
            + zwykla(.66, .76, P(skala)) + nic(.72, .78, L(tx + 48, ty + 46, tx + 62, ty + 30), w=2.4)
            + glowna(.72, .86, wydruk(px, pw, py, ty)) + detal(.82, .9, wiersze)
            + nic(.9, .98, ptak, w=3)
            + blask(.92, 1, f"M{px} {ty}V{py + 5}H{px + pw}V{ty}Z", .09)
            + wymiar(26, 186, 226, .5, .7))


# Kodowanie: tester łączy się z komputerem auta i dopisuje nowy akumulator.
def kodowanie():
    sx, sy, sw, sh = 30, 76, 142, 110
    laptop = (glowna(.04, .24, R(sx, sy, sw, sh, 6))
              + zwykla(.16, .3, R(sx + 8, sy + 8, sw - 16, sh - 20, 2))
              + glowna(.2, .32, P(f"M{sx - 14} {GY}H{sx + sw + 14}L{sx + sw + 4} {sy + sh}H{sx - 4}Z"))
              + detal(.3, .4, L(sx + 56, GY - 7, sx + sw - 56, GY - 7)))
    wiersze = [L(sx + 18, sy + 22 + i * 12, sx + 18 + [66, 46, 84, 56][i], sy + 22 + i * 12) for i in range(4)]
    bat, b = bateria(282, GY, 116, 72, .3, .56)
    ex, ey, ew, eh = 262, 26, 138, 62
    piny = [L(ex + 12 + i * 12, ey + eh, ex + 12 + i * 12, ey + eh + 6) for i in range(10)]
    wtyk = linia([(204, 44), (252, 44), (246, 76), (210, 76)], True)
    bolce = [C(212 + i * 4.8, 54 + j * 12, 1) for j in range(2) for i in range(7)]
    return (ziemia() + kreskowanie(16, 186, GY + 1) + kreskowanie(282, 398, GY + 1, s=.3, e=.46)
            + laptop + detal(.3, .42, wiersze) + zwykla(.34, .44, R(sx + 18, sy + 72, 106, 8, 2))
            + bat + glowna(.42, .58, R(ex, ey, ew, eh, 4)) + detal(.54, .64, piny)
            + zwykla(.5, .56, R(sx + sw, 138, 8, 12, 1))
            + nic(.52, .7, P(gladka([(sx + sw + 8, 144), (200, 158), (226, 128), (228, 78)])))
            + glowna(.66, .74, wtyk) + detal(.7, .78, bolce)
            + nic(.74, .8, L(250, 60, ex, 60))
            + nic(.8, .9, P(gladka([(340, ey + eh + 6), (334, 110), (b["minus"][0] + 6, b["minus"][1] - 2)])))
            + napis(.82, .9, ex + ew / 2, ey + 37, "Start/Stop", 19)
            + blask(.88, .96, f"M{sx + 19} {sy + 73}h104v6h-104Z", .9)
            + nic(.92, 1, linia([(sx + 104, sy + 40), (sx + 112, sy + 48), (sx + 127, sy + 30)]), w=3))


# Transport: ze sklepu do klienta tego samego dnia, a cena zależy od odległości.
def transport():
    sx, sw, top = 12, 66, 88
    sklep = (glowna(.03, .16, P(f"M{sx} {GY}V{top}H{sx + sw}V{GY}"))
             + zwykla(.12, .2, R(sx - 4, top - 18, sw + 8, 18, 1))
             + zwykla(.16, .24, R(sx + 8, 138, 24, GY - 138), R(sx + 38, 138, 20, 34))
             + detal(.2, .3, [L(sx + i * 13, top, sx + i * 13 - 2, top + 12) for i in range(1, 5)]))
    hx, hw, ht = 322, 84, 118
    dom = (glowna(.08, .22, P(f"M{hx} {GY}V{ht}H{hx + hw}V{GY}"))
           + glowna(.14, .3, P(f"M{hx - 10} {ht + 4}L{hx + hw / 2} {ht - 44}L{hx + hw + 10} {ht + 4}"))
           + zwykla(.22, .32, R(hx + 12, 158, 22, GY - 158), R(hx + 50, 136, 22, 22))
           + detal(.28, .38, L(hx + 61, 136, hx + 61, 158), L(hx + 50, 147, hx + 72, 147)))
    x0, k = 134, .92
    p = lambda x, y: f"{n(x0 + x * k)} {n(GY - y * k)}"
    q = lambda x, y: (x0 + x * k, GY - y * k)
    a1, a2, r, ar, ch = 38, 138, 19, 23 * k, 22.4
    nadwozie = (f"M{p(4, 14)}L{p(4, 90)}C{p(4, 97)} {p(9, 100)} {p(15, 100)}L{p(112, 100)}C{p(122, 100)} {p(128, 96)} {p(133, 90)}"
                + f"L{p(151, 62)}C{p(166, 58)} {p(177, 52)} {p(179, 42)}L{p(181, 25)}C{p(181, 18)} {p(177, 14)} {p(171, 14)}"
                + f"L{p(a2 + ch, 14)}A{n(ar)} {n(ar)} 0 1 0 {p(a2 - ch, 14)}L{p(a1 + ch, 14)}A{n(ar)} {n(ar)} 0 1 0 {p(a1 - ch, 14)}Z")
    szyba = P(f"M{p(110, 90)}L{p(130, 90)}L{p(146, 62)}L{p(110, 62)}Z")
    lampa = P(f"M{p(178, 50)}L{p(164, 52)}L{p(164, 44)}L{p(179, 42)}")
    drzwi = [L(*q(104, 96), *q(104, 22)), L(*q(150, 58), *q(150, 44)), L(*q(112, 54), *q(122, 54))]
    ladunek, _ = bateria(q(18, 0)[0], q(0, 49)[1], 58, 34, .44, .62, ogniwa=False, korki=False)
    bus = ('<g data-m="-52 0 .22 .84">'
           + kolo(*q(a1, r), r * k, .22, .36) + kolo(*q(a2, r), r * k, .24, .38)
           + glowna(.3, .5, P(nadwozie)) + zwykla(.44, .54, szyba, lampa) + detal(.5, .6, drzwi)
           + ladunek + blask(.8, .9, piorun(q(47, 0)[0], q(0, 63)[1], .62), .9) + '</g>')
    px, py = hx + hw / 2, 34
    kropla = P(f"M{n(px)} {n(py + 22)}C{n(px - 7)} {n(py + 10)} {n(px - 12)} {n(py + 6)} {n(px - 12)} {n(py - 3)}"
               f"A12 12 0 1 1 {n(px + 12)} {n(py - 3)}C{n(px + 12)} {n(py + 6)} {n(px + 7)} {n(py + 10)} {n(px)} {n(py + 22)}Z")
    return (ziemia() + detal(.06, .3, [L(x, GY + 11, x + 13, GY + 11) for x in range(14, 410, 26)], dt=True)
            + sklep + dom + bus
            + nic(.58, .72, L(sx + sw / 2, py - 6, sx + sw / 2, py + 6), L(sx + sw / 2, py, 150, py))
            + nic(.72, .86, L(258, py, px - 16, py))
            + nic(.84, .94, kropla, C(px, py - 3, 4), w=2.4)
            + blask(.92, 1, f"M{n(px - 10)} {n(py - 3)}a10 10 0 1 1 20 0c0 8-6 12-10 20c-4-8-10-12-10-20Z", .22)
            + napis(.76, .88, 204, py + 6, "8:00-17:00", 17))


# Podtrzymanie: stary akumulator wychodzi, a radio cały czas ma zasilanie z urządzenia podtrzymującego.
def podtrzymanie():
    rx, ry, rw, rh = 18, 30, 190, 80
    radio = (glowna(.03, .2, R(rx, ry, rw, rh, 6))
             + zwykla(.14, .28, R(rx + 42, ry + 10, rw - 84, 32, 2))
             + zwykla(.18, .3, C(rx + 21, ry + 24, 12), C(rx + rw - 21, ry + 24, 12))
             + detal(.24, .34, C(rx + 21, ry + 24, 5), C(rx + rw - 21, ry + 24, 5))
             + zwykla(.24, .36, [R(rx + 15 + i * 27, ry + 55, 22, 12, 2) for i in range(6)]))
    kod = [R(rx + 55 + i * 21, ry + 17, 15, 18, 2) for i in range(4)]
    px, pw, ph = 40, 146, 48
    pt = GY - ph
    pakiet = (glowna(.3, .44, R(px, pt, pw, ph, 5))
              + zwykla(.4, .5, C(px + 24, pt + 24, 10), R(px + 50, pt + 13, 80, 22, 2))
              + detal(.46, .54, [L(px + 58 + i * 13, pt + 20, px + 58 + i * 13, pt + 28) for i in range(5)]))
    ax, aw, ah = 262, 124, 70
    nowy, b = bateria(ax, GY, aw, ah, .36, .6)
    gy2 = GY - ah - 24
    gt = gy2 - ah
    stary = (f'<g data-f=".5 .62" stroke-width="1.9" stroke-opacity=".5" stroke-dasharray="6 5">'
             + P(f"M{ax} {gt + 14}V{gt + ah}H{ax + aw}V{gt + 14}") + R(ax - 2, gt, aw + 4, 14, 3)
             + P(f"M{ax + 13} {gt}v-6h10v6M{ax + aw - 23} {gt}v-6h10v6") + '</g>')
    sx = ax + aw + 15
    strzalka = [L(sx, gy2 - 8, sx, gt + 6), linia([(sx - 6, gt + 14), (sx, gt + 6), (sx + 6, gt + 14)])]
    kx = px + 90
    return (ziemia() + kreskowanie(px, px + pw, GY + 1) + kreskowanie(ax, ax + aw, GY + 1, s=.3, e=.46)
            + radio + detal(.34, .44, kod) + pakiet + nowy + stary
            + zwykla(.6, .7, strzalka)
            + zwykla(.58, .64, R(kx - 5, pt - 5, 10, 5, 1), R(kx - 5, ry + rh, 10, 5, 1))
            + nic(.64, .84, L(kx, pt - 5, kx, ry + rh + 5))
            + blask(.84, .96, f"M{rx + 43} {ry + 11}h{rw - 86}v30h-{rw - 86}Z", .16)
            + blask(.9, 1, piorun(px + 24, pt + 24, .62), .9))


# Test alternatora i rozrusznika: oba elementy pod pomiarem, wynik na wydruku.
def alternator_rozrusznik():
    cx, cy, r = 104, 132, 62
    alt = (glowna(.03, .22, C(cx, cy, r))
           + zwykla(.16, .3, C(cx, cy, r - 10))
           + glowna(.22, .34, C(cx, cy, 25))
           + zwykla(.28, .38, C(cx, cy, 17))
           + detal(.32, .44, C(cx, cy, 6)))
    szczeliny = []
    for i in range(14):
        a = i / 14 * 2 * math.pi
        szczeliny.append(L(cx + 30 * math.cos(a), cy + 30 * math.sin(a), cx + 47 * math.cos(a + .12), cy + 47 * math.sin(a + .12)))
    lapy = [P(f"M{cx - 40} {cy + 48}L{cx - 48} {GY}H{cx + 48}L{cx + 40} {cy + 48}"), C(cx - 30, GY - 8, 3), C(cx + 30, GY - 8, 3)]
    sx, sy, sw, sh = 214, 130, 108, 66
    rozrusznik = (glowna(.3, .46, R(sx, sy, sw, sh, 8))
                  + zwykla(.4, .5, R(sx + 26, sy - 36, sw - 22, 36, 6), L(sx + 42, sy - 36, sx + 42, sy))
                  + glowna(.44, .56, P(f"M{sx + sw} {sy + 8}L{sx + sw + 28} {sy + 16}V{sy + sh - 16}L{sx + sw} {sy + sh - 8}")))
    zebnik = [R(sx + sw + 28, sy + 18, 36, sh - 36, 2)]
    zeby = [L(sx + sw + 35 + i * 7, sy + 18, sx + sw + 35 + i * 7, sy + sh - 18) for i in range(4)]
    uzwojenie = [L(sx + 12 + i * 14, sy + 7, sx + 12 + i * 14, sy + sh - 7) for i in range(7)]
    f0, f1, fy = 158, 330, 56
    fala = [(f0 + (f1 - f0) * i / 72, fy + 9 * math.sin(i / 72 * 6 * 2 * math.pi)) for i in range(73)]
    px, pw, py = 338, 66, 16
    wykres = [(px + 8 + i * 5, 50 - 15 * math.sin(i / 9 * math.pi * 2) * math.exp(-i / 16)) for i in range(11)]
    wezel = sx + 76
    return (ziemia() + kreskowanie(50, 160, GY + 1) + kreskowanie(sx, sx + sw + 60, GY + 1, s=.26, e=.44)
            + alt + detal(.38, .54, szczeliny) + zwykla(.46, .56, lapy)
            + rozrusznik + zwykla(.54, .62, zebnik) + detal(.56, .66, zeby) + detal(.5, .62, uzwojenie)
            + os_symetrii(.5, .6, f"M{cx - r - 8} {cy}H{cx + r + 8}M{cx} {cy - r - 8}V{cy + r + 8}")
            + zwykla(.6, .66, L(sx + 54, sy + sh, sx + 54, GY), L(sx + 18, GY, sx + 90, GY))
            + zwykla(.58, .64, C(wezel, sy - 42, 4))
            + nic(.62, .84, linia([(cx + 24, 84), (f0 - 12, fy)] + fala))
            + nic(.74, .82, L(wezel, fy + 6, wezel, sy - 46))
            + glowna(.8, .92, wydruk(px, pw, py, 102), L(px, 102, px + pw, 102))
            + detal(.86, .94, [L(px + 10, 72 + i * 9, px + pw - 10 - (i % 2) * 14, 72 + i * 9) for i in range(3)])
            + nic(.9, 1, P(gladka(wykres)), w=2.4)
            + wymiar(sx, sx + sw, 226, .6, .78))


# Ładowanie: przekrój rozładowanego akumulatora, stan elektrolitu, ogniwa nabierają ładunku jedno po drugim.
def ladowanie():
    x, w, h = 30, 196, 124
    bat, b = bateria(x, GY, w, h, .04, .34, ogniwa=False, korki=False)
    top = GY - h + b["lid"]
    cw = w / 6
    sciany = [L(x + cw * i, top, x + cw * i, GY - 7) for i in range(1, 6)]
    plyty = [L(x + cw * c + 6 + j * (cw - 12) / 3, top + 22, x + cw * c + 6 + j * (cw - 12) / 3, GY - 15) for c in range(6) for j in range(4)]
    poziom = []
    for c in range(6):
        a, e = x + cw * c + 2, x + cw * (c + 1) - 2
        poziom.append(P(f"M{n(a)} {n(top + 13)}Q{n(a + cw * .25)} {n(top + 10)} {n((a + e) / 2)} {n(top + 13)}T{n(e)} {n(top + 13)}"))
    ogniwa = "".join(
        blask(.7 + i * .045, .76 + i * .045, f"M{n(x + cw * i + 2)} {n(top + 15)}H{n(x + cw * (i + 1) - 2)}V{GY - 10}H{n(x + cw * i + 2)}Z", .14)
        for i in range(6))
    cx, cw2, ct = 296, 104, 96
    ladowarka = (glowna(.28, .46, R(cx, ct, cw2, GY - ct, 8))
                 + zwykla(.36, .46, P(f"M{cx + 26} {ct}C{cx + 26} {ct - 16} {cx + cw2 - 26} {ct - 16} {cx + cw2 - 26} {ct}"))
                 + zwykla(.4, .52, R(cx + 12, ct + 14, cw2 - 24, 40, 3))
                 + zwykla(.46, .56, C(cx + 30, ct + 80, 10), C(cx + cw2 - 30, ct + 80, 10))
                 + detal(.5, .6, C(cx + 30, ct + 80, 3), C(cx + cw2 - 30, ct + 80, 3)))
    impulsy = f"M{cx + 20} {ct + 42}" + "h6v-16h6v16" * 5
    return (ziemia() + kreskowanie(x, x + w, GY + 1) + kreskowanie(cx, cx + cw2, GY + 1, s=.28, e=.44)
            + bat + zwykla(.3, .42, sciany) + detal(.36, .54, plyty) + zwykla(.46, .58, poziom)
            + ladowarka
            + kabel_klema(.52, .72, [(cx, ct + 14), (272, 56), (170, 14), (72, 26)], b["minus"], -90, czarny=True)
            + kabel_klema(.56, .76, [(cx, ct + 40), (268, 108), (240, 68)], b["plus"], -40)
            + nic(.74, .84, P(impulsy), w=2.2)
            + ogniwa
            + blask(.94, 1, piorun(x + w / 2, top + 54, 2.2), .92)
            + wymiar(x, x + w, 226, .6, .74))


# Kategorie akumulatorów, na telefonie: pojazd i miejsce, w którym pracuje akumulator.
def kat_samochodowe():
    x0, k = 40, 1.34
    car, q, p = auto(x0, k, .04, .56)
    bl, br, bt, bd = q(72, 0)[0], q(100, 0)[0], q(0, 58)[1], q(0, 34)[1]
    aku = [R(bl, bt, br - bl, bd - bt, 2), L(bl, bt + 8, br, bt + 8), R(bl + 4, bt - 4, 6, 4), R(br - 10, bt - 4, 6, 4)]
    tyl = q(243, 51)
    kabel = gladka([(br, bt + 16), q(130, 42), q(190, 50), tyl])
    przod = gladka([(bl, bt + 16), q(62, 49), q(36, 50)])
    lampa = q(6, 44)
    return (ziemia() + kreskowanie(x0 + 6, x0 + 352, GY + 1) + car
            + nic(.56, .68, aku, w=2.4) + nic(.66, .86, P(kabel)) + nic(.68, .84, P(przod))
            + blask(.84, .92, f"M{n(bl)} {n(bt)}H{n(br)}V{n(bd)}H{n(bl)}Z", .2)
            + nic(.9, 1, promienie(lampa[0] - 2, lampa[1] + 4, 180, dl=20), w=2.4))


def kat_motocyklowe():
    ty, py, r, cy = 100, 306, 40, GY - 40
    rama = [P(gladka([(258, 86), (226, 100), (182, 104), (174, 152)])), P(gladka([(262, 100), (248, 150), (208, 178), (174, 158)]))]
    bak = P("M178 96C178 68 230 60 252 82L248 98C226 104 198 104 178 96Z")
    siodlo = P("M76 86C104 90 150 88 178 92L180 104C150 110 118 110 96 104Z")
    wahacz = [L(174, 150, ty, cy - 3), L(174, 158, ty, cy + 3)]
    widelec = [L(250, 60, py - 4, cy), L(259, 56, py + 4, cy)]
    karter = [C(206, 152, 21), C(206, 152, 7)]
    cylinder = P("M194 136L198 110H232L226 136")
    zebra = [L(198 - i * .7, 115 + i * 5, 231 - i * 1.1, 115 + i * 5) for i in range(4)]
    wydech = [P(gladka([(232, 120), (246, 146), (232, 176), (190, 186)])), P("M190 182L144 180V192L190 190")]
    zebatki = [C(ty, cy, 14), C(190, 168, 7), L(ty, cy - 14, 190, 161), L(ty, cy + 14, 190, 175)]
    bl, bw, bt, bh = 136, 34, 112, 28
    aku = [R(bl, bt, bw, bh, 2), L(bl, bt + 7, bl + bw, bt + 7), R(bl + 4, bt - 4, 6, 4), R(bl + bw - 10, bt - 4, 6, 4)]
    lampa = (282, 76)
    return (ziemia() + kreskowanie(ty - 40, py + 44, GY + 1)
            + kolo(ty, cy, r, .03, .22, szprychy=8, felga=.82) + kolo(py, cy, r, .06, .25, szprychy=8, felga=.82)
            + glowna(.2, .34, wahacz) + glowna(.24, .4, rama) + glowna(.3, .44, widelec)
            + zwykla(.34, .46, karter, cylinder) + detal(.42, .52, zebra, zebatki)
            + glowna(.4, .52, bak) + glowna(.46, .56, siodlo)
            + zwykla(.46, .58, P(f"M{ty - 44} {cy - 18}A47 47 0 0 1 {ty + 4} {cy - 47}"), P(f"M{py - 40} {cy - 26}A47 47 0 0 1 {py + 38} {cy - 28}"))
            + zwykla(.5, .6, wydech)
            + glowna(.54, .62, C(*lampa, 13)) + zwykla(.58, .64, P("M252 60L232 46H212"), L(258, 62, lampa[0] - 12, lampa[1] - 5), L(263, 74, lampa[0] - 13, lampa[1] + 2))
            + nic(.62, .72, aku, w=2.4)
            + nic(.72, .88, P(gladka([(bl + bw, bt + 10), (206, 105), (246, 104), (lampa[0] - 6, lampa[1] + 12)])))
            + blask(.86, .92, f"M{bl} {bt}h{bw}v{bh}h-{bw}Z", .2)
            + blask(.88, .94, f"M{lampa[0] - 9} {lampa[1]}a9 9 0 1 1 18 0a9 9 0 1 1-18 0Z", .28)
            + nic(.9, 1, promienie(lampa[0] + 12, lampa[1], 0, dl=36, ile=5, rozstaw=11), w=2.4))


def kat_rolnicze():
    rx, ry, rr = 296, GY - 62, 62
    fx, fy, fr = 92, GY - 32, 32
    bieznik = []
    for i in range(22):
        a = i / 22 * 2 * math.pi
        bieznik.append(L(rx + (rr - 7) * math.cos(a), ry + (rr - 7) * math.sin(a), rx + rr * math.cos(a + .1), ry + rr * math.sin(a + .1)))
    bieznik2 = []
    for i in range(14):
        a = i / 14 * 2 * math.pi
        bieznik2.append(L(fx + (fr - 5) * math.cos(a), fy + (fr - 5) * math.sin(a), fx + fr * math.cos(a), fy + fr * math.sin(a)))
    maska = P("M46 150V100Q46 88 58 88H214V150H150")
    podwozie = [P(f"M46 150H{fx - 30}"), L(fx + 34, 164, 226, 164), L(214, 150, 214, 164)]
    obciazniki = [R(22, 112, 24, 44, 2)] + [L(22, 120 + i * 9, 46, 120 + i * 9) for i in range(4)]
    kratka = [L(58 + i * 7, 96, 58 + i * 7, 142) for i in range(3)]
    zaluzje = [L(96, 100 + i * 8, 190, 100 + i * 8) for i in range(4)]
    komin = [P("M134 88V40H142V88"), L(130, 40, 146, 40)]
    kabina = [P("M214 112L226 34H338L352 86"), L(218, 30, 346, 30), L(218, 26, 346, 26), L(218, 26, 218, 30), L(346, 26, 346, 30)]
    szyby = [P("M226 42L218 104H266V42Z"), P("M274 42V84H338L330 42Z")]
    bl, bw, bt, bh = 158, 46, 116, 28
    aku = [R(bl, bt, bw, bh, 2), L(bl, bt + 7, bl + bw, bt + 7), R(bl + 5, bt - 4, 6, 4), R(bl + bw - 11, bt - 4, 6, 4)]
    lampa = (214, 40)
    return (ziemia() + kreskowanie(20, 380, GY + 1)
            + kolo(rx, ry, rr, .03, .24, szprychy=6, felga=.58) + detal(.2, .3, bieznik)
            + kolo(fx, fy, fr, .06, .24, szprychy=5, felga=.56) + detal(.2, .3, bieznik2)
            + glowna(.24, .4, maska, podwozie) + zwykla(.34, .44, obciazniki) + zwykla(.38, .46, kratka) + detal(.4, .5, zaluzje)
            + glowna(.4, .52, komin) + glowna(.44, .58, kabina) + zwykla(.54, .62, szyby)
            + zwykla(.52, .62, P(f"M{rx - 76} {ry + 6}A76 76 0 0 1 {rx + 76} {ry + 6}"))
            + zwykla(.58, .64, R(206, 34, 10, 10, 2))
            + nic(.62, .72, aku, w=2.4)
            + nic(.72, .88, P(gladka([(bl + bw, bt + 12), (222, 116), (224, 80), (214, 46)])))
            + blask(.86, .92, f"M{bl} {bt}h{bw}v{bh}h-{bw}Z", .2)
            + nic(.9, 1, promienie(lampa[0] - 8, lampa[1] - 1, 180, dl=26, rozstaw=15), w=2.4))


def kat_prostowniki():
    x, w, t = 122, 176, 62
    obudowa = R(x, t, w, GY - t, 10)
    uchwyt = P(f"M{x + 48} {t}C{x + 48} {t - 26} {x + w - 48} {t - 26} {x + w - 48} {t}")
    ekran = R(x + 18, t + 18, w - 36, 52, 3)
    paski = [f"M{x + 32 + i * 21} {t + 58}v-{12 + i * 5}h14v{12 + i * 5}Z" for i in range(6)]
    obrysy = [P(d) for d in paski]
    przyciski = [C(x + 42 + i * 46, t + 100, 11) for i in range(3)]
    srodki = [C(x + 42 + i * 46, t + 100, 3.4) for i in range(3)]
    szczeliny = [L(x + 22 + i * 12, t + 124, x + 22 + i * 12, t + 134) for i in range(12)]
    wyj_c, wyj_m = (x + w, 178), (x, 178)
    return (ziemia() + kreskowanie(x, x + w, GY + 1)
            + glowna(.04, .26, obudowa) + zwykla(.2, .32, uchwyt) + zwykla(.28, .4, ekran) + detal(.34, .46, obrysy)
            + zwykla(.4, .5, przyciski) + detal(.46, .54, srodki) + detal(.5, .6, szczeliny, dt=True)
            + kabel_klema(.54, .76, [wyj_m, (104, 186), (82, 197)], (22, GY - 6), -4, czarny=True, k=1.05)
            + kabel_klema(.58, .8, [wyj_c, (316, 186), (338, 197)], (398, GY - 6), -176, k=1.05)
            + "".join(blask(.76 + i * .03, .82 + i * .03, d, .9 if i < 5 else .45) for i, d in enumerate(paski))
            + blask(.94, 1, f"M{x + 19} {t + 19}h{w - 38}v50h-{w - 38}Z", .08))


RYSUNKI = {
    "car": kat_samochodowe,
    "motorcycle": kat_motocyklowe,
    "tractor": kat_rolnicze,
    "charger": kat_prostowniki,
    "jumpstart": odpalenie,
    "installation": montaz,
    "testing": test_akumulatora,
    "coding": kodowanie,
    "delivery": transport,
    "continuity": podtrzymanie,
    "alternator": alternator_rozrusznik,
    "charging": ladowanie,
}


def main():
    tu = os.path.dirname(os.path.abspath(__file__))
    cel = os.path.normpath(os.path.join(tu, "..", "..", "public", "akumulatory-tarnow", "assets", "offer-drawings-art.js"))
    dane = {klucz: f() for klucz, f in RYSUNKI.items()}
    with open(cel, "w", encoding="utf-8", newline="\n") as plik:
        plik.write("// Plik generowany przez tools/rysunki/rysunki.py. Nie edytuj ręcznie.\n")
        plik.write("export const drawings = " + json.dumps(dane, ensure_ascii=False, indent=0) + ";\n")
    print(os.path.getsize(cel), {k: v.count("<g ") for k, v in dane.items()})


if __name__ == "__main__":
    main()
