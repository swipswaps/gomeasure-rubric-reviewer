#!/usr/bin/env bash
set +H

REPO_NAME="gomeasure-rubric-reviewer"
BRANCH="main"
DEFAULT_DIR="$HOME/Documents/82ff64b4-acf6-4a50-95e1-9c474107cdf6/gomeasure-rubric-reviewer"

die() { printf '\n[error] %s\n' "$*" >&2; exit "${2:-2}"; }

if [ -f package.json ] && node -p "require('./package.json').name" 2>/dev/null | grep -qx "$REPO_NAME"; then
  DIR="$PWD"
else
  DIR="$DEFAULT_DIR"
fi
cd "$DIR" || die "cannot cd to $DIR" 2
printf 'project: %s\n' "$DIR"

[ -f package.json ] || die "no package.json" 2
NAME=$(node -p "require('./package.json').name")
[ "$NAME" = "$REPO_NAME" ] || die "package.json name '$NAME' != '$REPO_NAME'" 2

grep -q 'calibration is derived' rubric/index.mjs || die "rubric patch missing" 2
[ "$(grep -c 'specificity: 0' corpus/index.mjs)" = "0" ] || die "corpus patch missing" 2
printf 'preconditions ok\n'

# Replace only the known-stale history: 1 commit, no remote.
if [ -d .git ]; then
  REMOTE=$(git remote get-url origin 2>/dev/null || true)
  COMMITS=$(git rev-list --count HEAD 2>/dev/null || printf '0')
  if [ -z "$REMOTE" ] && [ "$COMMITS" = "1" ]; then
    BACKUP="/tmp/gomeasure-odd-git-$(date +%s)"
    mv .git "$BACKUP" || die "cannot move .git to $BACKUP" 2
    printf 'moved stale .git (%s commit, no remote) to %s\n' "$COMMITS" "$BACKUP"
  else
    printf 'keeping .git (remote=%s commits=%s)\n' "${REMOTE:-none}" "$COMMITS"
  fi
fi
[ -d .git ] || git init -b "$BRANCH" || die "git init failed" 2

# A kept .git may be an empty repo on another unborn branch; force $BRANCH.
CURRENT=$(git branch --show-current 2>/dev/null || true)
if [ "$CURRENT" != "$BRANCH" ]; then
  git checkout -B "$BRANCH" || die "cannot switch to branch $BRANCH" 2
fi

printf -- '--> npm install\n'
npm install || die "npm install failed" 3

printf -- '--> npm run review\n'
npm run review || die "review failed" 3

printf -- '--> npm run build\n'
npm run build || die "build failed" 3

python3 - "$REPO_NAME" <<'PY' || die "base path wrong" 3
import re, sys
from pathlib import Path
html = Path("dist/index.html").read_text()
expected = f"/{sys.argv[1]}/"
m = re.search(r'<script[^>]*type="module"[^>]*src="([^"]+)"', html)
src = m.group(1) if m else "<none>"
if not m or not src.startswith(expected):
    print("MISS module src:", src)
    sys.exit(1)
print("ok module src starts with", expected)
PY

PW_VERSION=$(node -p "require('@playwright/test/package.json').version")
PW_IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"
printf 'playwright %s\n' "$PW_VERSION"
python3 - "$PW_VERSION" <<'PY'
import re, sys
from pathlib import Path
p = Path(".github/workflows/verify.yml")
if p.exists():
    t = p.read_text()
    n = re.sub(r'v\d+\.\d+\.\d+-noble', f'v{sys.argv[1]}-noble', t)
    if n != t:
        p.write_text(n)
        print(f"ok verify.yml -> v{sys.argv[1]}-noble")
PY

printf -- '--> baselines in %s (~90s; do not Ctrl+C)\n' "$PW_IMAGE"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
  -v "$PWD":/work -w /work "$PW_IMAGE" \
  bash -lc "npm ci --no-audit --no-fund && npx playwright test --update-snapshots" \
  || die "baselines failed" 3

git add -A || die "git add failed" 2
if git diff --cached --quiet; then
  printf 'nothing new to commit\n'
