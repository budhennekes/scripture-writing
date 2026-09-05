#!/usr/bin/env python3
"""Deploy an already-tested dist/ to this project's GitHub Pages branch.
Run DEPLOY_BASE=/scripture-writing/ npm run build first.
Requires explicit publishing approval and authenticated git/gh.
"""
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
REMOTE = 'https://github.com/budhennekes/scripture-writing.git'

def run(*args, cwd):
    subprocess.run(args, cwd=cwd, check=True)

def main():
    dist = ROOT / 'dist'
    assert (dist / 'index.html').is_file(), 'Build first'
    assert '/scripture-writing/assets/' in (dist / 'index.html').read_text(), 'Wrong deployment base'
    with tempfile.TemporaryDirectory(prefix='scripture-pages-') as tmp:
        work = Path(tmp)
        result = subprocess.run(['git', 'ls-remote', '--exit-code', '--heads', REMOTE, 'gh-pages'], capture_output=True)
        if result.returncode == 0:
            run('git', 'clone', '--depth', '1', '--branch', 'gh-pages', REMOTE, str(work), cwd=ROOT)
            for item in work.iterdir():
                if item.name != '.git':
                    shutil.rmtree(item) if item.is_dir() else item.unlink()
        elif result.returncode == 2:
            run('git', 'init', '-b', 'gh-pages', cwd=work)
            run('git', 'remote', 'add', 'origin', REMOTE, cwd=work)
        else:
            raise RuntimeError('Cannot query remote; no deployment attempted')
        shutil.copytree(dist, work, dirs_exist_ok=True)
        (work / '.nojekyll').write_text('')
        run('git', 'add', '.', cwd=work)
        run('git', '-c', 'user.name=Bud Hennekes', '-c', 'user.email=budhennekes@users.noreply.github.com', 'commit', '--allow-empty', '-m', 'Deploy verified Scripture writing MVP', cwd=work)
        run('git', 'push', 'origin', 'gh-pages', cwd=work)

if __name__ == '__main__':
    main()
