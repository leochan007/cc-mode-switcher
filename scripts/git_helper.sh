#!/bin/bash
# git_helper.sh — unified git helper for cc-mode-switcher
#
# Subcommands:
#   reset           hard-reset current branch to a commit + force-push
#   set-tag         create a local tag and push it to origin                    [alias: st]
#   delete-tag      delete a local and/or remote git tag
#   call-workflow   trigger a remote GitHub Actions workflow (requires gh CLI)   [alias: cw]
#   list-workflow   list remote GitHub Actions workflows (requires gh CLI)        [alias: lw]
#   help            show this help
#
# Run `git_helper.sh help` any time.

set -euo pipefail

SCRIPT_NAME=$(basename "$0")

# -----------------------------------------------------------------------------
# help
# -----------------------------------------------------------------------------

usage() {
  cat <<'EOF'
$SCRIPT_NAME — unified git helper for cc-mode-switcher

Usage:
  $SCRIPT_NAME <command> [args]

Commands:
  reset           Hard-reset current branch to a commit + force-push
                   $SCRIPT_NAME reset <commit>
                 For tag deletes, use the `delete-tag` subcommand.

  delete-tag      Delete a local and/or remote git tag
                   $SCRIPT_NAME delete-tag <tag>            # both local + remote
                   $SCRIPT_NAME delete-tag <tag> --local    # only local
                   $SCRIPT_NAME delete-tag <tag> --remote   # only remote

  set-tag         Create a local tag and push it to origin (alias: st)
                   $SCRIPT_NAME set-tag <tag>            # annotated at HEAD
                   $SCRIPT_NAME set-tag <tag> <commit>   # annotated at commit
                   $SCRIPT_NAME set-tag <tag> --lightweight

  call-workflow   Trigger a remote GitHub Actions workflow (alias: cw)
                   $SCRIPT_NAME call-workflow <workflow-file-or-id> [-f key=val ...]
                   Requires: gh CLI (https://cli.github.com) + gh auth login

  list-workflow   List remote GitHub Actions workflows (alias: lw)
                   $SCRIPT_NAME list-workflow
                   Requires: gh CLI + gh auth login

  help            Show this help (alias: --help, -h, or no args)

Examples:
  $SCRIPT_NAME reset 72acf1a
  $SCRIPT_NAME set-tag v2.0.0
  $SCRIPT_NAME set-tag v2.0.0 72acf1a
  $SCRIPT_NAME delete-tag v2.0.0
  $SCRIPT_NAME delete-tag v2.0.0 --local
  $SCRIPT_NAME list-workflow
  $SCRIPT_NAME call-workflow deploy.yml -f environment=prod -f commit=HEAD
EOF
}

require_git_repo() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "❌ Error: not inside a git working tree" >&2
    exit 1
  fi
}

confirm() {
  local prompt="$1"
  read -p "$prompt [y/N] " -r
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
  fi
}

# -----------------------------------------------------------------------------
# reset — port of the old git-reset.sh
# -----------------------------------------------------------------------------

cmd_reset() {
  require_git_repo

  local target_commit="${1:-}"

  if [[ -z "$target_commit" ]]; then
    echo "用法:"
    echo "  $SCRIPT_NAME reset <commit>"
    echo "  (for tag deletes use: $SCRIPT_NAME delete-tag <tag>)"
    exit 1
  fi

  local cur_branch
  cur_branch=$(git rev-parse --abbrev-ref HEAD)

  echo "======================================"
  echo "当前分支: $cur_branch"
  echo "回退目标commit: $target_commit"
  echo "======================================"
  echo "⚠️  警告：会丢弃当前分支之后所有提交，改写远程历史！"
  confirm "确认继续?"

  git reset --hard "$target_commit"
  git push origin "${cur_branch}" --force-with-lease

  echo ""
  echo "✅完成。当前HEAD："
  git log -1 --oneline
}

# -----------------------------------------------------------------------------
# set-tag — create a local tag and push it to origin
# -----------------------------------------------------------------------------

cmd_set_tag() {
  require_git_repo

  if [[ $# -lt 1 ]]; then
    echo "用法: $SCRIPT_NAME set-tag <tag> [commit] [--lightweight]"
    echo "  默认: annotated tag at HEAD, message = 'Tag <tag> at <short-sha>'"
    exit 1
  fi

  local tag="$1"
  shift

  local lightweight=false
  local commit="HEAD"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lightweight|-l) lightweight=true; shift ;;
      -*) echo "未知参数: $1" >&2; exit 1 ;;
      *)
        # First non-flag positional is the commit ref
        if [[ "$commit" == "HEAD" ]]; then
          commit="$1"
          shift
        else
          echo "多余的位置参数: $1" >&2
          exit 1
        fi
        ;;
    esac
  done

  # Resolve short sha for the auto-generated message
  local short_sha
  short_sha=$(git rev-parse --short "$commit" 2>/dev/null) || {
    echo "❌ Error: 无法解析 commit: $commit" >&2
    exit 1
  }

  # Bail if the tag already exists locally
  if git rev-parse "$tag" >/dev/null 2>&1; then
    echo "❌ Error: tag $tag 已存在 (本地)。先删除: $SCRIPT_NAME delete-tag $tag" >&2
    exit 1
  fi

  echo "======================================"
  echo "新建tag:    $tag"
  echo "指向commit: $commit ($short_sha)"
  echo "类型:       $($lightweight && echo "lightweight" || echo "annotated")"
  echo "将push到:   origin"
  echo "======================================"
  confirm "确认创建并推送?"

  if $lightweight; then
    git tag "$tag" "$commit"
  else
    git tag -a "$tag" "$commit" -m "Tag $tag at $short_sha"
  fi

  git push origin "$tag"

  echo ""
  echo "✅完成。tag $tag 已创建并推送到 origin"
  echo "  验证: git ls-remote origin $tag"
}