else
  git commit -m "gomeasure rubric reviewer: meta-rubric, four defect classes, pairwise calibration" \
    || die "git commit failed" 2
fi

OWNER=$(gh api user --jq .login)
[ -n "$OWNER" ] || die "cannot resolve GitHub owner" 2
REMOTE="https://github.com/$OWNER/$REPO_NAME.git"

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  printf 'repo exists: %s/%s\n' "$OWNER" "$REPO_NAME"
else
  printf 'creating repo %s/%s\n' "$OWNER" "$REPO_NAME"
  gh repo create "$REPO_NAME" --public || die "gh repo create failed" 2
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE" || die "cannot add origin" 2
fi

printf -- '--> git push\n'
git push -u origin "$BRANCH" \
  || die "git push failed (remote may already have commits; inspect before forcing)" 2

if ! gh api "repos/$OWNER/$REPO_NAME/pages" >/dev/null 2>&1; then
  gh api -X POST "repos/$OWNER/$REPO_NAME/pages" -f build_type=workflow >/dev/null 2>&1 || true
fi
BT=$(gh api "repos/$OWNER/$REPO_NAME/pages" --jq '.build_type' 2>/dev/null)
[ "$BT" = "workflow" ] \
  || gh api -X PUT "repos/$OWNER/$REPO_NAME/pages" -f build_type=workflow >/dev/null \
  || die "cannot set Pages build_type" 4

printf -- '--> waiting for deploy\n'
SHA=$(git rev-parse HEAD)
ELAPSED=0
while [ "$ELAPSED" -lt 600 ]; do
  R=$(gh run list --repo "$OWNER/$REPO_NAME" --workflow=deploy.yml --limit 1 \
        --json status,conclusion,headSha \
        --jq 'if length == 0 then "none|none|none" else (.[0] | "\(.status)|\(.conclusion // "")|\(.headSha)") end' \
        2>/dev/null) || R="none|none|none"
  S="${R%%|*}"; REST="${R#*|}"; C="${REST%%|*}"; H="${REST##*|}"
  if [ "$H" = "$SHA" ]; then
    printf '[%ss] %s %s\n' "$ELAPSED" "$S" "$C"
    if [ "$S" = "completed" ]; then
      [ "$C" = "success" ] && break
      die "deploy concluded $C" 4
    fi
  else
    printf '[%ss] waiting for run on %s (latest %s)\n' "$ELAPSED" "${SHA:0:7}" "${H:0:7}"
  fi
  sleep 10; ELAPSED=$((ELAPSED + 10))
done

SITE="https://$OWNER.github.io/$REPO_NAME/"
printf -- '--> probing %s\n' "$SITE"
HTTP="000"
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  HTTP=$(curl -s -o /tmp/gm_matrix.json -w '%{http_code}' "${SITE}matrix.json")
  [ "$HTTP" = "200" ] && break
  sleep 10
done
[ "$HTTP" = "200" ] || die "matrix.json not reachable (last HTTP $HTTP)" 5

python3 - "$SHA" <<'PY' || die "matrix content check failed" 5
import json, sys
from pathlib import Path
sha = sys.argv[1]
d = json.loads(Path('/tmp/gm_matrix.json').read_text())
s = d.get('summary', {})
checks = {
  'generator': d.get('generator') == 'scripts/review.mjs',
  'cases': s.get('total', 0) > 0,
  'defects': s.get('defective', 0) == 4,
  'rejects': s.get('rejectsShortcut', 0) == s.get('total', -1),
  'matchesReference': s.get('defectClassMatches', 0) == s.get('total', -1),
  'soundFlag': s.get('soundFlag') is True,
  'buildId': d.get('buildId') == sha,
}
for k, v in checks.items():
    print(f"    {'ok  ' if v else 'MISS'} {k}")
if not all(checks.values()):
    print("summary:", json.dumps(s, indent=2))
    print("buildId:", d.get('buildId'), "expected:", sha)
    sys.exit(1)
PY

printf '\n=== done ===\n  site: %s\n' "$SITE"
true
