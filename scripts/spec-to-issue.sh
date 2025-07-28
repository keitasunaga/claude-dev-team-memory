#!/bin/bash

# spec-to-issue: 仕様書からGitHub Issueを自動生成するコマンド
# Usage: spec-to-issue [spec-name]

# Node.jsが必要
if ! command -v node &> /dev/null; then
    echo "❌ エラー: Node.jsがインストールされていません"
    exit 1
fi

# GitHub CLIが必要
if ! command -v gh &> /dev/null; then
    echo "❌ エラー: GitHub CLI (gh) がインストールされていません"
    echo "インストール方法: https://cli.github.com/"
    exit 1
fi

# スクリプトのディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# TypeScriptファイルを実行
cd "$PROJECT_ROOT" || exit 1

# tsx がインストールされているか確認
if ! command -v tsx &> /dev/null; then
    # npm installを実行
    if [ ! -d "node_modules" ]; then
        echo "📦 依存関係をインストール中..."
        npm install
    fi
    
    # npx tsxで実行
    npx tsx src/spec-to-issue.ts "$@"
else
    # tsxで直接実行
    tsx src/spec-to-issue.ts "$@"
fi