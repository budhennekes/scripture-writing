#!/usr/bin/env python3
"""Structural checks across every bundled Bible; not a theological review."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
counts = {}
for filename in ('bible.json', 'asv1901.json', 'bsb.json'):
    data = json.loads((root / 'public/data' / filename).read_text())
    books = data['books']
    assert len(books) == 66, (filename, 'book count')
    assert len({b['id'] for b in books}) == 66
    assert books[0]['id'] == 'GEN' and books[-1]['id'] == 'REV'
    count = 0
    for book in books:
        chapter_numbers = [c['number'] for c in book['chapters']]
        assert chapter_numbers == sorted(set(chapter_numbers)) and chapter_numbers[0] == 1
        for chapter in book['chapters']:
            numbers = [v['number'] for v in chapter['verses']]
            assert numbers == sorted(set(numbers)), (filename, book['id'], chapter['number'])
            for verse in chapter['verses']:
                assert isinstance(verse['text'], str) and verse['text'].strip()
                assert '\ufffd' not in verse['text'], (filename, book['id'], chapter['number'], verse['number'])
                count += 1
    counts[filename] = {'books': len(books), 'chapters': sum(len(b['chapters']) for b in books), 'verses': count}
print(json.dumps(counts, indent=2))
print('Data structure QA passed for every bundled verse.')
