"""Build source and Chrome-store ZIPs with explicit file selection."""
from pathlib import Path
import hashlib
import json
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'manifest.json').read_text())
version = manifest['version']
assert manifest['manifest_version'] == 3
assert version == json.loads((ROOT / 'package.json').read_text())['version']
assert len(manifest['description']) <= 132
assert 'host_permissions' not in manifest
for size, filename in manifest['icons'].items():
    data = (ROOT / filename).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', data[16:24]) == (int(size), int(size))
for filename in [manifest['action']['default_popup'], manifest['background']['service_worker'], manifest['options_ui']['page']]:
    assert (ROOT / filename).is_file()
runtime = ['manifest.json', 'LICENSE', 'PRIVACY.md']
runtime += [str(p.relative_to(ROOT)) for folder in ['src', 'icons'] for p in (ROOT / folder).rglob('*') if p.is_file()]
source = runtime + ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'PUBLISHING.md', 'VALIDATION.md', 'package.json', 'package-lock.json', '.gitignore', '.github/FUNDING.yml']
source += [str(p.relative_to(ROOT)) for folder in ['tests', 'scripts'] for p in (ROOT / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
dist = ROOT / 'dist'
dist.mkdir(exist_ok=True)
checksums = []
for suffix, files in [('chrome', runtime), ('source', source)]:
    destination = dist / f'context-clip-v{version}-{suffix}.zip'
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for filename in sorted(set(files)):
            entry = zipfile.ZipInfo(filename, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, (ROOT / filename).read_bytes())
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None
        assert 'manifest.json' in archive.namelist()
        assert not any(name.startswith(('.git/', 'node_modules/')) for name in archive.namelist())
    checksum = hashlib.sha256(destination.read_bytes()).hexdigest()
    checksums.append(f'{checksum}  {destination.name}')
    print(f'{destination.name}: {destination.stat().st_size} bytes, SHA-256 {checksum}')
(dist / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n')
