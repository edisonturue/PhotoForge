#!/bin/bash
# PhotoForge 隐私安全检查（Shell 版 — 无需 Node.js）
# 运行: bash scripts/verify_privacy.sh
set -e
cd "$(dirname "$0")/.."
G='\033[0;32m'; R='\033[0;31m'; NC='\033[0m'
P=0; T=0
ok() { P=$((P+1)); T=$((T+1)); echo -e "  ${G}✓${NC} $1"; }
fail() { T=$((T+1)); echo -e "  ${R}⚠${NC} $1"; }

echo "============================================="
echo " PhotoForge 隐私安全检查 (Shell)"
echo " $(date)"
echo "============================================="

echo ""; echo "① 照片数据会不会上传 GitHub？"; echo ""

cnt=$(git ls-files --cached '*.jpg' '*.jpeg' '*.heic' '*.heif' 2>/dev/null | grep -civ 'icon' 2>/dev/null || true)
[ "$cnt" = "0" ] && ok "照片文件（jpg/jpeg/heic）= 0" || fail "找到 $cnt 个照片文件"

cnt=$(git ls-files --cached '*.nef' '*.cr2' '*.cr3' '*.arw' '*.dng' '*.raf' 2>/dev/null | wc -l | tr -d ' ')
[ "$cnt" = "0" ] && ok "RAW 照片文件 = 0" || fail "找到 $cnt 个 RAW 文件"

cnt=$(git ls-files --cached | grep -c 'library.json' 2>/dev/null || true)
[ "$cnt" = "0" ] && ok "相册数据库 library.json = 不在 Git 中" || fail "library.json 被跟踪了"

cnt=$(git ls-files --cached | grep -c 'originals\|thumbnails' 2>/dev/null || true)
[ "$cnt" = "0" ] && ok "照片原档/缩略图目录 = 不在 Git 中" || fail "照片目录被跟踪"

cnt=$(git ls-files --cached | grep -c 'CLAUDE.md' 2>/dev/null || true)
[ "$cnt" = "0" ] && ok "个人 AI 指令 CLAUDE.md = 不在 Git 中" || fail "CLAUDE.md 仍被跟踪"

cnt=$(git ls-files --cached | grep -c 'AGENTS.md' 2>/dev/null || true)
[ "$cnt" = "0" ] && ok "个人工作流 AGENTS.md = 不在 Git 中" || fail "AGENTS.md 仍被跟踪"

echo ""; echo "② 安全机制是否开启？"; echo ""

grep -q 'contextIsolation: true' src/main/main.ts && ok "contextIsolation=true" || fail "未开启"
grep -q 'nodeIntegration: false' src/main/main.ts && ok "nodeIntegration=false" || fail "未关闭"
grep -q 'contextBridge' src/main/preload.ts && ok "contextBridge（白名单 API）" || fail "未使用"

echo ""; echo "③ 本地路径泄露检查"; echo ""

cnt=$(git grep -c '/Users/' -- ':!*.md' ':!*.svg' ':!*.png' 2>/dev/null || true)
[ "$cnt" = "0" ] && ok "无用户本地路径（/Users/...）" || fail "找到 $cnt 处用户路径"

echo ""; echo "============================================="
echo -e " ${G}${P}/${T} 项通过${NC}"
echo "============================================="

if [ "$P" = "$T" ]; then
  echo ""
  echo "✅ 全部通过，可以安全 push 到 GitHub"
  echo ""
  echo "  📸 照片数据：存在 ~/Pictures/PhotoForge_Library/"
  echo "  📁 项目代码：在此目录"
  echo "  🔒 两套完全隔离，Git 只跟踪项目代码"
fi
