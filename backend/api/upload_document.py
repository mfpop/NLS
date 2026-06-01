"""Upload and parse documents (PDF, DOCX, TXT, HTML) for use in the rich text editor.

Supported formats:
  - PDF  → Extracted text wrapped in paragraphs
  - DOCX → Extracted paragraphs, tables, headings as HTML
  - TXT  → Plain text wrapped in paragraphs
  - HTML → Pass-through (stored as-is)
"""

import logging
import uuid
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".htm", ".html"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _save_extracted_image(blob: bytes, ext: str, source_docx_stem: str) -> str:
    """Save an image extracted from a DOCX file and return its public URL."""
    unique_name = f"docx_img_{source_docx_stem}_{uuid.uuid4().hex[:12]}{ext}"
    relative_dir = "editor-images"
    upload_dir = Path(settings.MEDIA_ROOT) / relative_dir
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / unique_name
    with open(str(file_path), "wb") as f:
        f.write(blob)
    return f"{settings.MEDIA_URL}{relative_dir}/{unique_name}"


_ASSET_CONTENT_TYPE_EXT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
}


def _extract_docx_images(doc, docx_stem: str) -> dict[str, str]:
    """Extract all images from a DOCX and return a dict of rId -> public URL."""
    from docx.parts.image import ImagePart

    image_map: dict[str, str] = {}
    for rel_id, rel in doc.part.related_parts.items():
        if not isinstance(rel, ImagePart):
            continue
        content_type = rel.content_type or ""
        ext = _ASSET_CONTENT_TYPE_EXT.get(content_type, ".png")
        url = _save_extracted_image(rel.blob, ext, docx_stem)
        image_map[rel_id] = url
    return image_map


def _get_image_url_from_drawing(drawing_elem, image_map: dict[str, str] | None) -> str | None:
    """Extract the image URL from a <w:drawing> element, if possible."""
    from docx.oxml.ns import qn

    if not image_map:
        return None

    # Look for wp:inline or wp:anchor
    inline = drawing_elem.find(qn("wp:inline"))
    if inline is None:
        inline = drawing_elem.find(qn("wp:anchor"))
    if inline is None:
        return None

    # Find the a:blip element which holds the relationship reference
    blip = inline.find(f".//{qn('a:blip')}")
    if blip is None:
        return None

    embed_attr = blip.get(qn("r:embed"))
    if embed_attr and embed_attr in image_map:
        return image_map[embed_attr]

    return None


def _extract_text_pdf(file_path: str) -> str:
    """Extract text from a PDF using pdfplumber, preserving paragraphs.""" ""
    import pdfplumber

    paragraphs: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            # Split on double newlines to approximate paragraph boundaries
            blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
            paragraphs.extend(blocks)
    # Rejoin with <p> tags for basic HTML structure
    return "\n".join(f"<p>{_escape_html(p)}</p>" for p in paragraphs)


def _extract_text_docx(file_path: str) -> str:
    """Extract content from a DOCX as HTML, preserving paragraphs, headings, lists, tables, and images."""
    from docx import Document
    from docx.oxml.ns import qn

    doc = Document(file_path)
    docx_stem = Path(file_path).stem
    image_map = _extract_docx_images(doc, docx_stem)
    parts: list[str] = []

    for element in doc.element.body:
        tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag

        if tag == "p":
            para = _read_paragraph(element, image_map)
            if para is not None:
                parts.append(para)

        elif tag == "tbl":
            parts.append(_read_table_docx(element, image_map))

    return "\n".join(parts)


def _read_paragraph(para_elem, image_map: dict[str, str] | None = None) -> str | None:
    """Convert a single docx paragraph element to an HTML string.

    Handles both text runs (with bold / italic / underline) and
    embedded image runs (<w:drawing> elements).
    """
    from docx.oxml.ns import qn

    parts: list[str] = []

    for run in para_elem.iter(qn("w:r")):
        # Check for embedded image in this run
        drawing = run.find(qn("w:drawing"))
        if drawing is not None:
            img_url = _get_image_url_from_drawing(drawing, image_map)
            if img_url:
                parts.append(f'<img src="{img_url}" alt="" style="max-width:100%">')
            continue

        # Regular text run
        rpr = run.find(qn("w:rPr"))
        is_bold = False
        is_italic = False
        underline = False
        if rpr is not None:
            is_bold = rpr.find(qn("w:b")) is not None
            is_italic = rpr.find(qn("w:i")) is not None
            underline = rpr.find(qn("w:u")) is not None

        t_elem = run.find(qn("w:t"))
        if t_elem is not None and t_elem.text:
            text = _escape_html(t_elem.text)
            if is_bold:
                text = f"<strong>{text}</strong>"
            if is_italic:
                text = f"<em>{text}</em>"
            if underline:
                text = f"<u>{text}</u>"
            parts.append(text)

    full_text = "".join(parts).strip()
    if not full_text:
        return None

    # Detect heading style from paragraph properties
    ppr = para_elem.find(qn("w:pPr"))
    style_elem = ppr.find(qn("w:pStyle")) if ppr is not None else None
    if style_elem is not None:
        style_val = style_elem.get(qn("w:val"), "")
        if style_val.startswith("Heading"):
            level = style_val.replace("Heading", "")
            if level.isdigit() and 1 <= int(level) <= 3:
                return f"<h{level}>{full_text}</h{level}>"

    return f"<p>{full_text}</p>"


