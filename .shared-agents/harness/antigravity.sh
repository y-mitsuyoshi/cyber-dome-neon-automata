#!/usr/bin/env bash
set -euo pipefail

# Antigravity 経由でエージェントを実行
# 使い方: .shared-agents/harness/antigravity.sh <agent-name> "<task-description>"

readonly AGENT_NAME="${1:?"使い方: antigravity.sh <agent-name> <task-description>"}"
readonly TASK="${2:?"使い方: antigravity.sh <agent-name> <task-description>"}"

if ! command -v antigravity &>/dev/null; then
  echo "エラー: antigravity CLI が見つかりません。"
  exit 1
fi

exec antigravity run "${AGENT_NAME}" "${TASK}"
