"""Server-tier tests: run every endpoint against in-memory fixtures.

Mirrors the browser self-test philosophy: build fixtures, call the operation,
re-open the output and assert real structure. Also verifies the privacy
semantics of the session store (single-use downloads, expiry).
"""

from __future__ import annotations

import io
import os
import sys
import time

import fitz  # PyMuPDF
import pytest
from fastapi.testclient import TestClient
from fpdf import FPDF
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from main import (  # noqa: E402
    MAX_PAGES,
    SESSION_TTL_SECONDS,
    app,
    _RESULTS,
    store_result,
)

client = TestClient(app)


# --------------------------------- fixtures -----------------------------------


def make_pdf(pages: int = 6) -> bytes:
    doc = fitz.open()
    for i in range(pages):
        pg = doc.new_page(width=595.28, height=841.89)
        pg.insert_text(fitz.Point(64, 120), f"Fixture page {i+1} of {pages}", fontsize=18)
        pg.insert_text(
            fitz.Point(64, 150),
            "The quick brown fox jumps over the lazy dog. PaperForge server test.",
            fontsize=11,
        )
    data = doc.tobytes()
    doc.close()
    return data


def make_encrypted_pdf(password: str = "pw123") -> bytes:
    doc = fitz.open()
    doc.new_page()
    buf = io.BytesIO()
    doc.save(buf, encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw=password, user_pw=password)
    doc.close()
    return buf.getvalue()


def make_png(color=(194, 65, 12)) -> bytes:
    img = Image.new("RGB", (300, 200), color)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


@pytest.fixture()
def pdf_file():
    def _make(pages: int = 6, name: str = "fixture.pdf"):
        return {"files": ("fixture.pdf", make_pdf(pages), "application/pdf")}

    return _make


def post_pdf(path: str, data: bytes, extra: dict | None = None, name: str = "fixture.pdf"):
    files = {"file": (name, data, "application/pdf")}
    form = extra or {}
    return client.post(path, files=files, data=form)


def fetch_and_check_pdf(resp_json: dict) -> bytes:
    assert resp_json["kind"] == "download"
    r = client.get(f"/api/result/{resp_json['token']}")
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")
    return r.content


def open_pdf(data: bytes):
    doc = fitz.open(stream=data, filetype="pdf")
    return doc


# --------------------------------- health --------------------------------------


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["service"] == "paperforge-cloud"


# ------------------------------ input validation -------------------------------


def test_rejects_non_pdf():
    r = post_pdf("/api/rotate", b"not a pdf", {"angle": "90"})
    assert r.status_code == 415


def test_rejects_bad_angle():
    r = post_pdf("/api/rotate", make_pdf(1), {"angle": "45"})
    assert r.status_code == 422


# ------------------------------ structure endpoints ----------------------------


def test_merge_two_pdfs():
    a = ("files", ("a.pdf", make_pdf(3), "application/pdf"))
    b = ("files", ("b.pdf", make_pdf(2), "application/pdf"))
    r = client.post("/api/merge", files=[a, b])
    assert r.status_code == 200
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count == 5


def test_rotate_90():
    r = post_pdf("/api/rotate", make_pdf(2), {"angle": "90"})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc[0].rotation == 90


def test_delete_pages():
    r = post_pdf("/api/delete-pages", make_pdf(6), {"ranges": "1-2, 6"})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count == 3


def test_reverse_preserves_count():
    r = post_pdf("/api/reverse", make_pdf(4))
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count == 4


def test_extract_pages():
    r = post_pdf("/api/extract-pages", make_pdf(6), {"ranges": "2-4"})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count == 3


def test_nup_halves_sheets():
    r = post_pdf("/api/nup", make_pdf(6), {"per": "2"})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count == 3


def test_resize_to_a4():
    r = post_pdf("/api/resize-a4", make_pdf(2), {"landscape": "false"})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    rect = doc[0].rect
    assert abs(rect.width - 595.28) < 1.5 and abs(rect.height - 841.89) < 1.5


def test_crop_shrinks_box():
    r = post_pdf("/api/crop", make_pdf(2), {"top": "0.1", "right": "0.1", "bottom": "0.1", "left": "0.1"})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc[0].cropbox.width < 595.28 - 100


# ------------------------------ optimize endpoints -----------------------------


def test_compress_reports_sizes():
    r = post_pdf("/api/compress", make_pdf(6), {"level": "balanced"})
    body = r.json()
    assert body["before"] > 0 and body["after"] > 0
    assert body["savedPct"] >= 0
    assert client.get(f"/api/result/{body['token']}").status_code == 200


def test_grayscale_keeps_pages():
    r = post_pdf("/api/grayscale", make_pdf(3))
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count == 3


