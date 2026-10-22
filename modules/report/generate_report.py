#!/usr/bin/env python3
# coding: utf-8
"""Portable PDF report generator for GDPR Analyzer, using ReportLab."""

import json
import os
from datetime import date
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class Bcolors:
    HEADER = "\033[95m"
    CYAN = "\033[36m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    RESET = "\033[0m"
    REVERSE = "\033[;7m"


GRADE_COLORS = {
    "A": colors.HexColor("#d8f3dc"),
    "B": colors.HexColor("#e4f4df"),
    "C": colors.HexColor("#fff0c2"),
    "D": colors.HexColor("#ffe4cc"),
    "E": colors.HexColor("#f8d7da"),
    "F": colors.HexColor("#e0e3e7"),
}


def _display(value):
    """Convert values into readable plain text for PDF cells."""
    if value is None or value == "":
        return "Not available"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
    return str(value)


def _paragraph(value, styles, style_name="TableCell"):
    # Escape site-supplied names, URLs, and certificate fields as XML text.
    text = escape(_display(value)).replace("\r\n", "\n").replace("\n", "<br/>\n")
    return Paragraph(text, styles[style_name])


def _make_table(rows, widths, styles, header=True, small=False, extra_styles=None,
                first_col_label=False):
    """Build a wrapped, repeat-header table from ordinary Python values."""
    cell_style = "TableCellSmall" if small else "TableCell"
    rendered = []
    for row_index, row in enumerate(rows):
        rendered_row = []
        for col_index, value in enumerate(row):
            if header and row_index == 0:
                style_name = "TableHeader"
            elif first_col_label and col_index == 0:
                style_name = "TableLabel"
            else:
                style_name = cell_style
            rendered_row.append(_paragraph(value, styles, style_name))
        rendered.append(rendered_row)

    table = Table(
        rendered,
        colWidths=widths,
        repeatRows=1 if header else 0,
        hAlign="LEFT",
        splitByRow=1,
    )
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d5dae1")),
    ]
    if header:
        commands.extend([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#26364a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ])
        start_row = 1
    else:
        start_row = 0
    for row_index in range(start_row, len(rows)):
        if (row_index - start_row) % 2 == 1:
            commands.append(("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor("#f4f6f8")))
    if first_col_label:
        commands.append(("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#edf0f4")))
    if extra_styles:
        commands.extend(extra_styles)
    table.setStyle(TableStyle(commands))
    return table


def _widths(total_width, weights):
    total = float(sum(weights))
    return [total_width * weight / total for weight in weights]


def _add_heading(story, title, styles, level=1):
    story.append(Paragraph(escape(title), styles["SectionHeading" if level == 1 else "SubsectionHeading"]))
    story.append(Spacer(1, 3))


def _add_score_table(story, grade, score_label, score, width, styles):
    row_styles = []
    grade_text = _display(grade)
    grade_color = GRADE_COLORS.get(str(grade).upper(), colors.HexColor("#e7ebef"))
    grade_text_color = colors.white if str(grade).upper() in GRADE_COLORS else colors.HexColor("#202838")
    row_styles.extend([
        ("BACKGROUND", (0, 1), (0, 1), grade_color),
        ("TEXTCOLOR", (0, 1), (0, 1), grade_text_color),
        ("FONTNAME", (0, 1), (0, 1), "Helvetica-Bold"),
    ])
    table = _make_table(
        [["Grade", score_label], [grade_text, _display(score)]],
        [width * 0.35, width * 0.65], styles, header=True, extra_styles=row_styles,
    )
    story.append(table)
    story.append(Spacer(1, 7))


def _page_footer(client_name):
    # Keep the built-in Helvetica footer safe for Windows-1252 PDF text.
    footer_name = str(client_name or "client").encode("cp1252", "replace").decode("cp1252")

    def draw_footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#d5dae1"))
        canvas.setLineWidth(0.5)
        canvas.line(doc.leftMargin, 14 * mm, A4[0] - doc.rightMargin, 14 * mm)
        canvas.setFont("Helvetica", 7)
        text = "Generate only for personal purpose. Do not publish this report. Generated for {}.".format(footer_name)
        canvas.drawString(doc.leftMargin, 9 * mm, text[:150])
        canvas.drawRightString(A4[0] - doc.rightMargin, 9 * mm, "Page {}".format(doc.page))
        canvas.restoreState()

    return draw_footer


def generate_report(name, result, path):
    """Generate a PDF containing every section represented in the source template."""
    print("{}[-] Generate the report{}".format(Bcolors.RESET, Bcolors.RESET))

    result_dict = json.loads(result) if isinstance(result, (str, bytes, bytearray)) else result
    if not isinstance(result_dict, dict):
        raise ValueError("The report result must be a JSON object or a dictionary.")

    target = result_dict.get("target", "Not available")
    overall_grade = result_dict.get("grade", "Not available")
    cookies = result_dict.get("cookies") if isinstance(result_dict.get("cookies"), dict) else {}
    beacons = result_dict.get("web_beacons") if isinstance(result_dict.get("web_beacons"), dict) else {}
    security = result_dict.get("security_transmission") if isinstance(result_dict.get("security_transmission"), dict) else {}
    generated_date = date.today().strftime("%d/%m/%Y")

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold",
        fontSize=22, leading=26, alignment=TA_CENTER, textColor=colors.HexColor("#26364a"),
        spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="ReportSubtitle", parent=styles["Normal"], fontName="Helvetica",
        fontSize=10, leading=13, alignment=TA_CENTER, textColor=colors.HexColor("#526174"),
        spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="SectionHeading", parent=styles["Heading1"], fontName="Helvetica-Bold",
        fontSize=15, leading=18, textColor=colors.HexColor("#26364a"),
        spaceBefore=13, spaceAfter=6, keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="SubsectionHeading", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=10.5, leading=13, textColor=colors.HexColor("#344b63"),
        spaceBefore=8, spaceAfter=4, keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="ReportBody", parent=styles["BodyText"], fontName="Helvetica",
        fontSize=8.5, leading=11, textColor=colors.HexColor("#202838"),
        spaceAfter=6, splitLongWords=1,
    ))
    styles.add(ParagraphStyle(
        name="TableCell", parent=styles["BodyText"], fontName="Helvetica",
        fontSize=7.2, leading=8.6, textColor=colors.HexColor("#202838"),
        spaceAfter=0, splitLongWords=1,
    ))
    styles.add(ParagraphStyle(
        name="TableCellSmall", parent=styles["BodyText"], fontName="Helvetica",
        fontSize=5.7, leading=6.8, textColor=colors.HexColor("#202838"),
        spaceAfter=0, splitLongWords=1,
    ))
    styles.add(ParagraphStyle(
        name="TableHeader", parent=styles["BodyText"], fontName="Helvetica-Bold",
        fontSize=7, leading=8.2, textColor=colors.white, spaceAfter=0, splitLongWords=1,
    ))
    styles.add(ParagraphStyle(
        name="TableLabel", parent=styles["BodyText"], fontName="Helvetica-Bold",
        fontSize=7.2, leading=8.6, textColor=colors.HexColor("#26364a"),
        spaceAfter=0, splitLongWords=1,
    ))

    output_path = os.fspath(path)
    output_directory = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(output_directory, exist_ok=True)

    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        rightMargin=16 * mm, leftMargin=16 * mm,
        topMargin=15 * mm, bottomMargin=21 * mm,
        title="GDPR Analyzer Report - {}".format(target),
        author="GDPR Analyzer",
    )
    width = doc.width
    story = []

    story.append(Paragraph("gdpr-analyzer", styles["ReportTitle"]))
    story.append(Paragraph("Website analysis report", styles["ReportSubtitle"]))

    metadata = [
        ["Target", target],
        ["Generated", generated_date],
        ["Overall grade", overall_grade],
    ]
    meta_styles = []
    meta_grade_color = GRADE_COLORS.get(str(overall_grade).upper(), colors.HexColor("#edf0f4"))
    meta_grade_text = colors.white if str(overall_grade).upper() in GRADE_COLORS else colors.HexColor("#202838")
    meta_styles.extend([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#edf0f4")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BACKGROUND", (1, 2), (1, 2), meta_grade_color),
        ("TEXTCOLOR", (1, 2), (1, 2), meta_grade_text),
        ("FONTNAME", (1, 2), (1, 2), "Helvetica-Bold"),
    ])
    story.append(_make_table(metadata, [width * 0.26, width * 0.74], styles,
                             header=False, extra_styles=meta_styles, first_col_label=True))
    story.append(Spacer(1, 10))

    _add_heading(story, "Analysis summary", styles)
    summary_rows = [["Analysis", "Grade", "Score"]]
    modules = [
        ("Cookies", cookies, "score"),
        ("Web beacons", beacons, "score"),
        ("Transmission security", security, "note"),
    ]
    for module_name, module_data, score_key in modules:
        if module_data:
            summary_rows.append([
                module_name,
                module_data.get("grade", "Not available"),
                module_data.get(score_key, "Not available"),
            ])
        else:
            summary_rows.append([module_name, "Not analyzed", "Not available"])
    story.append(_make_table(summary_rows, _widths(width, [2.2, 1, 1.1]), styles))
    story.append(Spacer(1, 8))

    # Cookie analysis section.
    if cookies:
        _add_heading(story, "Cookies", styles)
        story.append(Paragraph(
            "This section analyzes cookies placed when the page is visited. The original scoring "
            "criteria consider cookie lifetime and whether a cookie is third-party.", styles["ReportBody"]
        ))
        _add_score_table(story, cookies.get("grade"), "Score", cookies.get("score"), width, styles)
        _add_heading(story, "Cookie details", styles, level=2)
        details = cookies.get("details", {})
        cookie_rows = [["Name", "Domain", "Third party", "HTTP only", "Secure", "Expiry", "Score"]]
        if isinstance(details, dict):
            for cookie_name, detail in details.items():
                detail = detail if isinstance(detail, dict) else {}
                cookie_rows.append([
                    cookie_name, detail.get("domain"), detail.get("third_party"),
                    detail.get("isHttpOnly"), detail.get("isSecure"), detail.get("expiry"),
                    detail.get("cookie_score"),
                ])
        if len(cookie_rows) == 1:
            story.append(Paragraph("No cookies detected.", styles["ReportBody"]))
        else:
            story.append(_make_table(cookie_rows, _widths(width, [1.5, 1.7, 0.85, 0.75, 0.65, 1.2, 0.55]),
                                     styles, small=True))

    # Web-beacon analysis section.
    if beacons:
        _add_heading(story, "Web beacons", styles)
        story.append(Paragraph(
            "Web beacons are small images that can report a visit to another website. The original "
            "criteria consider blacklist presence, small dimensions, position outside the visible page, "
            "and styling that hides the image.", styles["ReportBody"]
        ))
        _add_score_table(story, beacons.get("grade"), "Score", beacons.get("score"), width, styles)
        _add_heading(story, "Detected beacon details", styles, level=2)
        beacon_items = beacons.get("url", [])
        if isinstance(beacon_items, dict):
            beacon_items = list(beacon_items.values())
        if not isinstance(beacon_items, (list, tuple)):
            beacon_items = []
        beacon_rows = [["Target", "URL", "Position", "Hidden", "Size", "Blacklist"]]
        for item in beacon_items:
            item = item if isinstance(item, dict) else {}
            beacon_rows.append([
                item.get("target"), item.get("url"), item.get("position"),
                item.get("hidden"), item.get("size"), item.get("blacklist"),
            ])
        if len(beacon_rows) == 1:
            story.append(Paragraph("No web beacons detected.", styles["ReportBody"]))
        else:
            story.append(_make_table(beacon_rows, _widths(width, [1.15, 3.6, 0.75, 0.65, 0.55, 0.85]),
                                     styles, small=True))
        _add_heading(story, "Detection criteria", styles, level=2)
        criteria = [
            ["Size", "The image is smaller than 3 pixels, making it difficult for a user to notice."],
            ["Position", "The image is placed outside the visible page, using negative left or top positioning."],
            ["Hidden", "The image styling hides its content."],
            ["Blacklist", "The image source appears in the host-block list used by the analyzer."],
        ]
        story.append(_make_table(criteria, [width * 0.22, width * 0.78], styles,
                                 header=False, first_col_label=True))

    # Transport-security section.
    if security:
        _add_heading(story, "Transmission security", styles)
        story.append(Paragraph(
            "This section presents the analyzer's findings about the connection to the server, "
            "including reported protocol versions, certificate properties, key quality, and cipher suites.",
            styles["ReportBody"]
        ))
        _add_score_table(story, security.get("grade"), "Score", security.get("note"), width, styles)

        protocol_data = security.get("protocol", {})
        if not isinstance(protocol_data, dict):
            protocol_data = {}
        _add_heading(story, "Enabled SSL/TLS protocol versions", styles, level=2)
        story.append(Paragraph(
            "Protocol check score: {}".format(escape(_display(protocol_data.get("score")))),
            styles["ReportBody"]
        ))
        protocol_rows = [["Protocol", "Reported state"]]
        protocol_rows.extend(
            [[key, value] for key, value in sorted(protocol_data.items(), key=lambda pair: str(pair[0]).lower())
             if key != "score"]
        )
        if len(protocol_rows) == 1:
            story.append(Paragraph("No protocol-version details were reported.", styles["ReportBody"]))
        else:
            story.append(_make_table(protocol_rows, [width * 0.55, width * 0.45], styles))

        certificate = security.get("certificate", {})
        if not isinstance(certificate, dict):
            certificate = {}
        _add_heading(story, "Certificate", styles, level=2)
        story.append(Paragraph(
            "Certificate score: {}".format(escape(_display(certificate.get("score")))),
            styles["ReportBody"]
        ))
        cert_type = certificate.get("type")
        cert_rows = [
            ["Issued to", certificate.get("issued_to")],
            ["Issued by", certificate.get("issued_by")],
            ["Extended validation", "Yes" if cert_type == "extended-validation" else "No"],
            ["Certificate type", cert_type],
            ["Signature algorithm", certificate.get("sign_algo")],
            ["Valid from", certificate.get("not_before")],
            ["Valid until", certificate.get("not_after")],
        ]
        story.append(_make_table(cert_rows, [width * 0.3, width * 0.7], styles,
                                 header=False, first_col_label=True))

        key_data = security.get("key", {})
        if not isinstance(key_data, dict):
            key_data = {}
        _add_heading(story, "Quality of key", styles, level=2)
        story.append(Paragraph(
            "Key score: {}".format(escape(_display(key_data.get("score")))), styles["ReportBody"]
        ))
        story.append(_make_table([
            ["Size", key_data.get("size")],
            ["Type", key_data.get("type")],
        ], [width * 0.3, width * 0.7], styles, header=False, first_col_label=True))

        cipher_data = security.get("cipher", {})
        if not isinstance(cipher_data, dict):
            cipher_data = {}
        _add_heading(story, "Cipher details", styles, level=2)
        story.append(Paragraph(
            "Cipher score: {}".format(escape(_display(cipher_data.get("score")))), styles["ReportBody"]
        ))
        cipher_headers = [
            "Name", "Security", "Key exchange", "Auth.", "Cipher type",
            "Key size", "Mode", "MAC type", "MAC size",
        ]
        found_cipher_rows = False
        cipher_weights = [2.0, 0.85, 1.25, 0.65, 1.0, 0.55, 0.75, 0.8, 0.45]
        for protocol_name in sorted(cipher_data, key=lambda value: str(value).lower()):
            if protocol_name == "score":
                continue
            suites = cipher_data.get(protocol_name, [])
            if isinstance(suites, dict):
                suites = [suites]
            if not isinstance(suites, (list, tuple)):
                continue
            rows = [cipher_headers]
            security_cells = []
            for suite_group in suites:
                if not isinstance(suite_group, dict):
                    continue
                for cipher_name, info in suite_group.items():
                    info = info if isinstance(info, dict) else {}
                    rows.append([
                        cipher_name, info.get("security"), info.get("key_exch_protocol"),
                        info.get("auth_protocol"), info.get("cipher_type"),
                        info.get("cipher_key_size"), info.get("cipher_mode"),
                        info.get("mac_type"), info.get("mac_size"),
                    ])
                    security_cells.append((len(rows) - 1, str(info.get("security", "")).lower()))
            if len(rows) > 1:
                _add_heading(story, "Protocol: {}".format(protocol_name), styles, level=3)
                extra = []
                for row_index, security_label in security_cells:
                    if security_label == "recommended":
                        extra.append(("BACKGROUND", (1, row_index), (1, row_index), colors.HexColor("#d8f3dc")))
                    elif security_label == "weak":
                        extra.append(("BACKGROUND", (1, row_index), (1, row_index), colors.HexColor("#fff0c2")))
                    elif security_label == "insecure":
                        extra.append(("BACKGROUND", (1, row_index), (1, row_index), colors.HexColor("#f8d7da")))
                story.append(_make_table(rows, _widths(width, cipher_weights), styles,
                                         small=True, extra_styles=extra))
                story.append(Spacer(1, 5))
                found_cipher_rows = True
        if not found_cipher_rows:
            story.append(Paragraph("No cipher-suite details were reported.", styles["ReportBody"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Important: this report reflects only the checks implemented by this tool and the data "
        "available during the scan. It is not a comprehensive legal determination of GDPR compliance.",
        styles["ReportBody"]
    ))

    doc.build(story, onFirstPage=_page_footer(name), onLaterPages=_page_footer(name))
    print("{}[-] Report generated, it is stored in {}{}".format(Bcolors.GREEN, output_path, Bcolors.RESET))
