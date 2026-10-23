import os
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

# (regular, bold, italic, bold-italic) - first set that exists on this machine is used
FONT_CANDIDATES = [
    ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf",
     "C:/Windows/Fonts/ariali.ttf", "C:/Windows/Fonts/arialbi.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
     "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
     "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
     "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf"),
    ("/System/Library/Fonts/Supplemental/Arial.ttf",
     "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
     "/System/Library/Fonts/Supplemental/Arial Italic.ttf",
     "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf"),
]

CHAR_FIXES = {
    "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-", "\u2014": "-",
    "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
    "\u00a0": " ", "\u200b": "", "\u2022": "-", "\u25a0": "",
}


def _register_fonts():
    """Register a Unicode TTF family. Returns (font_family_name, unicode_ok)."""
    for regular, bold, italic, bold_italic in FONT_CANDIDATES:
        if all(os.path.exists(p) for p in (regular, bold, italic, bold_italic)):
            pdfmetrics.registerFont(TTFont("ReportBody", regular))
            pdfmetrics.registerFont(TTFont("ReportBody-Bold", bold))
            pdfmetrics.registerFont(TTFont("ReportBody-Italic", italic))
            pdfmetrics.registerFont(TTFont("ReportBody-BoldItalic", bold_italic))
            pdfmetrics.registerFontFamily(
                "ReportBody", normal="ReportBody", bold="ReportBody-Bold",
                italic="ReportBody-Italic", boldItalic="ReportBody-BoldItalic",
            )
            return "ReportBody", True
    return "Helvetica", False  # fallback: limited character set


def _clean(text: str, unicode_ok: bool) -> str:
    # 【Source 2】 -> [Source 2], <https://x> -> https://x
    text = re.sub(r"【\s*(.*?)\s*】", r"[\1]", text)
    text = re.sub(r"<(https?://[^>\s]+)>", r"\1", text)
    for bad, good in CHAR_FIXES.items():
        text = text.replace(bad, good)
    if not unicode_ok:
        text = text.replace("\u2248", "~").replace("\u2192", "->")
        text = text.encode("latin-1", "replace").decode("latin-1")
    return text


def _inline(text: str, unicode_ok: bool) -> str:
    """Markdown inline formatting -> reportlab mini-HTML (escapes first, so it can't break)."""
    text = _clean(text, unicode_ok)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)",
                  r'<link href="\2" color="#1a56db">\1</link>', text)
    text = re.sub(r'(?<!["\'>=])(https?://[^\s<>"\')\]]+)',
                  r'<link href="\1" color="#1a56db">\1</link>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(r"`([^`]+)`", r"<font face='Courier'>\1</font>", text)
    return text


def _para(text, style, unicode_ok):
    try:
        return Paragraph(_inline(text, unicode_ok), style)
    except Exception:
        plain = re.sub(r"<[^>]+>", "", _clean(text, unicode_ok))
        plain = plain.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return Paragraph(plain, style)


def _split_row(line: str):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def _is_separator(cells):
    return all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in cells if c) and any(cells)


def _build_table(rows, width, styles, unicode_ok):
    ncols = len(rows[0])
    # Pad/trim malformed rows so every row matches the header
    rows = [(r + [""] * ncols)[:ncols] for r in rows]

    head_style, cell_style = styles["head"], styles["cell"]
    data = [[_para(c, head_style, unicode_ok) for c in rows[0]]]
    for r in rows[1:]:
        data.append([_para(c, cell_style, unicode_ok) for c in r])

    # Column widths proportional to content length (clamped so none gets tiny or huge)
    weights = [min(max(max(len(r[i]) for r in rows), 8), 55) for i in range(ncols)]
    total = sum(weights)
    col_widths = [width * w / total for w in weights]

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def markdown_to_pdf(markdown_text: str, output_path: str):
    font, unicode_ok = _register_fonts()
    base = getSampleStyleSheet()

    body = ParagraphStyle("Body", parent=base["BodyText"], fontName=font, fontSize=10.5, leading=15, spaceAfter=4)
    title = ParagraphStyle("Title1", parent=body, fontName=font + ("-Bold" if unicode_ok else "-Bold"),
                           fontSize=24, leading=28, spaceAfter=14)
    h1 = ParagraphStyle("H1", parent=title, fontSize=17, leading=21, spaceBefore=14, spaceAfter=8)
    h2 = ParagraphStyle("H2", parent=title, fontSize=13.5, leading=17, spaceBefore=10, spaceAfter=6)
    h3 = ParagraphStyle("H3", parent=title, fontSize=11.5, leading=15, spaceBefore=8, spaceAfter=4)
    bullet = ParagraphStyle("Bullet", parent=body, leftIndent=18, bulletIndent=6)
    cell = ParagraphStyle("Cell", parent=body, fontSize=8.5, leading=11, spaceAfter=0)
    head = ParagraphStyle("Head", parent=cell, fontName=font + "-Bold", textColor=colors.white)
    table_styles = {"cell": cell, "head": head}

    doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=60, leftMargin=60,
                            topMargin=60, bottomMargin=54)
    flow = []
    lines = markdown_text.replace("\r\n", "\n").split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # --- tables: collect consecutive pipe rows ---
        if line.startswith("|"):
            block = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(_split_row(lines[i]))
                i += 1
            rows = [r for r in block if not _is_separator(r)]
            if rows:
                flow.append(_build_table(rows, doc.width, table_styles, unicode_ok))
                flow.append(Spacer(1, 0.15 * inch))
            continue

        i += 1
        if not line:
            flow.append(Spacer(1, 0.06 * inch))
        elif re.fullmatch(r"[-*_]{3,}", line):
            flow.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#d1d5db"),
                                   spaceBefore=6, spaceAfter=6))
        elif line.startswith("#### "):
            flow.append(_para(line[5:], h3, unicode_ok))
        elif line.startswith("### "):
            flow.append(_para(line[4:], h2, unicode_ok))
        elif line.startswith("## "):
            flow.append(_para(line[3:], h1, unicode_ok))
        elif line.startswith("# "):
            flow.append(_para(line[2:], title, unicode_ok))
        elif re.match(r"^[-*\u2022]\s+", line):
            flow.append(Paragraph(_inline(re.sub(r"^[-*\u2022]\s+", "", line), unicode_ok),
                                  bullet, bulletText="\u2022" if unicode_ok else "-"))
        elif re.match(r"^\d+\.\s+", line):
            num = re.match(r"^(\d+)\.", line).group(1)
            flow.append(Paragraph(_inline(re.sub(r"^\d+\.\s+", "", line), unicode_ok),
                                  bullet, bulletText=f"{num}."))
        else:
            flow.append(_para(line, body, unicode_ok))

    doc.build(flow)
    return output_path