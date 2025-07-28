# Claude Dev Team Memory Server

Claude Code用のカスタムMCPメモリサーバー実装です。長時間の開発セッションでコンテキストを失わないよう、2層のメモリ管理を提供します。

## 🎯 目的

- **問題**: Claude Codeは長時間実行時にメモリ（コンテキスト）を失う
- **解決**: MCPサーバーで永続的なメモリ管理を実現

## 📁 構造

```
claude-dev-team-memory/
├── src/
│   ├── index.ts          # MCPサーバーメイン
│   ├── memory-manager.ts # メモリ管理ロジック
│   └── types.ts          # 型定義
├── data/
│   ├── global/           # ユーザーレベル設定
│   └── projects/         # プロジェクト別メモリ
├── package.json
└── README.md
```

## 🚀 機能

### 1. グローバルメモリ（ユーザーレベル）
- 開発スタイル（pnpm使用、Docker使用など）
- コミュニケーション設定（日本語で回答など）
- 共通の開発パターン

### 2. プロジェクトメモリ（dev-team用）
- Issue情報（要件、設計、タスク）
- 進捗状態の自動保存
- チェックポイント機能

## 📦 インストール

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# Claude Desktopに設定
# ~/Library/Application Support/Claude/claude_desktop_config.json
```

## 🛠️ 使い方

### 基本コマンド
- `save_global_preference` - グローバル設定を保存
- `save_project_memory` - プロジェクト情報を保存
- `get_current_state` - 現在の作業状態を取得
- `create_checkpoint` - チェックポイント作成

### dev-teamワークフロー
1. Issue開始時に自動的に前回の状態を復元
2. タスク完了時に自動チェックポイント
3. コンパクト後も作業継続可能

## 📝 ライセンス

MIT