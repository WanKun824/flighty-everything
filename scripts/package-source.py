"""Package tracked source + handoff files; no dependencies, history or credentials.

Python 3 standard library only. Run from any directory; --verify checks a ZIP.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
from datetime import datetime, timezone
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXTRAS = {
    "README.md", ".env.example", "scripts/package-source.py",
    "docs/开发与打包说明.md", "docs/交付清单与已知限制.md",
}
REQUIRED = {
    "package.json", "package-lock.json", "vite.config.ts",
    "vite.native.config.ts", "capacitor.config.ts", ".openai/hosting.json",
    "build/sites-vite-plugin.ts", "app/FlightyApp.tsx", "native/main.tsx",
    "ios/App/App/SceneDelegate.swift", "ios/App/App.xcodeproj/project.pbxproj",
    "android/gradlew", "android/gradle/wrapper/gradle-wrapper.jar",
    "public/data/airports.json", "public/models/legacy-plane.glb",
    "public/models/train.glb", "public/models/boat.glb", "public/models/porsche.glb",
    "db/schema.ts", "drizzle/meta/_journal.json",
} | EXTRAS
BLOCK_DIRS = {
    ".git", "node_modules", "dist", "native-shell", "release", "outputs",
    "work", "coverage", ".next", ".vinext", ".wrangler", ".gradle",
    "Pods", "DerivedData", "xcuserdata", "__pycache__", "model-previews",
}
SECRET_PATTERNS = [
    rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
    rb"\bgh[pousr]_[A-Za-z0-9]{30,}\b",
    rb"\bgithub_pat_[A-Za-z0-9_]{30,}\b",
    rb"\bAKIA[0-9A-Z]{16}\b",
    rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b",
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def permitted(name):
    p = PurePosixPath(name)
    if p.is_absolute() or ".." in p.parts or "\\" in name or ":" in name:
        return False
    if any(part in BLOCK_DIRS for part in p.parts):
        return False
    if "build" in p.parts and name != "build/sites-vite-plugin.ts":
        return False
    if p.name.startswith(".env") and name != ".env.example":
        return False
    if p.name in {"local.properties", ".DS_Store", ".npmrc", ".netrc", ".dev.vars"}:
        return False
    return p.suffix.lower() not in {
        ".ipa", ".apk", ".aab", ".zip", ".gz", ".tgz", ".tar", ".7z",
        ".p12", ".pfx", ".pem", ".key",
        ".mobileprovision", ".keystore", ".jks", ".log", ".tsbuildinfo",
    }


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args], stderr=subprocess.DEVNULL)


def source_list():
    previous = ROOT / "SOURCE-MANIFEST.json"
    try:
        # Do not accidentally use a repository that merely contains the extracted folder.
        top = Path(git("rev-parse", "--show-toplevel").decode().strip()).resolve()
        if top != ROOT:
            raise ValueError("Not the source repository root")
        names = set(git("ls-files", "-z").decode("utf-8").split("\0")) - {""}
        commit = git("rev-parse", "HEAD").decode().strip()
        selection = "git tracked working-tree files plus explicit handoff files"
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError):
        if not previous.exists():
            raise RuntimeError("Need the original Git repository or SOURCE-MANIFEST.json")
        old = json.loads(previous.read_text(encoding="utf-8"))
        names = {f["path"] for f in old["files"]}
        commit = old["baseCommit"]
        selection = "previous source manifest plus explicit handoff files"
    names |= EXTRAS
    names.discard("SOURCE-MANIFEST.json")
    names = sorted(n for n in names if permitted(n) and (ROOT / n).is_file())
    missing = REQUIRED - set(names)
    if missing:
        raise RuntimeError("Missing required source: " + ", ".join(sorted(missing)))
    return names, commit, selection


def verify(path):
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        if bad:
            raise RuntimeError("ZIP CRC failed: " + bad)
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise RuntimeError("Duplicate ZIP entries")
        prefix = "flighty-everything-source/"
        if any(not n.startswith(prefix) or not permitted(n[len(prefix):]) for n in names):
            raise RuntimeError("Unexpected or forbidden ZIP entry")
        manifest_name = prefix + "SOURCE-MANIFEST.json"
        manifest = json.loads(archive.read(manifest_name))
        records = manifest["files"]
        if len(records) != len({f["path"] for f in records}):
            raise RuntimeError("Duplicate manifest entries")
        if set(names) != {prefix + f["path"] for f in records} | {manifest_name}:
            raise RuntimeError("ZIP / manifest contents differ")
        if not REQUIRED.issubset({f["path"] for f in records}):
            raise RuntimeError("Required source missing")
        for item in records:
            data = archive.read(prefix + item["path"])
            if sha(data) != item["sha256"] or len(data) != item["bytes"]:
                raise RuntimeError("File hash mismatch: " + item["path"])
        return {"files": len(records), "zipBytes": Path(path).stat().st_size,
                "sha256": sha(Path(path).read_bytes()), "verified": True}


def package():
    names, commit, selection = source_list()
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    now = datetime.now(timezone.utc)
    output = ROOT / "release" / "source"
    output.mkdir(parents=True, exist_ok=True)
    path = output / f"flighty-everything-{version}-source-{commit[:7]}-{now:%Y%m%d-%H%M%S-%f}.zip"
    records = []
    entries = []
    for name in names:
        file = ROOT / name
        if file.is_symlink() or ROOT not in file.resolve().parents:
            raise RuntimeError("Unsafe source path: " + name)
        data = file.read_bytes()
        if any(re.search(pattern, data) for pattern in SECRET_PATTERNS):
            # Only identify the file; never print a matched credential.
            raise RuntimeError("Potential credential found; inspect privately: " + name)
        records.append({"path": name, "bytes": len(data), "sha256": sha(data)})
        entries.append((name, data))
    manifest = {
        "project": "flighty Everything", "version": version, "baseCommit": commit,
        "packagedAt": now.isoformat(), "selection": selection,
        "note": "Current working-tree snapshot, with handoff documentation; not a Git history export.",
        "exclusions": sorted(BLOCK_DIRS) + ["credentials", "private environment files", "old installers"],
        "publicConfiguration": "Public Mapbox fallback token and Sites project binding metadata retained.",
        "files": records,
    }
    entries.append(("SOURCE-MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")))
    with zipfile.ZipFile(path, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in entries:
            info = zipfile.ZipInfo("flighty-everything-source/" + name, now.timetuple()[:6])
            info.create_system = 3
            mode = 0o755 if name == "android/gradlew" else 0o644
            info.external_attr = (stat.S_IFREG | mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    report = verify(path)
    path.with_suffix(path.suffix + ".sha256").write_text(
        report["sha256"] + "  " + path.name + "\n", encoding="utf-8")
    print(json.dumps({"path": str(path), **report}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", type=Path)
    args = parser.parse_args()
    if args.verify:
        print(json.dumps(verify(args.verify), ensure_ascii=False))
    else:
        package()
