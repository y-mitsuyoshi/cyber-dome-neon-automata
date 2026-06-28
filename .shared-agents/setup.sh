#!/usr/bin/env bash
set -euo pipefail

# setup.sh — AIエージェントハーネスの環境初期化スクリプト
# 各ツール (Claude Code, OpenCode, Antigravity CLI) の設定ディレクトリにシンボリックリンクを作成し、
# Gitのコミット前検証フックをインストールします。

readonly WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly PROMPTS_DIR="${WORKSPACE_DIR}/.shared-agents/prompts"

echo "AIエージェントハーネスの初期化処理を開始します..."

# 1. 必要なディレクトリの作成
mkdir -p "${WORKSPACE_DIR}/.claude/rules"
mkdir -p "${WORKSPACE_DIR}/.opencode/agents"
mkdir -p "${WORKSPACE_DIR}/.antigravitycli"
mkdir -p "${WORKSPACE_DIR}/.agents"

# 2. Claude Code と OpenCode のエージェントシンボリックリンクの作成
echo "-> エージェントプロンプトのシンボリックリンクを作成中..."
for filepath in "${PROMPTS_DIR}"/*.md; do
  filename=$(basename "$filepath")
  
  # Claude Code 用シンボリックリンクの作成
  dest_claude="${WORKSPACE_DIR}/.claude/rules/${filename}"
  rm -f "$dest_claude"
  ln -sf "../../.shared-agents/prompts/${filename}" "$dest_claude"
  
  # OpenCode 用シンボリックリンクの作成
  dest_opencode="${WORKSPACE_DIR}/.opencode/agents/${filename}"
  rm -f "$dest_opencode"
  ln -sf "../../.shared-agents/prompts/${filename}" "$dest_opencode"
done

# 3. .antigravitycli/agents.json の生成
echo "-> .antigravitycli/agents.json を作成中..."
cat << 'EOF' > "${WORKSPACE_DIR}/.antigravitycli/agents.json"
{
  "name": "cyber-dome-neon-automata",
  "description": "CYBER-DOME: Neon Automata Multi-Agent Workspace",
  "agents": {
    "prd-manager": {
      "role": "Product Manager",
      "prompt": ".shared-agents/prompts/prd-manager.md",
      "model": "gemini-3.5-flash"
    },
    "architect": {
      "role": "Domain Architect",
      "prompt": ".shared-agents/prompts/architect.md",
      "model": "gemini-3.5-flash"
    },
    "architect-reviewer": {
      "role": "Architecture Reviewer",
      "prompt": ".shared-agents/prompts/architect-reviewer.md",
      "model": "gemini-3.5-flash"
    },
    "implementer": {
      "role": "Implementer",
      "prompt": ".shared-agents/prompts/implementer.md",
      "model": "gemini-3.5-flash"
    },
    "implementer-reviewer": {
      "role": "Code Reviewer",
      "prompt": ".shared-agents/prompts/implementer-reviewer.md",
      "model": "gemini-3.5-flash"
    },
    "qa-engineer": {
      "role": "QA Engineer",
      "prompt": ".shared-agents/prompts/qa-engineer.md",
      "model": "gemini-3.5-flash"
    },
    "tech-lead": {
      "role": "Tech Lead",
      "prompt": ".shared-agents/prompts/tech-lead.md",
      "model": "gemini-3.5-flash"
    },
    "sre": {
      "role": "SRE",
      "prompt": ".shared-agents/prompts/sre.md",
      "model": "gemini-3.5-flash"
    },
    "project-manager": {
      "role": "Project Manager",
      "prompt": ".shared-agents/prompts/project-manager.md",
      "model": "gemini-3.5-flash"
    }
  },
  "hooks": {}
}
EOF

# 4. .opencode/opencode.json の生成
echo "-> .opencode/opencode.json を作成中..."
cat << 'EOF' > "${WORKSPACE_DIR}/.opencode/opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "gemini": {}
  }
}
EOF

# 5. Git pre-commit フックのインストール (Git管理下の場合)
if [[ -d "${WORKSPACE_DIR}/.git" ]]; then
  echo "-> Git pre-commit フックをインストール中..."
  readonly PRE_COMMIT="${WORKSPACE_DIR}/.git/hooks/pre-commit"
  
  cat << 'EOF' > "$PRE_COMMIT"
#!/usr/bin/env bash
# Git pre-commit フック - コミット前に自動的に検証を実行します。

set -euo pipefail

echo "=== [Git Pre-commit Hook] 検証スクリプトを実行中... ==="
./.shared-agents/harness/verify.sh
EOF

  chmod +x "$PRE_COMMIT"
  echo "✓ pre-commit フックのインストールが完了しました。"
else
  echo "[警告] .git ディレクトリが見つからないため、Git pre-commit フックのインストールをスキップしました。"
fi

echo "AIエージェントハーネスの初期化処理が正常に完了しました！"
