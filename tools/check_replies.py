#!/usr/bin/env python3
"""check_replies.py — read-only Gmail reply checker for connector-ops (stage 03).

Prints UNSEEN messages from the campaign inbox via IMAP so replies can be
logged into tracker.csv the same day (operating-rules §1 step 4).

Credentials come from the environment — never hardcode them:
  GMAIL_ADDRESS       your Gmail address
  GMAIL_APP_PASSWORD  a Google App Password (16 chars) — NOT your normal password

One-time setup (user, ~2 minutes):
  1. Google Account -> Security -> 2-Step Verification must be ON
  2. Google Account -> Security -> App passwords -> create one for "Mail"
  3. Store both values, e.g. in the Freebuff Environment tab:
       GMAIL_ADDRESS=you@gmail.com
       GMAIL_APP_PASSWORD=abcd efgh ijkl mnop   (spaces ok, script strips them)

Run:  python3 tools/check_replies.py [--mark-read]
Default is READ-ONLY: nothing in the mailbox is changed unless --mark-read is passed.

No third-party libraries — stdlib only (imaplib, email, os, argparse).
"""
from __future__ import annotations

import argparse
import email
import email.header
import imaplib
import os
import sys
from datetime import datetime, timezone


def _decode(value) -> str:
    if value is None:
        return ""
    parts = email.header.decode_header(str(value))
    out = []
    for data, charset in parts:
        if isinstance(data, bytes):
            out.append(data.decode(charset or "utf-8", errors="replace"))
        else:
            out.append(data)
    return " ".join(out)


def _body_text(msg: email.message.Message) -> str:
    """Best-effort plain-text body: first text/plain part, else stripped text/html."""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == "text/plain" and part.get_filename() is None:
                payload = part.get_payload(decode=True) or b""
                return payload.decode(
                    part.get_content_charset() or "utf-8", errors="replace"
                )
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == "text/html" and part.get_filename() is None:
                payload = part.get_payload(decode=True) or b""
                html = payload.decode(
                    part.get_content_charset() or "utf-8", errors="replace"
                )
                return html.replace("<br>", "\n").replace("<br/>", "\n").replace(
                    "<br />", "\n"
                )
        return ""
    payload = msg.get_payload(decode=True) or b""
    return payload.decode(msg.get_content_charset() or "utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only Gmail reply checker.")
    parser.add_argument(
        "--mark-read",
        action="store_true",
        help="Mark fetched messages as read (default: read-only).",
    )
    parser.add_argument(
        "--mailbox", default="INBOX", help="IMAP mailbox to scan (default INBOX)."
    )
    args = parser.parse_args()

    address = os.environ.get("GMAIL_ADDRESS", "").strip()
    app_password = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "").strip()

    if not address or not app_password:
        print(
            "Missing credentials.\n"
            "Set both env vars (Freebuff: Settings -> Environment -> add keys):\n"
            "  GMAIL_ADDRESS      e.g. you@gmail.com\n"
            "  GMAIL_APP_PASSWORD a 16-char Google App Password (not your login!)\n"
            "Setup: Google Account -> Security -> 2-Step Verification ON -> App passwords.",
            file=sys.stderr,
        )
        return 1

    readonly = not args.mark_read
    try:
        conn = imaplib.IMAP4_SSL("imap.gmail.com", 993)
        conn.login(address, app_password)
        conn.select(args.mailbox, readonly=readonly)
        status, data = conn.search(None, "UNSEEN")
        if status != "OK":
            print(f"IMAP search failed: {status}", file=sys.stderr)
            return 1
        ids = data[0].split()
        if not ids:
            print("No unread replies waiting. Inbox clear. ✅")
            return 0

        print(f"{len(ids)} unread message(s):\n")
        for mid in ids:
            status, msg_data = conn.fetch(mid, "(RFC822)")
            if status != "OK" or not msg_data or msg_data[0] is None:
                continue
            msg = email.message_from_bytes(msg_data[0][1])
            sender = _decode(msg.get("From"))
            subject = _decode(msg.get("Subject"))
            date = msg.get("Date", "")
            body = _body_text(msg).strip()
            print("=" * 70)
            print(f"From:    {sender}")
            print(f"Subject: {subject}")
            print(f"Date:    {date}")
            print("-" * 70)
            print(body[:2000])
            print()
        print("=" * 70)
        print(
            "Next: log every reply into tracker.csv today (status per reply-handling\n"
            "tables in campaign-sequences.md). Live role + budget -> STOP -> stage-04 gate."
        )
        if readonly:
            print("(read-only run: messages left unread — re-run with --mark-read to clear)")
        conn.logout()
        return 0
    except imaplib.IMAP4.error as exc:
        print(
            f"Gmail IMAP error: {exc}\n"
            "Most common cause: the app password is wrong, or 2-Step Verification\n"
            "is off. Re-check Google Account -> Security -> App passwords.",
            file=sys.stderr,
        )
        return 2


if __name__ == "__main__":
    sys.exit(main())
