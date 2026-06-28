#!/usr/bin/env bash
# verify.sh — プロジェクト全体のテストとバリデーションを実行するスクリプト

set -euo pipefail

# ANSIカラー定義
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

readonly WORKSPACE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo -e "${YELLOW}=== プロジェクトバリデーションを開始します ===${NC}"

# 1. バックエンド (Go) のチェック
echo -e "\n${YELLOW}[1/2] Go バックエンドのチェック中...${NC}"
cd "${WORKSPACE_DIR}/backend"

echo "-> Goフォーマットチェック..."
if ! go fmt ./...; then
  echo -e "${RED}エラー: go fmt に失敗しました。${NC}"
  exit 1
fi

echo "-> Go静的解析 (go vet)..."
if ! go vet ./...; then
  echo -e "${RED}エラー: go vet に失敗しました。${NC}"
  exit 1
fi

echo "-> Goテスト実行..."
if ! go test ./...; then
  echo -e "${RED}エラー: Goのユニットテストに失敗しました。${NC}"
  exit 1
fi
echo -e "${GREEN}✓ バックエンドチェック成功!${NC}"

# 2. フロントエンド (React/TypeScript) のチェック
echo -e "\n${YELLOW}[2/2] React フロントエンドのチェック中...${NC}"
cd "${WORKSPACE_DIR}/frontend"

echo "-> ESLintによるコードチェック..."
if ! npm run lint; then
  echo -e "${RED}エラー: ESLintで警告・エラーが検出されました。${NC}"
  exit 1
fi

echo "-> TypeScript型チェック (tsc)..."
# 注意: tsc -b の失敗をログに出力しますが、今回はデモ用に警告として表示するなどの対応も可能ですが、
# 原則として厳密にチェックするために失敗時はエラー終了させます。
if ! npx tsc -b; then
  echo -e "${RED}エラー: TypeScript型チェックに失敗しました。${NC}"
  exit 1
fi

echo "-> フロントエンドテスト実行 (Vitest)..."
if ! npm run test; then
  echo -e "${RED}エラー: フロントエンドのユニットテストに失敗しました。${NC}"
  exit 1
fi
echo -e "${GREEN}✓ フロントエンドチェック成功!${NC}"

echo -e "\n${GREEN}=== すべてのチェックが正常にパスしました！ ===${NC}"
exit 0
