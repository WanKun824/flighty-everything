"""Archive committed source and existing artifacts. Never builds or runs the app."""
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'release' / 'github-delivery-20260921'

def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    commit = git('rev-parse', 'HEAD').decode().strip()
    raw = git('archive', '--format=zip', 'HEAD')
    # Packaging screen only; neither a runtime test nor a comprehensive security audit.
    patterns = [rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
                rb'\bgh[pousr]_[A-Za-z0-9]{30,}\b', rb'\bgithub_pat_[A-Za-z0-9_]{30,}\b',
                rb'\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b']
    manifest = {'project': 'fly everything', 'sourceCommit': commit,
                'applicationCommit': '51173f1d5efa2037354d2dd056cdc3d343f50c10',
                'packagedAt': datetime.now(timezone.utc).isoformat(),
                'applicationBuiltOrTested': False, 'files': []}
    source = OUTPUT / f'fly-everything-source-{commit[:7]}.zip'
    docs = OUTPUT / 'fly-everything-docs-and-existing-screenshots.zip'
    with zipfile.ZipFile(io.BytesIO(raw)) as original, \
         zipfile.ZipFile(source, 'x', zipfile.ZIP_DEFLATED) as target, \
         zipfile.ZipFile(docs, 'x', zipfile.ZIP_DEFLATED) as doczip:
        for entry in original.infolist():
            if entry.is_dir():
                continue
            name = entry.filename
            path = Path(name)
            if any(p in {'.git', 'node_modules', 'release', '.wrangler'} for p in path.parts):
                raise RuntimeError('Unexpected generated/private directory: ' + name)
            if (path.name.startswith('.env') and path.name != '.env.example') or path.suffix.lower() in {'.p12', '.pfx', '.pem', '.mobileprovision', '.key'}:
                raise RuntimeError('Potential secret file: ' + name)
            data = original.read(entry)
            if any(re.search(pattern, data) for pattern in patterns):
                raise RuntimeError('Potential credential; inspect privately: ' + name)
            manifest['files'].append({'path': name, 'bytes': len(data), 'sha256': digest(data)})
            entry.filename = 'fly-everything-source/' + name
            target.writestr(entry, data)
            if name.startswith('docs/') or name in {'README.md', 'public/brand/fly-icon.png'}:
                doczip.writestr(name, data)
        target.writestr('fly-everything-source/SOURCE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    records = json.loads((ROOT / 'docs/delivery/existing-ipas.json').read_text(encoding='utf-8'))
    assets = [source, docs]
    invalid = []
    for record in records:
        path = ROOT / record['localPath']
        if digest(path.read_bytes()) != record['sha256']:
            raise RuntimeError('Existing IPA changed during packaging: ' + record['file'])
        if 'DO NOT INSTALL' in record['note']:
            invalid.append(path)
        else:
            assets.append(path)
    if invalid:
        bad_archive = OUTPUT / 'historical-invalid-ipa-DO-NOT-INSTALL.zip'
        with zipfile.ZipFile(bad_archive, 'x', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('DO-NOT-INSTALL.txt', 'These original historical files are not readable IPA/ZIP archives. Preserved unchanged for archival purposes only. Do not install.\n')
            for path in invalid:
                archive.write(path, path.name)
        assets.append(bad_archive)
    sums = OUTPUT / 'SHA256SUMS.txt'
    sums.write_text(''.join(digest(path.read_bytes()) + '  ' + path.name + '\n' for path in assets), encoding='utf-8')
    assets.append(sums)
    (OUTPUT / 'upload-assets.json').write_text(json.dumps([str(p) for p in assets], indent=2), encoding='utf-8')
    print(json.dumps({'commit': commit, 'files': len(manifest['files']), 'assets': [p.name for p in assets],
                      'directory': str(OUTPUT)}, ensure_ascii=True, indent=2))

if __name__ == '__main__':
    main()
