# Claude Code用MCPメモリサーバー

Model Context Protocol (MCP) サーバーは、Claude Codeの開発セッションで永続的なメモリ管理を提供します。長時間の開発セッション中のコンテキスト喪失問題を、グローバルユーザー設定とプロジェクト固有のメモリの両方を維持することで解決します。

## 🎯 目的

- **問題**: Claude Codeは長時間のセッション中にメモリ（コンテキスト）を失う
- **解決策**: デュアルデータベースアーキテクチャによる永続的なメモリ管理を提供するMCPサーバー

## ✨ 機能

### 1. グローバルメモリ（ユーザーレベル）
- 開発設定（例：「pnpmを使用」「TypeScriptを優先」）
- コミュニケーション設定（例：「日本語で応答」）
- 共通の開発パターンとスタイル
- すべてのプロジェクトで永続化

### 2. プロジェクトメモリ（プロジェクト固有）
- 要件と設計決定を含むIssueコンテキスト
- ステータス追跡付きタスクリスト
- セッション復元用の開発チェックポイント
- ブランチと変更ファイルを含むセッション状態
- 設定可能なトリガーによる自動保存機能

## 📦 インストール

### クイックインストール（macOS/Linux）

```bash
# リポジトリをクローン
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# インストールスクリプトを実行
chmod +x scripts/install.sh
./scripts/install.sh
```

インストールスクリプトは以下を実行します：
1. 依存関係のインストール
2. プロジェクトのビルド
3. ディレクトリ構造の設定
4. Claude Desktopの自動設定
5. 初期設定の作成

### 手動インストール

```bash
# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build

# ディレクトリ構造を作成
mkdir -p ~/.claude/mcp-memory/{global,projects,backups,logs}

# ビルドファイルをコピー
cp -r dist ~/.claude/mcp-memory/
cp package.json ~/.claude/mcp-memory/
cp -r node_modules ~/.claude/mcp-memory/
```

### Claude Desktop設定

Claude Desktopの設定ファイルに追加：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["~/.claude/mcp-memory/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_MEMORY_CONFIG": "~/.claude/mcp-memory/config.json"
      }
    }
  }
}
```

## 🛠️ 使い方

### 利用可能なMCPツール

サーバーは以下のツールをClaudeに公開します：

- `save_global_preference` - グローバル設定を保存
- `get_global_preference` - グローバル設定を取得
- `save_project_context` - プロジェクト固有のコンテキストを保存
- `get_project_context` - プロジェクトコンテキストを取得
- `save_issue_context` - 現在のIssue詳細を保存
- `save_tasks` - タスクリストを保存
- `save_session_state` - 現在のセッション状態を保存
- `create_checkpoint` - 開発チェックポイントを作成
- `list_checkpoints` - 利用可能なチェックポイントを一覧表示
- `restore_checkpoint` - チェックポイントから復元
- `health` - サーバーの健全性ステータスを確認

### Claudeでの使用例

```
「pnpmをnpmより優先して使うことを覚えて」
「現在のIssueコンテキストを保存して」
「リファクタリング前にチェックポイントを作成」
「このプロジェクトで何を作業していた？」
「最後のチェックポイントから復元」
```

### 開発ワークフロー

1. **新しいIssueの開始**：
   - Claudeは自動的に前のプロジェクトコンテキストを取得
   - Issue要件と設計決定がロードされる
   - タスクリストが最後のセッションから復元される

2. **開発中**：
   - タスク完了とテスト成功時に自動保存がトリガー
   - 手動チェックポイントはいつでも作成可能
   - セッション状態は継続的に更新される

3. **コンテキストリセット後**：
   - 前の状態が自動的に復元される
   - 最後のチェックポイントから作業を継続
   - 手動でのコンテキスト再構築は不要

## 📁 プロジェクト構造

```
mcp-memory-server/
├── src/
│   ├── index.ts              # MCPサーバーエントリーポイント
│   ├── server/               # MCPサーバー実装
│   ├── services/             # コアサービス
│   │   ├── MemoryManager.ts  # メモリ管理ロジック
│   │   ├── CheckpointManager.ts # チェックポイント機能
│   │   └── AutoSaveService.ts # 自動保存トリガー
│   ├── db/                   # データベース層
│   │   ├── DatabaseManager.ts # マルチDB管理
│   │   └── schemas/          # Drizzle ORMスキーマ
│   ├── repositories/         # データアクセス層
│   ├── api/                  # APIハンドラー
│   └── types/                # TypeScript定義
├── scripts/
│   └── install.sh           # インストールスクリプト
├── docs/
│   └── QUICKSTART.md        # クイックスタートガイド
└── claude_desktop_config*.json # プラットフォーム設定
```

## ⚙️ 設定

設定ファイルの場所: `~/.claude/mcp-memory/config.json`

```json
{
  "storage": {
    "basePath": "~/.claude/mcp-memory",
    "globalDbPath": "~/.claude/mcp-memory/global.db",
    "projectsPath": "~/.claude/mcp-memory/projects"
  },
  "performance": {
    "enableCache": true,
    "cacheSize": 100,
    "cacheTTL": 300000
  },
  "autoSave": {
    "enabled": true,
    "interval": 30,
    "triggers": ["task_complete", "test_pass"]
  }
}
```

## 🔧 開発

```bash
# ホットリロードでの開発
npm run dev

