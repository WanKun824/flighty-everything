"""Inventory existing IPA files without executing, rebuilding, or testing the app."""
import hashlib
import json
import plistlib
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
records = []
for path in sorted((root / 'release').rglob('*.ipa')):
    record = {'file': path.name, 'localPath': path.relative_to(root).as_posix(),
              'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    if not zipfile.is_zipfile(path):
        record.update(source=None, note='Not a readable ZIP/IPA archive. Historical failed or partial download; DO NOT INSTALL.')
        records.append(record)
        continue
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        plist = next(n for n in names if n.startswith('Payload/') and n.endswith('.app/Info.plist'))
        info = plistlib.loads(archive.read(plist))
        record.update(displayName=info.get('CFBundleDisplayName'), version=info.get('CFBundleShortVersionString'),
                      build=info.get('CFBundleVersion'), bundleId=info.get('CFBundleIdentifier'))
        provenance = next((n for n in names if n.endswith('.app/public/build-info.json')), None)
        record['source'] = json.loads(archive.read(provenance)) if provenance else None
        record['hasEmbeddedProfile'] = any(n.endswith('/embedded.mobileprovision') for n in names)
        record['note'] = 'Existing unsigned archive; not rebuilt or runtime-tested for this handoff.'
    records.append(record)
output = root / 'docs' / 'delivery' / 'existing-ipas.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(records, ensure_ascii=True, indent=2))
