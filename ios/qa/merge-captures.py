"""Merge capture batches without altering PNG bytes or hiding failed attempts.

Retries may use another tooling commit only when every application tree matches.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
APPLICATION_PATHS = ['app', 'native', 'public', 'ios/App', 'android', 'db', 'drizzle', 'worker',
                     'package.json', 'package-lock.json', 'capacitor.config.ts', 'vite.native.config.ts',
                     'vite.config.ts', 'tsconfig.json', 'build/sites-vite-plugin.ts']


def fingerprint(commit):
    return {path: subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', f'{commit}:{path}'], text=True).strip()
            for path in APPLICATION_PATHS}


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('inputs', nargs='+', type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
merged = None
records = {}
environments = []
fingerprints = {}
runs = set()
for directory in args.inputs:
    raw = (directory / 'manifest.json').read_text(encoding='utf-8')
    report = json.loads(raw)
    commit = report['sourceCommit']
    if not re.fullmatch(r'[0-9a-f]{40}', commit) or not re.fullmatch(r'[0-9]+', str(report['runID'])):
        raise RuntimeError('Invalid commit or run ID in manifest')
    if not all(page['theme'] in ['light', 'dark'] for page in report['pages']):
        raise RuntimeError('Invalid appearance in manifest')
    fingerprints.setdefault(commit, fingerprint(commit))
    if any(value != fingerprints[commit] for value in fingerprints.values()):
        raise RuntimeError('Cannot mix screenshots from different application source trees')
    runs.add(str(report['runID']))
    if merged is None:
        merged = {**report, 'pages': []}
    themes = sorted({page['theme'] for page in report['pages']})
    batch = str(report['runID']) + '-' + '-'.join(themes)
    original_name = 'original-manifest-' + batch + '.json'
    (args.output / original_name).write_text(raw, encoding='utf-8')
    for page in report['pages']:
        key = (page['key'], page['theme'])
        previous = records.get(key)
        if previous and previous['status'] == 'captured':
            raise RuntimeError('Refusing to overwrite an already verified screenshot: ' + str(key))
        page = {**page, 'sourceCommit': commit, 'runID': report['runID'], 'originalManifest': original_name}
        if previous:
            page['previousFailure'] = {'error': previous.get('error'), 'runID': previous['runID'], 'sourceCommit': previous['sourceCommit']}
        if page['status'] == 'captured':
            name = page['file']
            if Path(name).name != name or not name.endswith('.png'):
                raise RuntimeError('Unsafe screenshot path')
            image = directory / name
            if hashlib.sha256(image.read_bytes()).hexdigest() != page['sha256']:
                raise RuntimeError('Screenshot hash mismatch: ' + name)
            shutil.copy2(image, args.output / name)
        records[key] = page
    environment = {'themes': themes, 'runID': report['runID'], 'sourceCommit': commit, 'originalManifest': original_name,
                   'capturedAt': report.get('capturedAt')}
    for name in ['xcode-version.txt', 'macos-version.txt', 'build-info.json', 'xcode-build.log']:
        if (directory / name).exists():
            filename = batch + '-' + name
            shutil.copy2(directory / name, args.output / filename)
            environment[name] = filename
            if name in ['xcode-version.txt', 'macos-version.txt'] and not (args.output / name).exists():
                shutil.copy2(directory / name, args.output / name)
    environments.append(environment)
merged.update(environments=environments, sourceRevisions=sorted(fingerprints), runIDs=sorted(runs),
              applicationTrees=fingerprints, mergePolicy='Only failed pages may be replaced; application Git trees must be identical',
              pages=sorted(records.values(), key=lambda page: (page['theme'], page['key'])))
(args.output / 'manifest.json').write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'sourceRevisions': sorted(fingerprints), 'states': len(records),
                  'captured': sum(page['status'] == 'captured' for page in records.values())}))