# テストの実行
npm run test
npm run test:watch
npm run test:coverage

# リントとフォーマット
npm run lint
npm run format

# 型チェック
npm run typecheck
```

## 📚 ドキュメント

### 利用可能な言語
- 🇯🇵 **日本語**: このREADMEと`docs/*.ja.md`のすべてのドキュメント
- 🇬🇧 **English**: [README.md](README.md)と`docs/`のすべてのドキュメント

### クイックリンク
- [クイックスタートガイド](docs/QUICKSTART.ja.md) - すぐに始める
- [インストールガイド](docs/INSTALLATION.ja.md) - 詳細なインストール手順
- [使用ガイド](docs/USAGE.ja.md) - 効果的な使い方
- [CLAUDE.md](CLAUDE.md) - Claude Code用の開発ガイドライン

### 完全なドキュメント
包括的なドキュメントについては[docs/README.ja.md](docs/README.ja.md)を参照してください：

#### はじめに
- **[クイックスタートガイド](docs/QUICKSTART.ja.md)** ([English](docs/QUICKSTART.md))
- **[インストールガイド](docs/INSTALLATION.ja.md)** ([English](docs/INSTALLATION.md))
- **[使用ガイド](docs/USAGE.ja.md)** ([English](docs/USAGE.md))

#### 高度なトピック（近日公開）
- **設定ガイド** - 高度な設定オプション
- **APIリファレンス** - 詳細なAPIドキュメント
- **アーキテクチャ概要** - システム設計とアーキテクチャ
- **セキュリティガイド** - セキュリティのベストプラクティス
- **トラブルシューティング** - 一般的な問題と解決策

## 🛡️ セキュリティ

- パス検証によりディレクトリトラバーサル攻撃を防止
- ハッシュ化されたパスによるプロジェクトデータベースの分離
- 機密データの暗号化サポート（MVP後）
- 外部ネットワークリクエストなし

## 🚀 ロードマップ

### MVP（現在）
- ✅ コアメモリ管理
- ✅ チェックポイントシステム
- ✅ 自動保存機能
- ✅ ヘルスモニタリング
- ✅ インストール自動化

### MVP後
- [ ] データ暗号化
- [ ] バックアップ/復元機能
- [ ] メモリ閲覧用Web UI
- [ ] マルチユーザーサポート
- [ ] クラウド同期機能

## 🤝 貢献

貢献を歓迎します！PRを提出する前に貢献ガイドラインをお読みください。

## 📝 ライセンス

MITライセンス - 詳細はLICENSEファイルを参照してください