# MCPメモリサーバー クイックスタートガイド

MCPメモリサーバーへようこそ！このガイドでは、Claude CodeとClaude Desktop用の永続的なメモリ管理を始めるお手伝いをします。

## 前提条件

- Node.js 20以上
- npmまたはpnpm
- Claude DesktopまたはClaude Code CLI

## インストール

### macOS/Linux

```bash
# リポジトリをクローン
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# インストールスクリプトを実行
chmod +x scripts/install.sh
./scripts/install.sh
```

### Windows

```powershell
# リポジトリをクローン
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# 依存関係をインストール
npm install --production

# プロジェクトをビルド
npm run build

# ディレクトリ構造を作成
mkdir "$env:USERPROFILE\.claude\mcp-memory"
mkdir "$env:USERPROFILE\.claude\mcp-memory\global"
mkdir "$env:USERPROFILE\.claude\mcp-memory\projects"
mkdir "$env:USERPROFILE\.claude\mcp-memory\backups"
mkdir "$env:USERPROFILE\.claude\mcp-memory\logs"

# ファイルをコピー
Copy-Item -Recurse dist "$env:USERPROFILE\.claude\mcp-memory\"
Copy-Item package.json "$env:USERPROFILE\.claude\mcp-memory\"
Copy-Item -Recurse node_modules "$env:USERPROFILE\.claude\mcp-memory\"

```

## 設定

### 方法1: Claude Code CLI（推奨）

MCPメモリサーバーを使用する最も簡単な方法はClaude Code CLIを使用することです：

```bash
# MCPサーバーを追加
claude mcp add memory node ~/.claude/mcp-memory/dist/index.js

# Windowsの場合、フルパスを使用：
claude mcp add memory node %USERPROFILE%\.claude\mcp-memory\dist\index.js

# 追加されたことを確認
claude mcp list

# サーバーの詳細を確認
claude mcp get memory
```

追加後、Claude Codeでメモリツールを使用できます：
1. `/mcp`と入力して利用可能なサーバーとツールを表示
2. 会話で自然にメモリコマンドを使用

### 方法2: Claude Desktop設定

Claude Desktopを使用する場合は、手動で設定します：

1. Claude Desktopの設定ファイルを見つけます：
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. MCPメモリサーバーの設定を追加：

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

Windows用：
```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["%USERPROFILE%\\.claude\\mcp-memory\\dist\\index.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_MEMORY_CONFIG": "%USERPROFILE%\\.claude\\mcp-memory\\config.json"
      }
    }
  }
}
```

3. Claude Desktopを再起動

## MCPメモリサーバーの使い方

インストールが完了すると、MCPメモリサーバーは以下の機能を提供します：

### グローバル設定

すべてのプロジェクトで永続化される開発設定を保存：

```
- 言語設定（例：「日本語で応答」）
- コミットメッセージスタイル（例：「Conventional Commitsを使用」）
- パッケージマネージャーの設定（例：「pnpmを使用」）
- テスト要件（例：「80%以上のカバレッジ」）
```

### プロジェクトメモリ

サーバーは自動的に以下を追跡：

- 現在のIssueコンテキスト
- タスクリストと進捗
- セッション状態
- 開発チェックポイント

### 利用可能なコマンド

サーバーはClaudeに以下のツールを公開：

- `save_global_preference` - グローバル設定を保存
- `get_global_preference` - グローバル設定を取得
- `save_project_context` - プロジェクト固有のコンテキストを保存
- `get_project_context` - プロジェクトコンテキストを取得
- `create_checkpoint` - 開発チェックポイントを作成
- `list_checkpoints` - 利用可能なチェックポイントを一覧表示
- `restore_checkpoint` - チェックポイントから復元
- `health` - サーバーの健全性ステータスを確認

## 使用例

Claudeと作業する際、以下のように話しかけることができます：

- 「npmよりpnpmを優先することを覚えて」
- 「現在のIssueコンテキストを保存」
- 「リファクタリング前にチェックポイントを作成」
- 「このプロジェクトで何を作業していた？」
- 「最後のチェックポイントから復元」

## 設定

サーバー設定は `~/.claude/mcp-memory/config.json` に保存されます：

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

## トラブルシューティング

### サーバーが起動しない

1. Claude Desktopのログでエラーを確認
2. Node.jsのバージョンを確認: `node --version` （20以上である必要があります）
3. インストールディレクトリのファイル権限を確認
4. 手動でサーバーを実行してみる: `node ~/.claude/mcp-memory/dist/index.js`

### メモリが永続化されない

1. データベースファイルが `~/.claude/mcp-memory/` に存在するか確認
2. ディレクトリの書き込み権限を確認
3. サーバーの健全性を確認: Claudeに「メモリサーバーの健全性を確認」と依頼

### インストールの問題

1. すべての前提条件がインストールされていることを確認
2. 設定ファイルのパスが正しいことを確認
3. スクリプトが失敗する場合は手動インストールを試す

## アンインストール

MCPメモリサーバーをアンインストールするには：

### macOS/Linux
```bash
~/.claude/mcp-memory/uninstall.sh
```

### Windows
1. Claude Desktopの設定からサーバー設定を削除
2. ディレクトリを削除: `rmdir /s "%USERPROFILE%\.claude\mcp-memory"`

## サポート

問題や質問がある場合：
- [完全なドキュメント](../README.ja.md)を確認
- [GitHub](https://github.com/your-username/mcp-memory-server/issues)で問題を報告

## 次のステップ

- 高度な使用方法については[APIドキュメント](API.ja.md)を確認
- [カスタム設定](CONFIG.ja.md)について学ぶ
- [セキュリティのベストプラクティス](SECURITY.ja.md)を読む