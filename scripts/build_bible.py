#!/usr/bin/env python3
"""Convert the official eBible.org WEB USFX file into app JSON."""

from __future__ import annotations

import json
import urllib.request
import zipfile
import io
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-data" / "usfx" / "engwebp_usfx.xml"
OUTPUT = ROOT / "public" / "data" / "bible.json"

BOOKS = [
    ("GEN", "Genesis"), ("EXO", "Exodus"), ("LEV", "Leviticus"),
    ("NUM", "Numbers"), ("DEU", "Deuteronomy"), ("JOS", "Joshua"),
    ("JDG", "Judges"), ("RUT", "Ruth"), ("1SA", "1 Samuel"),
    ("2SA", "2 Samuel"), ("1KI", "1 Kings"), ("2KI", "2 Kings"),
    ("1CH", "1 Chronicles"), ("2CH", "2 Chronicles"), ("EZR", "Ezra"),
    ("NEH", "Nehemiah"), ("EST", "Esther"), ("JOB", "Job"),
    ("PSA", "Psalms"), ("PRO", "Proverbs"), ("ECC", "Ecclesiastes"),
    ("SNG", "Song of Solomon"), ("ISA", "Isaiah"), ("JER", "Jeremiah"),
    ("LAM", "Lamentations"), ("EZK", "Ezekiel"), ("DAN", "Daniel"),
    ("HOS", "Hosea"), ("JOL", "Joel"), ("AMO", "Amos"),
    ("OBA", "Obadiah"), ("JON", "Jonah"), ("MIC", "Micah"),
    ("NAM", "Nahum"), ("HAB", "Habakkuk"), ("ZEP", "Zephaniah"),
    ("HAG", "Haggai"), ("ZEC", "Zechariah"), ("MAL", "Malachi"),
    ("MAT", "Matthew"), ("MRK", "Mark"), ("LUK", "Luke"),
    ("JHN", "John"), ("ACT", "Acts"), ("ROM", "Romans"),
    ("1CO", "1 Corinthians"), ("2CO", "2 Corinthians"),
    ("GAL", "Galatians"), ("EPH", "Ephesians"), ("PHP", "Philippians"),
    ("COL", "Colossians"), ("1TH", "1 Thessalonians"),
    ("2TH", "2 Thessalonians"), ("1TI", "1 Timothy"),
    ("2TI", "2 Timothy"), ("TIT", "Titus"), ("PHM", "Philemon"),
    ("HEB", "Hebrews"), ("JAS", "James"), ("1PE", "1 Peter"),
    ("2PE", "2 Peter"), ("1JN", "1 John"), ("2JN", "2 John"),
    ("3JN", "3 John"), ("JUD", "Jude"), ("REV", "Revelation"),
]
BOOK_NAMES = dict(BOOKS)
SKIP_TAGS = {"f", "x", "fig", "rem", "periph", "s", "s1", "s2", "s3", "r", "d", "ms", "mr", "cl", "cp"}
SPACE_RE = re.compile(r"\s+")


def clean(text: str) -> str:
    text = SPACE_RE.sub(" ", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"([“‘])\s+", r"\1", text)
    return text.strip()


def extract_book(book: ET.Element) -> dict:
    chapters: dict[int, dict[int, list[str]]] = {}
    current_chapter: int | None = None
    current_verse: int | None = None

    def append_text(value: str | None) -> None:
        if not value or current_chapter is None or current_verse is None:
            return
        chapters[current_chapter][current_verse].append(value)

    def walk(node: ET.Element, skipped: bool = False) -> None:
        nonlocal current_chapter, current_verse
        tag = node.tag.split("}")[-1]
        is_skipped = skipped or tag in SKIP_TAGS

        if tag == "ve" and not is_skipped:
            current_verse = None
        if tag == "c" and not is_skipped:
            chapter_id = node.attrib.get("id", "")
            if chapter_id.isdigit():
                current_chapter = int(chapter_id)
                chapters.setdefault(current_chapter, {})
                current_verse = None
        elif tag == "v" and not is_skipped and current_chapter is not None:
            verse_id = node.attrib.get("id", "")
            match = re.match(r"\d+", verse_id)
            if match:
                current_verse = int(match.group())
                chapters[current_chapter].setdefault(current_verse, [])

        if not is_skipped and tag not in {"book", "id", "h", "toc", "c", "v"}:
            append_text(node.text)

        for child in node:
            walk(child, is_skipped)
            if not is_skipped:
                append_text(child.tail)

    walk(book)

    chapter_list = []
    for chapter_number in sorted(chapters):
        verses = []
        for verse_number in sorted(chapters[chapter_number]):
            text = clean("".join(chapters[chapter_number][verse_number]))
            if text:
                verses.append({"number": verse_number, "text": text})
        if verses:
            chapter_list.append({"number": chapter_number, "verses": verses})

    return {
        "id": book.attrib["id"],
        "name": BOOK_NAMES[book.attrib["id"]],
        "chapters": chapter_list,
    }


def main() -> None:
    import sys
    translation = sys.argv[1] if len(sys.argv) > 1 else "WEB"
    specs = {
        "WEB": ("engwebp", "World English Bible", "bible.json", "Public domain. World English Bible is a trademark of eBible.org."),
        "ASV1901": ("eng-asv", "American Standard Version (1901)", "asv1901.json", "Public domain. https://ebible.org/asv/copyright.htm"),
        "BSB": ("engbsb", "Berean Standard Bible", "bsb.json", "Dedicated to the public domain (CC0), April 30, 2023. https://berean.bible/terms.htm"),
    }
    source_id, name, filename, notice = specs[translation]
    source = ROOT / "source-data" / "usfx" / f"{source_id}_usfx.xml"
    if not source.exists():
        url = f"https://ebible.org/Scriptures/{source_id}_usfx.zip"
        archive = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(url).read()))
        xml_name = next(n for n in archive.namelist() if n.endswith("_usfx.xml"))
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_bytes(archive.read(xml_name))
    output = ROOT / "public" / "data" / filename
    tree = ET.parse(source)
    root = tree.getroot()
    by_id = {book.attrib.get("id"): book for book in root.findall("book")}
    missing = [book_id for book_id, _ in BOOKS if book_id not in by_id]
    if missing:
        raise SystemExit(f"Missing books: {', '.join(missing)}")

    books = [extract_book(by_id[book_id]) for book_id, _ in BOOKS]
    payload = {
        "translation": {
            "id": translation,
            "name": name,
            "source": f"https://ebible.org/{source_id}/",
            "notice": notice,
        },
        "books": books,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    verse_count = sum(
        len(chapter["verses"])
        for book in books
        for chapter in book["chapters"]
    )
    print(f"Wrote {len(books)} books and {verse_count} verses to {output}")


if __name__ == "__main__":
    main()
