"""Validate the delivered screenshot files and their local documentation links."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--light-only', action='store_true', help='Validate an explicitly documented light-only delivery')
args = parser.parse_args()
root = args.directory.resolve()
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
pages = manifest['pages']
errors = []
seen = set()
dimensions = set()
for page in pages:
    key = (page['key'], page['theme'])
    if key in seen:
        errors.append(f'Duplicate capture: {key}')
    seen.add(key)
    if page['status'] != 'captured':
        errors.append(f'Missing capture: {key}')
        continue
    image = root / 'images' / page['file']
    if not image.exists():
        errors.append(f'Missing file: {image.name}')
        continue
    data = image.read_bytes()
    if hashlib.sha256(data).hexdigest() != page['sha256']:
        errors.append(f'Hash mismatch: {image.name}')
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        errors.append(f'Not a PNG: {image.name}')
    else:
        dimensions.add(struct.unpack('>II', data[16:24]))
    if not (root / (page['key'] + '.md')).exists():
        errors.append(f'Missing page documentation: {key}')
keys = {key for key, theme in seen}
themes = ['light'] if args.light_only else ['light', 'dark']
if len(keys) != 32 or len(seen) != 32 * len(themes):
    errors.append(f'Unexpected coverage: {len(keys)} / {len(seen)}')
for key in keys:
    for theme in themes:
        if (key, theme) not in seen:
            errors.append(f'Missing appearance: {key} {theme}')
for document in root.glob('*.md'):
    text = document.read_text(encoding='utf-8')
    links = re.findall(r'\]\(([^)]+)\)', text) + re.findall(r'src="([^"]+)"', text)
    for link in links:
        if '://' in link or link.startswith('#'):
            continue
        target = document.parent / link.split('#')[0]
        if not target.exists():
            errors.append(f'Broken link: {document.name} -> {link}')
print(json.dumps(dict(source=manifest['sourceCommit'], runID=manifest['runID'],
                     pageStates=len(keys), appearanceStates=len(seen),
                     screenshots=sum(page['status'] == 'captured' for page in pages),
                     dimensions=sorted(dimensions), errors=errors), ensure_ascii=False, indent=2))
if errors:
    raise SystemExit(1)