# -----------------------------------------------------------------------------
# delete-tag — local / remote / both
# -----------------------------------------------------------------------------

cmd_delete_tag() {
  require_git_repo

  if [[ $# -lt 1 ]]; then
    echo "用法: $SCRIPT_NAME delete-tag <tag> [--local|--remote]"
    echo "  默认同时删除本地 + 远程"
    exit 1
  fi

  local tag="$1"
  shift
  local do_local=true
  local do_remote=true
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --local)  do_local=true;  do_remote=false; shift ;;
      --remote) do_local=false; do_remote=true;  shift ;;
      *) echo "未知参数: $1" >&2; exit 1 ;;
    esac
  done

  local scope=""
  $do_local  && scope+="本地 "
  $do_remote && scope+="远程 "
  echo "======================================"
  echo "删除tag: $tag"
  echo "范围: ${scope}"
  echo "======================================"
  confirm "确认删除?"

  if $do_local; then
    if git tag -d "$tag" 2>/dev/null; then
      echo "✅ 本地 tag $tag 已删除"
    else
      echo "⚠️  本地不存在 tag $tag (跳过)"
    fi
  fi

  if $do_remote; then
    if git push origin --delete "$tag" 2>/dev/null; then
      echo "✅ 远程 tag $tag 已删除"
    else
      echo "⚠️  远程删除失败 (tag 不存在或无权限)" >&2
    fi
  fi
}

# -----------------------------------------------------------------------------
# require_gh — shared gh CLI + auth check for call-workflow / list-workflow
# -----------------------------------------------------------------------------

require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "❌ Error: gh CLI 未安装" >&2
    echo "" >&2
    echo "安装:" >&2
    echo "  macOS:  brew install gh" >&2
    echo "  其他:    https://cli.github.com/manual/installation" >&2
    echo "" >&2
    echo "安装后请先认证:  gh auth login" >&2
    exit 127
  fi

  if ! gh auth status >/dev/null 2>&1; then
    echo "❌ Error: gh CLI 未认证" >&2
    echo "请先运行:  gh auth login" >&2
    exit 1
  fi
}

# -----------------------------------------------------------------------------
# call-workflow — trigger a GitHub Actions workflow via gh CLI
# -----------------------------------------------------------------------------

cmd_call_workflow() {
  if [[ $# -lt 1 ]]; then
    echo "用法: $SCRIPT_NAME call-workflow <workflow-file-or-id> [-f key=val ...]"
    echo "示例: $SCRIPT_NAME call-workflow deploy.yml -f environment=prod -f commit=HEAD"
    exit 1
  fi

  require_gh

  local workflow="$1"
  shift
  local -a inputs=()
  local has_inputs=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -f|--field) inputs+=(-f "$2"); has_inputs=true; shift 2 ;;
      *) echo "未知参数: $1" >&2; exit 1 ;;
    esac
  done

  echo "======================================"
  echo "触发 workflow: $workflow"
  if $has_inputs; then
    echo "inputs:"
    printf '  %s\n' "${inputs[@]}"
  fi
  echo "======================================"

  # Use the `+ "${array[@]}"` form so the expansion is a no-op when the array
  # is empty (avoids bash 3.2 + set -u "unbound variable" on "${array[@]}").
  if $has_inputs; then
    gh workflow run "$workflow" "${inputs[@]}"
  else
    gh workflow run "$workflow"
  fi

  echo ""
  echo "✅ 已触发。查看 run:"
  echo "  gh run list --workflow=\"$workflow\" --limit 1"
  echo "  gh run watch \$(gh run list --workflow=\"$workflow\" --limit 1 --json databaseId -q '.[0].databaseId')"
}

# -----------------------------------------------------------------------------
# list-workflow — list remote GitHub Actions workflows
# -----------------------------------------------------------------------------

cmd_list_workflow() {
  require_gh

  echo "======================================"
  echo "远程 workflows:"
  echo "======================================"
  # gh workflow list prints a table; --no-table keeps it parseable if piped.
  gh workflow list
}

# -----------------------------------------------------------------------------
# entry point
# -----------------------------------------------------------------------------

cmd="${1:-help}"
case "$cmd" in
  reset)              shift; cmd_reset "$@" ;;
  set-tag|st)         shift; cmd_set_tag "$@" ;;
  delete-tag)         shift; cmd_delete_tag "$@" ;;
  call-workflow|cw)   shift; cmd_call_workflow "$@" ;;
  list-workflow|lw)   shift; cmd_list_workflow "$@" ;;
  help|--help|-h|"") usage ;;
  *) echo "未知命令: $cmd"; echo; usage; exit 1 ;;
esac