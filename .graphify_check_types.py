import json
from pathlib import Path

result = json.loads(open('.graphify_incremental.json', encoding='utf-8').read()) if Path('.graphify_incremental.json').exists() else {}
code_exts = {'.py','.ts','.js','.go','.rs','.java','.cpp','.c','.rb','.swift','.kt','.cs','.scala','.php','.cc','.cxx','.hpp','.h','.kts','.lua','.toc'}
new_files = result.get('new_files', {})
all_changed = [f for files in new_files.values() for f in files]
code_only = all(Path(f).suffix.lower() in code_exts for f in all_changed)
new_total = result.get('new_total', 0)
deleted = result.get('deleted_files', [])
print(f'code_only: {code_only}')
print(f'new/changed: {new_total}')
print(f'deleted: {len(deleted)}')
by_type = {}
for f in all_changed:
    ext = Path(f).suffix.lower()
    by_type.setdefault(ext, 0)
    by_type[ext] += 1
print('by ext:', dict(sorted(by_type.items(), key=lambda x: -x[1])[:10]))
