#!/usr/bin/env bash
set -euo pipefail

# run.sh — 統合エージェントランナーハーネス (CYBER-DOME: Neon Automata 版)
# 使い方: .shared-agents/harness/run.sh <agent-name> "<task-description>"

readonly AGENT_NAME="${1:?"使い方: run.sh <agent-name> <task-description>"}"
readonly TASK="${2:?"使い方: run.sh <agent-name> <task-description>"}"
readonly SHARED_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly PROMPT_FILE="${SHARED_DIR}/prompts/${AGENT_NAME}.md"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "エラー: エージェントプロンプトが見つかりません: $PROMPT_FILE"
  echo "利用可能なエージェント:"
  for f in "$SHARED_DIR"/prompts/*.md; do
    echo "  - $(basename "$f" .md)"
  done
  exit 1
fi

run_opencode() {
  if command -v opencode &>/dev/null; then
    echo "[harness] opencode でエージェント '${AGENT_NAME}' を実行中..."
    opencode --agent "${AGENT_NAME}" --prompt "${TASK}"
    return $?
  fi
  return 1
}

run_claude() {
  if command -v claude &>/dev/null; then
    echo "[harness] claude code でエージェント '${AGENT_NAME}' を実行中..."
    claude --allowedTools "Bash, Edit, Read, Glob, Grep, Write, WebFetch" \
      --agent "${AGENT_NAME}" "${TASK}"
    return $?
  fi
  return 1
}

run_antigravity() {
  if command -v antigravity &>/dev/null; then
    echo "[harness] antigravity でエージェント '${AGENT_NAME}' を実行中..."
    antigravity run "${AGENT_NAME}" "${TASK}"
    return $?
  fi
  return 1
}

# 優先順位に従って実行を試みる (opencode -> claude -> antigravity)
run_opencode || run_claude || run_antigravity || {
  echo "エラー: サポートされているエージェントツールが見つかりません (opencode, claude, antigravity)。"
  echo "いずれかをインストールしてから再試行してください。"
  exit 1
}