def _read_table_docx(table_elem, image_map: dict[str, str] | None = None) -> str:
    """Convert a docx table element to an HTML table string."""
    from docx.oxml.ns import qn

    rows: list[str] = []
    is_header = True

    for row in table_elem.iter(qn("w:tr")):
        cells: list[str] = []
        for cell in row.iter(qn("w:tc")):
            cell_texts: list[str] = []
            for p in cell.iter(qn("w:p")):
                para = _read_paragraph(p, image_map)
                if para:
                    # Strip <p> and </p> tags for cell content
                    content = para[3:-4] if para.startswith("<p>") else para
                    cell_texts.append(content)

            tag = "th" if is_header else "td"
            cells.append(f"    <{tag}>{''.join(cell_texts)}</{tag}>")

        if cells:
            rows.append(f"  <tr>\n{chr(10).join(cells)}\n  </tr>")
            is_header = False

    return "<table>\n" + "\n".join(rows) + "\n</table>"


def _extract_text_txt(file_path: str) -> str:
    """Wrap plain text in paragraph tags.""" ""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        # Fallback: treat each line as a paragraph
        paragraphs = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(f"<p>{_escape_html(p)}</p>" for p in paragraphs)


def _extract_text_html(file_path: str) -> str:
    """Read HTML file, pass through as-is (strip BOM / null bytes).""" ""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    # Strip BOM and null bytes
    content = content.lstrip("\ufeff").replace("\x00", "")
    return content


def _escape_html(text: str) -> str:
    """Escape HTML special characters."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


_EXTRACTORS = {
    ".pdf": _extract_text_pdf,
    ".docx": _extract_text_docx,
    ".txt": _extract_text_txt,
    ".htm": _extract_text_html,
    ".html": _extract_text_html,
}


@csrf_exempt
@require_http_methods(["POST"])
def upload_document(request):
    """Upload and parse a document for use in the rich text editor.

    Accepts multipart form with:
      - file: Document file (pdf, docx, txt, htm, html)

    Returns JSON with ``ok``, ``html``, ``file_name`` or ``ok``, ``code``, ``message``.
    The ``html`` field contains the extracted content as HTML that can be
    inserted directly into the rich text editor.
    """
    if "file" not in request.FILES:
        return JsonResponse(
            {"ok": False, "code": "FILE_REQUIRED", "message": "No file uploaded"},
            status=400,
        )

    uploaded = request.FILES["file"]
    ext = Path(uploaded.name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        return JsonResponse(
            {
                "ok": False,
                "code": "INVALID_TYPE",
                "message": (
                    f"File type '{ext}' is not allowed. "
                    f"Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
                ),
            },
            status=400,
        )

    if uploaded.size > MAX_FILE_SIZE:
        return JsonResponse(
            {
                "ok": False,
                "code": "FILE_TOO_LARGE",
                "message": f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB",
            },
            status=413,
        )

    # Save uploaded file to a temp location
    safe_stem = Path(uploaded.name).stem
    safe_stem = "".join(c for c in safe_stem if c.isalnum() or c in "-_.")
    unique_name = f"{safe_stem}_{uuid.uuid4().hex[:12]}{ext}"
    temp_dir = Path(settings.MEDIA_ROOT) / "temp-docs"
    try:
        temp_dir.mkdir(parents=True, exist_ok=True)
        file_path = temp_dir / unique_name
        with open(str(file_path), "wb") as f:
            for chunk in uploaded.chunks():
                f.write(chunk)
    except Exception as exc:
        logger.exception("Failed to save uploaded document")
        return JsonResponse(
            {"ok": False, "code": "STORAGE_SAVE_FAILED", "message": f"Failed to save document: {exc}"},
            status=500,
        )

    # Parse the document
    extractor = _EXTRACTORS.get(ext)
    if not extractor:
        return JsonResponse(
            {"ok": False, "code": "NO_EXTRACTOR", "message": f"No parser available for '{ext}'"},
            status=400,
        )

    try:
        html_content = extractor(str(file_path))
    except Exception as exc:
        logger.exception("Failed to parse uploaded document")
        return JsonResponse(
            {"ok": False, "code": "PARSE_FAILED", "message": f"Failed to parse document: {exc}"},
            status=422,
        )
    finally:
        # Clean up temp file
        try:
            file_path.unlink(missing_ok=True)
        except Exception:
            pass

    # Clean up the temp directory if empty
    try:
        if not any(temp_dir.iterdir()):
            temp_dir.rmdir()
    except Exception:
        pass

    logger.info(
        "Document uploaded: %s -> %d chars extracted",
        uploaded.name,
        len(html_content),
    )

    return JsonResponse({
        "ok": True,
        "html": html_content,
        "file_name": uploaded.name,
        "file_size": uploaded.size,
    })