def test_flatten_forms_runs():
    r = post_pdf("/api/flaten-forms" if False else "/api/flatten-forms", make_pdf(2))
    assert r.status_code == 200
    fetch_and_check_pdf(r.json())


def test_remove_annotations():
    r = post_pdf("/api/remove-annotations", make_pdf(2))
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count == 2


def test_protect_then_unlock_roundtrip():
    r = post_pdf("/api/protect", make_pdf(2), {"userPassword": "s3cret", "ownerPassword": "s3cret"})
    protected = fetch_and_check_pdf(r.json())
    # server can open it with the password…
    doc = fitz.open(stream=protected, filetype="pdf")
    assert doc.needs_pass
    assert doc.authenticate("s3cret")
    doc.close()
    # …and the unlock endpoint decrypts it
    r2 = post_pdf("/api/unlock", protected, {"password": "s3cret"})
    doc2 = open_pdf(fetch_and_check_pdf(r2.json()))
    assert not doc2.needs_pass
    assert doc2.page_count == 2


def test_unlock_wrong_password_403():
    enc = make_encrypted_pdf("right")
    r = post_pdf("/api/unlock", enc, {"password": "wrong"})
    assert r.status_code == 403


# ------------------------------- convert endpoints -----------------------------


def test_pdf_to_images_zip():
    r = post_pdf("/api/pdf-to-images", make_pdf(3), {"fmt": "png", "dpi": "96"})
    body = r.json()
    assert body["kind"] == "zip" and body["count"] == 3
    data = client.get(f"/api/result/{body['token']}").content
    assert data[:2] == b"PK"  # ZIP magic


def test_long_image_taller_than_wide():
    r = post_pdf("/api/pdf-to-long-image", make_pdf(3), {"width": "800"})
    body = r.json()
    assert body["height"] > body["width"]
    png = client.get(f"/api/result/{body['token']}").content
    assert png[:8] == b"\x89PNG\r\n\x1a\n"


def test_images_to_pdf():
    png = make_png()
    files = [("files", ("a.png", png, "image/png")), ("files", ("b.png", png, "image/png"))]
    r = client.post("/api/images-to-pdf", files=files)
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count == 2


def test_text_to_pdf():
    r = client.post("/api/text-to-pdf", data={"title": "Report", "text": "Line one.\nLine two.\n" * 40})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert doc.page_count >= 1


# -------------------------------- edit endpoints -------------------------------


def test_page_numbers_stamped():
    r = post_pdf("/api/page-numbers", make_pdf(3), {"position": "bottom-center", "startAt": "1"})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert "1 / 3" in doc[0].get_text()


def test_watermark_text_present():
    r = post_pdf("/api/watermark", make_pdf(2), {"text": "QA-TEST", "opacity": "0.4"})
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert "QA-TEST" in doc[0].get_text()


def test_header_footer_tokens():
    r = post_pdf("/api/header-footer", make_pdf(2))
    doc = open_pdf(fetch_and_check_pdf(r.json()))
    assert "1/2" in doc[0].get_text()


# -------------------------------- read endpoints -------------------------------


def test_pdf_to_text_extracts_fixture_line():
    r = post_pdf("/api/pdf-to-text", make_pdf(3))
    assert "Fixture page 1 of 3" in r.json()["text"]


def test_search_finds_all_pages():
    r = post_pdf("/api/search", make_pdf(6), {"query": "Fixture page"})
    body = r.json()
    assert body["total"] == 6
    assert {h["page"] for h in body["hits"]} == {1, 2, 3, 4, 5, 6}


def test_pdf_info_fields():
    r = post_pdf("/api/pdf-info", make_pdf(4))
    info = r.json()["info"]
    assert info["pageCount"] == 4
    assert info["pageSize"].endswith("pt")


# --------------------------- session privacy semantics --------------------------


def test_result_download_is_single_use():
    token = store_result(b"%PDF-fake", "application/pdf", "one-shot.pdf")
    first = client.get(f"/api/result/{token}")
    assert first.status_code == 200
    second = client.get(f"/api/result/{token}")
    assert second.status_code == 410  # gone after first download


def test_result_expiry():
    token = store_result(b"x", "application/pdf", "exp.pdf")
    _RESULTS[token].expires = time.time() - 1
    r = client.get(f"/api/result/{token}")
    assert r.status_code == 410


def test_expired_sessions_are_garbage_collected():
    t1 = store_result(b"a", "application/pdf", "a.pdf")
    t2 = store_result(b"b", "application/pdf", "b.pdf")
    _RESULTS[t1].expires = time.time() - 10
    store_result(b"c", "application/pdf", "c.pdf")  # triggers gc
    assert t1 not in _RESULTS
    assert t2 in _RESULTS
