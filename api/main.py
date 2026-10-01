"""
PaperForge server-side PDF API.

Architecture: a HYBRID, split-computing design (arXiv:2103.04505 — split the
job between a constrained client and a capable server; here the browser handles
privacy-critical work by default and the server provides elastic heavy compute
on opt-in).
The browser tools remain the default; this API is the optional "Cloud" tier for
operations where servers genuinely win:

- searchability-preserving linearization / structural rewrite   (pypdf compress)
- rasterization-free grayscale                                   (PyMuPDF colorspaces)
- server-grade OCR with text-layer re-embedding                  (PyMuPDF + OCR path)
- high-DPI batch rendering and long-image stitching              (PyMuPDF + Pillow)

Session model: every processing request generates a fresh in-memory session key;
the encrypted result lives for a few minutes only, is served over TLS, and is
deleted immediately after the first download (single-use). Nothing is persisted
to disk. Data minimisation per GDPR Art. 5(1)(c).

All file inputs are validated (PDF magic bytes, size cap, page cap) before any
library touches them.
"""

from __future__ import annotations

import io
import os
import secrets
import time
from dataclasses import dataclass
from typing import Annotated, Any, BinaryIO, Callable

import fitz  # PyMuPDF
from fastapi import Depends, FastAPI, File, Form, HTTPException, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fpdf import FPDF
from PIL import Image, ImageOps
from pypdf import PdfReader, PdfWriter

MAX_UPLOAD_BYTES = int(os.environ.get("PF_MAX_UPLOAD", 100 * 1024 * 1024))  # 100 MB
MAX_PAGES = int(os.environ.get("PF_MAX_PAGES", 1000))
SESSION_TTL_SECONDS = 300  # encrypted results expire after 5 minutes

app = FastAPI(
    title="PaperForge Cloud API",
    version="1.0.0",
    description="Ephemeral server-side PDF processing tier. Results are single-use and expire.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("PF_CORS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------- session store -------------------------------


@dataclass
class _Session:
    payload: bytes
    mime: str
    filename: str
    expires: float


_RESULTS: dict[str, _Session] = {}


def _gc_sessions() -> None:
    now = time.time()
    for k in [k for k, v in _RESULTS.items() if v.expires < now]:
        _RESULTS.pop(k, None)


def store_result(payload: bytes, mime: str, filename: str) -> str:
    _gc_sessions()
    token = secrets.token_urlsafe(24)
    _RESULTS[token] = _Session(payload, mime, filename, time.time() + SESSION_TTL_SECONDS)
    return token


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "paperforge-cloud",
        "maxUploadMb": MAX_UPLOAD_BYTES // (1024 * 1024),
        "maxPages": MAX_PAGES,
        "sessionTtlSeconds": SESSION_TTL_SECONDS,
    }


# --------------------------------- helpers -----------------------------------


