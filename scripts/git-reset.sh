#!/bin/bash
set -euo pipefail

# Usage:
# 只删tag:    ./git-reset-with-tag-clean.sh "" v2.0.0
# 回退+删tag: ./git-reset-with-tag-clean.sh 72acf1a v2.0.0
# 仅回退推送: ./git-reset-with-tag-clean.sh 72acf1a

if [ $# -lt 1 ]; then
  echo "用法:"
  echo "  仅删除tag:   $0 \"\" <tag_name>"
  echo "  回退+删tag: $0 <commit_hash> <tag_name>"
  echo "  仅回退推送: $0 <commit_hash>"
  echo
  echo "示例："
  echo "  $0 \"\" v2.0.0"
  echo "  $0 72acf1a v2.0.0"
  echo "  $0 72acf1a"
  exit 1
fi

TARGET_COMMIT="${1:-}"
TAG_NAME="${2:-}"
CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# --------------------------
# 模式A：只删除tag
# --------------------------
if [[ -z "$TARGET_COMMIT" ]]; then
  if [[ -z "$TAG_NAME" ]]; then
    echo "错误：只删tag模式，需要传入tag名称"
    exit 1
  fi

  echo "======================================"
  echo "模式：仅删除tag，不修改分支代码"
  echo "待删除tag: $TAG_NAME"
  echo "======================================"
  read -p "确认删除本地+远程tag $TAG_NAME ? [y/N] " -r
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
  fi

  git tag -d "$TAG_NAME" || true
  git push origin --delete "$TAG_NAME" || true
  echo "✅ tag $TAG_NAME 删除完成"
  exit 0
fi

# --------------------------
# 模式B：执行reset‑hard + push，可选删tag
# --------------------------
echo "======================================"
echo "当前分支: $CUR_BRANCH"
echo "回退目标commit: $TARGET_COMMIT"
if [[ -n "$TAG_NAME" ]]; then
  echo "将要删除tag: $TAG_NAME"
fi
echo "======================================"
echo "⚠️ 警告：会丢弃当前分支之后所有提交，改写远程历史！"
read -p "确认继续? [y/N] " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "已取消"
  exit 0
fi

git reset --hard "$TARGET_COMMIT"
git push origin "${CUR_BRANCH}" --force-with-lease

if [[ -n "$TAG_NAME" ]]; then
  echo "删除本地 tag $TAG_NAME"
  git tag -d "$TAG_NAME" || true
  echo "删除远程 tag $TAG_NAME"
  git push origin --delete "$TAG_NAME" || true
fi

echo ""
echo "✅完成。当前HEAD："
git log -1 --oneline
