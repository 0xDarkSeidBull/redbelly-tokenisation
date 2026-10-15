#!/usr/bin/env python3
"""Builds the script document as PDF from content/script.json and the voiceover timeline.
Writes out/docs/tokenisation-explainer-script.pdf"""
import datetime, json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parent.parent
INK, MUTED, LINE, MINT = colors.HexColor("#343740"), colors.HexColor("#5e6270"), colors.HexColor("#bdc1cb"), colors.HexColor("#d8fee5")
for n in ("Regular", "Medium", "SemiBold", "Bold"):
    pdfmetrics.registerFont(TTFont(f"M-{n}", str(ROOT / f"assets/fonts/Montserrat-{n}.ttf")))

st = lambda name, font, size, lead, color=INK, **k: ParagraphStyle(name, fontName=font, fontSize=size, leading=lead, textColor=color, **k)
TITLE, H, BODY = st("t", "M-Bold", 24, 29), st("h", "M-SemiBold", 13, 17, spaceBefore=14, spaceAfter=6), st("b", "M-Regular", 9.5, 13.5)
SMALL, CELL, CELLB = st("s", "M-Regular", 8.5, 12, MUTED), st("c", "M-Regular", 8.6, 12), st("cb", "M-SemiBold", 8.6, 12)

def P(text, style=BODY):
    return Paragraph(escape(text).replace("\n", "<br/>"), style)

def mmss(t):
    return f"{int(t // 60)}:{int(t % 60):02d}"

def table(rows, widths, head=True):
    t = Table(rows, colWidths=widths, repeatRows=1 if head else 0)
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.5, LINE),
             ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
             ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]
    if head:
        style.append(("BACKGROUND", (0, 0), (-1, 0), MINT))
    t.setStyle(TableStyle(style)); return t

def build(out):
    S = json.loads((ROOT / "content/script.json").read_text(encoding="utf-8"))
    TL = json.loads((ROOT / "out/voice/timeline.json").read_text(encoding="utf-8"))
    man = json.loads((ROOT / "evidence/manifest.json").read_text(encoding="utf-8"))["pages"]
    m = S["meta"]; verified = datetime.date.fromisoformat(m["last_verified"]).strftime("%-d %b %Y")
    W = A4[0] - 36 * mm
    story = [P(m["title"], TITLE), Spacer(1, 4), P(m["subtitle"] + ".", st("sub", "M-Medium", 11.5, 16, MUTED)), Spacer(1, 10)]
    facts = [("Task", m["task"] + ", Tokenisation Explainer Animation"), ("Asset", m["asset"]),
             ("Length", f"{mmss(TL['total_seconds'])} ({TL['total_seconds']:.1f} seconds)"),
             ("Video", f"{S['video']['width']} x {S['video']['height']}, {S['video']['fps']} fps, H.264 MP4, subtitles burned in, plus SRT and WebVTT files"),
             ("Voice", f"Synthetic voice, {S['voice']['engine']}, voice {S['voice']['voice']}"),
             ("Script version", m["version"]), ("Last verified", f"{verified}, every quote checked against a snapshot of its source page")]
    story.append(table([[P(a, CELLB), P(b, CELL)] for a, b in facts], [32 * mm, W - 32 * mm], head=False))
    story += [P("How to read this document", H),
              P("Section 1 is the script as it plays: the voiceover word for word and the text shown on screen. "
                "Section 2 lists every factual claim, the source page it comes from and the exact words on that page. "
                "Section 3 lists the source pages with the time each snapshot was taken and its SHA-256.")]
    story.append(P("1. Script", H))
    rows = [[P("Time", CELLB), P("Voiceover", CELLB), P("On screen", CELLB)]]
    for sc, tl in zip(S["scenes"], TL["scenes"]):
        rows.append([P(f"{mmss(tl['start'])} to {mmss(tl['end'])}\n{sc['name']}", CELL), P(" ".join(sc["vo"]), CELL), P("\n".join(sc["on_screen"]) + (("\nIn the illustrations: " + ", ".join(dict.fromkeys(sc["ui_text"].values()))) if sc.get("ui_text") else ""), CELL)])
    story.append(table(rows, [30 * mm, (W - 30 * mm) * 0.56, (W - 30 * mm) * 0.44]))
    g = S["globals"]["tracker"]
    story.append(Spacer(1, 6))
    story.append(P(f"Stage tracker, shown in scenes {', '.join(x[1:].lstrip('0') for x in g['shown_in'])}: " + ", ".join(f"{i} {l}" for i, l in enumerate(g["labels"], 1)) + ". The current stage is highlighted.", SMALL))
    story.append(P("2. Fact check", H))
    rows = [[P("#", CELLB), P("Script says", CELLB), P("Source", CELLB), P("Exact words on the source page", CELLB)]]
    k = 0
    for sc in S["scenes"]:
        for c in sc["claims"]:
            k += 1; src = S["sources"][c["source"]]
            rows.append([P(str(k), CELL), P(c["covers"], CELL), P(src["title"] + "\n" + src["url"], SMALL), P('"' + c["quote"] + '"', CELL)])
    story.append(table(rows, [8 * mm, 42 * mm, 52 * mm, W - 102 * mm]))
    story.append(P("3. Sources", H))
    rows = [[P("Source", CELLB), P("Snapshot", CELLB)]]
    for sid, src in S["sources"].items():
        r = man[src["evidence"]]
        rows.append([P(src["title"] + "\n" + src["url"], CELL), P(f"Captured {r['captured_utc']}\n{r['file']}\nSHA-256 {r['sha256']}", SMALL)])
    story.append(table(rows, [W * 0.45, W * 0.55]))
    story.append(P("4. Assets and licences", H))
    lic = [("Voice", "Kokoro-82M, voice af_heart. Apache License 2.0, commercial use allowed."),
           ("Font", "Montserrat. SIL Open Font License 1.1."),
           ("Music", "Made for this video from code. No third party audio."),
           ("Icons and animation", "Designed for this video with Claude Design and rendered frame by frame. No stock footage or stock icons."),
           ("Logos", "Tokeniser logo from tokeniser.com. Redbelly logo from the Redbelly brand kit.")]
    story.append(table([[P(a, CELLB), P(b, CELL)] for a, b in lic], [40 * mm, W - 40 * mm], head=False))
    def footer(cv, doc):
        cv.saveState(); cv.setFont("M-Regular", 8); cv.setFillColor(MUTED)
        cv.drawString(18 * mm, 10 * mm, f"{m['title']}, script version {m['version']}. Last verified {verified}.")
        cv.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}"); cv.restoreState()
    doc = SimpleDocTemplate(str(out), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm,
                            title=f"{m['title']}: script", author="", subject=m["subtitle"], creator="", producer="")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

if __name__ == "__main__":
    out = ROOT / "out/docs"; out.mkdir(parents=True, exist_ok=True)
    build(out / "tokenisation-explainer-script.pdf"); print("pdf written")