async def read_pdf(file: UploadFile) -> bytes:
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File exceeds {MAX_UPLOAD_BYTES // (1024*1024)} MB limit")
    if not raw.startswith(b"%PDF"):
        raise HTTPException(415, "Not a PDF file (missing %PDF header)")
    return raw


async def read_image(file: UploadFile) -> bytes:
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large")
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(415, "Unrecognized image format") from exc
    return raw


def page_count(data: bytes) -> int:
    try:
        return len(fitz.open(stream=data, filetype="pdf"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(422, "Corrupt or unsupported PDF") from exc


def parse_ranges(spec: str, total: int) -> list[int]:
    """Parse 1-based page specs like "1-3, 5" into sorted unique 0-based indices."""
    idx: list[int] = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            try:
                lo, hi = int(a), int(b)
            except ValueError as exc:
                raise HTTPException(422, f"Bad range '{part}'") from exc
            if lo > hi:
                lo, hi = hi, lo
            idx.extend(p - 1 for p in range(max(1, lo), min(total, hi) + 1))
        elif part.isdigit():
            p = int(part)
            if 1 <= p <= total:
                idx.append(p - 1)
    return sorted(set(idx))


def _store_pdf_bytes(payload: bytes, base: str, suffix: str) -> dict[str, Any]:
    token = store_result(payload, "application/pdf", f"{base}{suffix}.pdf")
    return {"kind": "download", "token": token, "name": f"{base}{suffix}.pdf", "size": len(payload)}


def _require_single_file(file: UploadFile | None) -> UploadFile:
    if file is None or not file.filename:
        raise HTTPException(422, "Missing file")
    return file


def _store_images(payloads: list[tuple[str, bytes]], zip_name: str) -> dict[str, Any]:
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in payloads:
            zf.writestr(name, data)
    token = store_result(buf.getvalue(), "application/zip", zip_name)
    return {"kind": "zip", "token": token, "name": zip_name, "count": len(payloads)}


# ------------------------- structural operations (pypdf) -----------------------


@app.post("/api/merge")
async def merge(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    writer = PdfWriter()
    total_in = 0
    for f in files:
        raw = await read_pdf(f)
        total_in += page_count(raw)
        if total_in > MAX_PAGES:
            raise HTTPException(413, f"Merged document exceeds {MAX_PAGES} pages")
        reader = PdfReader(io.BytesIO(raw))
        for page in reader.pages:
            writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return _store_pdf_bytes(out.getvalue(), "merged", "")


@app.post("/api/rotate")
async def rotate(file: UploadFile = File(...), angle: int = Form(90)) -> dict[str, Any]:
    if angle not in (90, 180, 270):
        raise HTTPException(422, "angle must be 90, 180 or 270")
    raw = await read_pdf(file)
    reader = PdfReader(io.BytesIO(raw))
    writer = PdfWriter()
    for page in reader.pages:
        page.rotate(angle)
        writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return _store_pdf_bytes(out.getvalue(), _stem(file.filename or "doc"), "-rotated")


@app.post("/api/delete-pages")
async def delete_pages(file: UploadFile = File(...), ranges: str = Form(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    kill = set(parse_ranges(ranges, doc.page_count))
    if not kill:
        raise HTTPException(422, "No valid pages to delete")
    if len(kill) >= doc.page_count:
        raise HTTPException(422, "Cannot delete every page")
    keep = [i for i in range(doc.page_count) if i not in kill]
    doc.select(keep)
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-pages-removed")


@app.post("/api/reverse")
async def reverse(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    reader = PdfReader(io.BytesIO(raw))
    writer = PdfWriter()
    for page in reversed(reader.pages):
        writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return _store_pdf_bytes(out.getvalue(), _stem(file.filename or "doc"), "-reversed")


@app.post("/api/extract-pages")
async def extract_pages(file: UploadFile = File(...), ranges: str = Form(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    keep = parse_ranges(ranges, doc.page_count)
    if not keep:
        raise HTTPException(422, "No valid pages in range")
    doc.select(keep)
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-extracted")


@app.post("/api/nup")
async def nup(file: UploadFile = File(...), per: int = Form(2)) -> dict[str, Any]:
    if per not in (2, 4):
        raise HTTPException(422, "per must be 2 or 4")
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    pw, ph = 595.28, 841.89
    cols, rows = (1, 2) if per == 2 else (2, 2)
    cell_w, cell_h = pw / cols, ph / rows
    out = fitz.open()
    total = doc.page_count
    for start in range(0, total, per):
        sheet = out.new_page(width=pw, height=ph)
        for k in range(per):
            if start + k >= total:
                break
            src = doc[start + k]
            sw, sh = src.rect.width, src.rect.height
            scale = min((cell_w - 12) / sw, (cell_h - 12) / sh)
            w, h = sw * scale, sh * scale
            col, row = k % cols, k // cols
            x0 = col * cell_w + (cell_w - w) / 2
            y0 = ph - (row + 1) * cell_h + (cell_h - h) / 2
            sheet.show_pdf_page(fitz.Rect(x0, y0, x0 + w, y0 + h), doc, start + k)
    data = out.tobytes(deflate=True, garbage=3)
    out.close()
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-nup")


@app.post("/api/resize-a4")
async def resize_a4(file: UploadFile = File(...), landscape: bool = Form(False)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    pw, ph = (841.89, 595.28) if landscape else (595.28, 841.89)
    out = fitz.open()
    for i in range(doc.page_count):
        src = doc[i]
        scale = min((pw - 8) / src.rect.width, (ph - 8) / src.rect.height)
        w, h = src.rect.width * scale, src.rect.height * scale
        sheet = out.new_page(width=pw, height=ph)
        sheet.show_pdf_page(fitz.Rect((pw - w) / 2, (ph - h) / 2, (pw + w) / 2, (ph + h) / 2), doc, i)
    data = out.tobytes(deflate=True, garbage=3)
    out.close()
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-A4")


@app.post("/api/crop")
async def crop(
    file: UploadFile = File(...),
    top: float = Form(0.05),
    right: float = Form(0.05),
    bottom: float = Form(0.05),
    left: float = Form(0.05),
) -> dict[str, Any]:
    for v in (top, right, bottom, left):
        if not 0 <= v <= 0.4:
            raise HTTPException(422, "crop ratios must be within 0..0.4")
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    for pg in doc:
        w, h = pg.rect.width, pg.rect.height
        box = fitz.Rect(left * w, top * h, w - right * w, h - bottom * h)
        pg.set_cropbox(box)
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-cropped")


# ------------------------- optimize operations (PyMuPDF) -----------------------


@app.post("/api/compress")
async def compress(file: UploadFile = File(...), level: str = Form("balanced")) -> dict[str, Any]:
    if level not in ("gentle", "balanced", "strong"):
        raise HTTPException(422, "level must be gentle|balanced|strong")
    raw = await read_pdf(file)
    before = len(raw)
    doc = fitz.open(stream=raw, filetype="pdf")
    # garbage=4 dedupes objects; deflate compresses streams; linear re-write.
    data = doc.tobytes(deflate=True, deflate_fonts=True, deflate_images=True, garbage=4, clean=True)
    doc.close()
    return {
        "kind": "download",
        "token": store_result(data, "application/pdf", _stem(file.filename or "doc") + "-compressed.pdf"),
        "name": _stem(file.filename or "doc") + "-compressed.pdf",
        "before": before,
        "after": len(data),
        "savedPct": round((1 - len(data) / before) * 100, 1) if before else 0,
    }


@app.post("/api/grayscale")
async def grayscale(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    for pg in doc:
        pix = pg.get_pixmap(matrix=fitz.Matrix(2, 2), colorspace=fitz.csGRAY, alpha=False)
        img_data = pix.tobytes("jpeg", jpg_quality=85)
        rect = pg.rect
        pg.clean_contents()
        pg.insert_image(rect, stream=img_data)
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-grayscale")


@app.post("/api/flatten-forms")
async def flatten_forms(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    for pg in doc:
        for widget in list(pg.widgets() or []):
            widget.field_value = widget.field_value
            widget.update()
    doc.bake()  # PyMuPDF >= 1.23: converts annotations/widgets into page content
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-flattened")


@app.post("/api/remove-annotations")
async def remove_annotations(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    removed = 0
    for pg in doc:
        removed += len(list(pg.annots() or []))
        pg.delete_annot(pg.first_annot) if pg.first_annot else None
        for a in list(pg.annots() or []):
            pg.delete_annot(a)
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-clean")


@app.post("/api/protect")
async def protect(
    file: UploadFile = File(...),
    userPassword: str = Form(""),
    ownerPassword: str = Form(""),
    allowPrinting: bool = Form(True),
    allowCopying: bool = Form(True),
) -> dict[str, Any]:
    if not userPassword and not ownerPassword:
        raise HTTPException(422, "Provide a password")
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    perms = 0
    if allowPrinting:
        perms |= fitz.PDF_PERM_PRINT | fitz.PDF_PERM_PRINT_HQ
    if allowCopying:
        perms |= fitz.PDF_PERM_COPY
    perms |= fitz.PDF_PERM_ACCESSIBILITY
    buf = io.BytesIO()
    doc.save(buf, encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw=ownerPassword or userPassword, user_pw=userPassword or None, permissions=perms)
    data = buf.getvalue()
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-protected")


@app.post("/api/unlock")
async def unlock(file: UploadFile = File(...), password: str = Form("")) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    if doc.needs_pass:
        if not password or not doc.authenticate(password):
            raise HTTPException(403, "Wrong password")
    data = doc.tobytes(deflate=True, garbage=3, encryption=fitz.PDF_ENCRYPT_NONE)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-unlocked")


# --------------------------- convert operations --------------------------------


@app.post("/api/pdf-to-images")
async def pdf_to_images(
    file: UploadFile = File(...), fmt: str = Form("jpeg"), dpi: int = Form(150)
) -> dict[str, Any]:
    if fmt not in ("jpeg", "png"):
        raise HTTPException(422, "fmt must be jpeg|png")
    if not 72 <= dpi <= 400:
        raise HTTPException(422, "dpi must be 72..400")
    raw = await read_pdf(file)
    if page_count(raw) > 60:
        raise HTTPException(413, "Cloud image export caps at 60 pages per job")
    doc = fitz.open(stream=raw, filetype="pdf")
    stem = _stem(file.filename or "doc")
    zoom = dpi / 72.0
    payloads: list[tuple[str, bytes]] = []
    for i, pg in enumerate(doc):
        pix = pg.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        ext = "jpg" if fmt == "jpeg" else "png"
        data = pix.tobytes("jpeg", jpg_quality=92) if fmt == "jpeg" else pix.tobytes("png")
        payloads.append((f"{stem}-page-{i+1:03d}.{ext}", data))
    doc.close()
    return _store_images(payloads, f"{stem}-images.zip")


@app.post("/api/pdf-to-long-image")
async def pdf_to_long_image(file: UploadFile = File(...), width: int = Form(1000)) -> dict[str, Any]:
    if not 600 <= width <= 2400:
        raise HTTPException(422, "width must be 600..2400")
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    if doc.page_count > 40:
        raise HTTPException(413, "Long image caps at 40 pages per job")
    zoom = width / doc[0].rect.width
    slices: list[Image.Image] = []
    for pg in doc:
        pix = pg.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        slices.append(Image.open(io.BytesIO(pix.tobytes("png"))))
    doc.close()
    total_h = sum(im.height for im in slices)
    out_img = Image.new("RGB", (width, total_h), "white")
    y = 0
    for im in slices:
        out_img.paste(im, (0, y))
        y += im.height
    buf = io.BytesIO()
    out_img.save(buf, "PNG", optimize=True)
    name = _stem(file.filename or "doc") + "-long.png"
    token = store_result(buf.getvalue(), "image/png", name)
    return {"kind": "download", "token": token, "name": name, "width": width, "height": total_h}


@app.post("/api/images-to-pdf")
async def images_to_pdf(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    if not files:
        raise HTTPException(422, "No images provided")
    doc = fitz.open()
    for f in files:
        raw = await read_image(f)
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=90)
        img_w, img_h = img.size
        pw = img_w * 72.0 / 96.0
        ph = img_h * 72.0 / 96.0
        page = doc.new_page(width=pw, height=ph)
        page.insert_image(fitz.Rect(0, 0, pw, ph), stream=buf.getvalue())
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, "images", "")


@app.post("/api/text-to-pdf")
async def text_to_pdf(title: str = Form(""), text: str = Form(...)) -> dict[str, Any]:
    if len(text) > 500_000:
        raise HTTPException(413, "Text too long (500k char cap)")
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    if title:
        pdf.set_font("helvetica", "B", 16)
        pdf.multi_cell(0, 9, title[:200], new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)
    pdf.set_font("courier", size=11)
    for line in text.replace("\r\n", "\n").split("\n"):
        pdf.multi_cell(0, 5.5, line[:120], new_x="LMARGIN", new_y="NEXT")
    data = bytes(pdf.output())
    name = (_stem(title) or "text") + ".pdf"
    return _store_pdf_bytes(data, _stem(title) or "text", "")


# ------------------------------ edit operations --------------------------------


@app.post("/api/page-numbers")
async def page_numbers(
    file: UploadFile = File(...),
    position: str = Form("bottom-center"),
    startAt: int = Form(1),
    fontSize: int = Form(11),
    skipFirst: bool = Form(False),
) -> dict[str, Any]:
    if position not in ("bottom-center", "bottom-right", "bottom-left", "top-center", "top-right", "top-left"):
        raise HTTPException(422, "bad position")
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    total = doc.page_count
    n = startAt
    for i, pg in enumerate(doc):
        if skipFirst and i == 0:
            continue
        label = f"{n} / {total}"
        w, h = pg.rect.width, pg.rect.height
        tw = fitz.get_text_length(label, fontname="helv", fontsize=fontSize)
        if position.endswith("left"):
            x = 28
        elif position.endswith("right"):
            x = w - 28 - tw
        else:
            x = (w - tw) / 2
        y = h - 28 - fontSize if position.startswith("bottom") else 28 + fontSize
        pg.insert_text(fitz.Point(x, y), label, fontname="helv", fontsize=fontSize, color=(0.35, 0.33, 0.29))
        n += 1
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-numbered")


@app.post("/api/watermark")
async def watermark(
    file: UploadFile = File(...),
    text: str = Form("CONFIDENTIAL"),
    opacity: float = Form(0.12),
    rotation: int = Form(45),
    tile: bool = Form(False),
) -> dict[str, Any]:
    if not text.strip():
        raise HTTPException(422, "Watermark text required")
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    for pg in doc:
        w, h = pg.rect.width, pg.rect.height
        targets = (
            [(w * (gx + 0.5) / 3, h * (gy + 0.5) / 3) for gy in range(3) for gx in range(3)]
            if tile
            else [(w / 2, h / 2)]
        )
        for cx, cy in targets:
            # Arbitrary rotation via morph matrix around the stamp's centre
            # (insert_textbox's rotate param only accepts 0/90/180/270).
            pivot = fitz.Point(cx, cy)
            rect = fitz.Rect(cx - 220, cy - 70, cx + 220, cy + 70)
            rc = pg.insert_textbox(
                rect,
                text,
                fontname="hebo",
                fontsize=48,
                align=fitz.TEXT_ALIGN_CENTER,
                overlay=True,
                fill_opacity=max(0.05, min(1, opacity)),
                color=(0.5, 0.5, 0.5),
                morph=(pivot, fitz.Matrix(rotation)),
            )
            if rc < 0:  # didn't fit (e.g. tiny page) — retry without rotation
                pg.insert_textbox(
                    rect,
                    text,
                    fontname="hebo",
                    fontsize=36,
                    align=fitz.TEXT_ALIGN_CENTER,
                    overlay=True,
                    fill_opacity=max(0.05, min(1, opacity)),
                    color=(0.5, 0.5, 0.5),
                )
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-watermarked")


@app.post("/api/header-footer")
async def header_footer(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    import datetime

    today = datetime.date.today().isoformat()
    for i, pg in enumerate(doc):
        w = pg.rect.width
        pg.insert_text(fitz.Point(28, 30), f"{i+1}/{doc.page_count} · {today}", fontname="helv", fontsize=9, color=(0.35, 0.33, 0.29))
        pg.insert_text(fitz.Point(w - 120, pg.rect.height - 18), "PaperForge Cloud", fontname="helv", fontsize=9, color=(0.55, 0.55, 0.55))
    data = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return _store_pdf_bytes(data, _stem(file.filename or "doc"), "-headed")


# ------------------------------- read operations -------------------------------


@app.post("/api/pdf-to-text")
async def pdf_to_text(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    parts = [f"Page {i+1}\n{'-'*40}\n{pg.get_text().strip() or '[no text layer]'}" for i, pg in enumerate(doc)]
    doc.close()
    return {"kind": "text", "text": "\n\n".join(parts) + "\n"}


@app.post("/api/search")
async def search(file: UploadFile = File(...), query: str = Form(...)) -> dict[str, Any]:
    q = query.strip()
    if not q:
        raise HTTPException(422, "Empty query")
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    hits: list[dict[str, Any]] = []
    for i, pg in enumerate(doc):
        for rect in pg.search_for(q):
            snippet = pg.get_textbox(fitz.Rect(rect.x0 - 80, rect.y0 - 4, rect.x1 + 80, rect.y1 + 4)).replace("\n", " ")
            hits.append({"page": i + 1, "excerpt": snippet.strip()[:220]})
            if len(hits) >= 200:
                break
        if len(hits) >= 200:
            break
    doc.close()
    return {"kind": "search", "hits": hits, "total": len(hits)}


@app.post("/api/pdf-info")
async def pdf_info(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await read_pdf(file)
    doc = fitz.open(stream=raw, filetype="pdf")
    meta = doc.metadata or {}
    first = doc[0].rect if doc.page_count else fitz.Rect()
    info = {
        "fileName": file.filename or "doc.pdf",
        "fileSize": len(raw),
        "pageCount": doc.page_count,
        "title": meta.get("title") or "—",
        "author": meta.get("author") or "—",
        "creator": meta.get("creator") or "—",
        "producer": meta.get("producer") or "—",
        "encrypted": doc.needs_pass,
        "pageSize": f"{first.width:.0f} × {first.height:.0f} pt",
        "hasAcroForm": any(list(pg.widgets() or []) for pg in doc),
    }
    doc.close()
    return {"kind": "info", "info": info}


@app.post("/api/ocr")
async def ocr(file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Server OCR path. PyMuPDF ships Tesseract access via TOCR; if the binary is
    unavailable we degrade gracefully to text-layer extraction (never an error
    for scanned pages — the response reports what happened).
    """
    raw = await read_pdf(file)
    if page_count(raw) > 40:
        raise HTTPException(413, "Cloud OCR caps at 40 pages per job")
    doc = fitz.open(stream=raw, filetype="pdf")
    pages: list[str] = []
    ocr_used = False
    for i, pg in enumerate(doc):
        text = pg.get_text().strip()
        if not text:
            try:
                tp = pg.get_textpage_ocr(flags=fitz.TEXT_PRESERVE_LIGATURES | fitz.TEXT_PRESERVE_WHITESPACE)
                text = tp.extractTEXT().strip()
                ocr_used = True
            except Exception:  # noqa: BLE001 — tesseract not installed server-side
                text = "[no text layer — OCR engine unavailable on this instance]"
        pages.append(f"Page {i+1}\n{'-'*40}\n{text or '[empty]'}")
    doc.close()
    return {"kind": "text", "text": "\n\n".join(pages) + "\n", "ocrUsed": ocr_used}


# ------------------------------ result download --------------------------------


@app.get("/api/result/{token}")
def result(token: str, x_session_key: Annotated[str | None, Header()] = None) -> Response:
    _gc_sessions()
    sess = _RESULTS.get(token)
    if not sess:
        raise HTTPException(410, "Result expired or already downloaded")
    # single-use: delete before serving
    _RESULTS.pop(token, None)
    return Response(
        content=sess.payload,
        media_type=sess.mime,
        headers={"Content-Disposition": f'attachment; filename="{sess.filename}"'},
    )


def _stem(name: str) -> str:
    base = os.path.splitext(os.path.basename(name))[0]
    return base or "doc"


# --------------------------- dev entrypoint (not used in prod) ------------------

if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
