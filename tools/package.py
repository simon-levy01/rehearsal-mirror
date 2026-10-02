"""Create a source-only ZIP without dependencies, generated output or model weights."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('destination', type=Path)
args = parser.parse_args()
skip = {'node_modules', '.git', '.playwright-cli', '__pycache__', 'dist', 'output'}
with ZipFile(args.destination, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(root.rglob('*')):
        relative = file.relative_to(root)
        if file.is_file() and not skip.intersection(relative.parts) and file.suffix != '.zip':
            archive.write(file, Path('rehearsal-mirror') / relative)
with ZipFile(args.destination) as archive:
    assert archive.testzip() is None
print(f'{args.destination.resolve()} ({args.destination.stat().st_size:,} bytes)')
