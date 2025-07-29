# インストールガイド

このガイドでは、MCPメモリサーバーの各プラットフォームでの詳細なインストール手順を説明します。

## 前提条件

インストール前に以下を確認してください：

- Node.js 20以上
- npmまたはpnpmパッケージマネージャー
- Claude DesktopまたはClaude Code CLI
- Git（リポジトリのクローン用）

### 前提条件の確認

```bash
# Node.jsのバージョンを確認
node --version  # v20.x.x以上である必要があります

# npmのバージョンを確認
npm --version

# Claude Desktopがインストールされているか確認
# macOS
ls "/Applications/Claude.app" 2>/dev/null && echo "Claude Desktopが見つかりました" || echo "Claude Desktopが見つかりません"

# Windows
if exist "%LOCALAPPDATA%\Programs\Claude\Claude.exe" (echo Claude Desktopが見つかりました) else (echo Claude Desktopが見つかりません)

# Claude Code CLIがインストールされているか確認
claude --version
```

## 自動インストール

### macOS/Linux

セットアッププロセス全体を処理するインストールスクリプトを提供しています：

```bash
# リポジトリをクローン
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# スクリプトを実行可能にする
chmod +x scripts/install.sh

# インストールを実行
./scripts/install.sh
```

スクリプトは以下を実行します：
1. 前提条件をチェック
2. 依存関係をインストール
3. プロジェクトをビルド
4. ディレクトリ構造を作成
5. インストールディレクトリにファイルをコピー
6. Claude Desktopを自動的に設定（インストールされている場合）
7. デフォルトの設定ファイルを作成
8. Claude Code CLIのセットアップ手順を提供

### スクリプトが作成する構造

```bash
# 作成されるディレクトリ構造
~/.claude/mcp-memory/
├── dist/           # コンパイル済みJavaScriptファイル
├── global/         # グローバル設定データベース
├── projects/       # プロジェクト固有のデータベース
├── backups/        # バックアップストレージ
├── logs/           # サーバーログ
├── config.json     # サーバー設定
└── uninstall.sh    # アンインストールスクリプト
```

## 手動インストール

### ステップ1: クローンとビルド

```bash
# リポジトリをクローン
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build
```

### ステップ2: ディレクトリ構造を作成

#### macOS/Linux
```bash
# MCPディレクトリを作成
mkdir -p ~/.claude/mcp-memory/{global,projects,backups,logs}

# ビルドファイルをコピー
cp -r dist ~/.claude/mcp-memory/
cp package.json ~/.claude/mcp-memory/
cp -r node_modules ~/.claude/mcp-memory/
```

#### Windows (PowerShell)
```powershell
# MCPディレクトリを作成
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\mcp-memory\global"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\mcp-memory\projects"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\mcp-memory\backups"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\mcp-memory\logs"

# ビルドファイルをコピー
Copy-Item -Recurse dist "$env:USERPROFILE\.claude\mcp-memory\"
Copy-Item package.json "$env:USERPROFILE\.claude\mcp-memory\"
Copy-Item -Recurse node_modules "$env:USERPROFILE\.claude\mcp-memory\"
```

### ステップ3: Claude環境を設定

#### 方法A: Claude Code CLIを使用（推奨）

```bash
# MCPサーバーをClaude Codeに追加
claude mcp add memory node ~/.claude/mcp-memory/dist/index.js

# Windowsの場合：
claude mcp add memory node %USERPROFILE%\.claude\mcp-memory\dist\index.js

# インストールを確認
claude mcp list

# サーバーの詳細を確認
claude mcp get memory
```

追加後、Claude Codeでメモリツールを使用できます：
- `/mcp`と入力して利用可能なサーバーとツールを表示
- 会話で自然にメモリコマンドを使用

#### 方法B: Claude Desktopを設定

Claude Desktopの設定ファイルを見つけます：

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

MCPメモリサーバーの設定を追加：

#### macOS/Linux設定
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

#### Windows設定
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

### ステップ4: 設定ファイルを作成

`~/.claude/mcp-memory/config.json`を作成：

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
    "cacheTTL": 300000,
    "connectionPoolSize": 5,
    "enableWAL": true,
    "busyTimeout": 5000
  },
  "autoSave": {
    "enabled": true,
    "interval": 30,
    "triggers": ["task_complete", "test_pass", "checkpoint_created"],
    "maxRetries": 3,
    "retryDelay": 1000
  },
  "logging": {
    "level": "info",
    "file": "~/.claude/mcp-memory/logs/mcp-memory.log",
    "maxFiles": 5,
    "maxSize": "10m"
  }
}
```

### ステップ5: Claudeアプリケーションを再起動

- **Claude Desktop**: 変更を有効にするためにClaude Desktopを再起動
- **Claude Code CLI**: 変更は即座に有効になります

## 検証

### インストールの確認

#### Claude Code CLIの場合
1. Claude Codeを開く
2. `/mcp`と入力してメモリサーバーがリストされているか確認
3. Claudeに尋ねる：「メモリサーバーの健全性を確認できますか？」

#### Claude Desktopの場合
1. Claude Desktopを開く
2. 会話でClaudeに尋ねる：「メモリサーバーの健全性を確認できますか？」
3. Claudeが`health`ツールを使用してサーバーステータスを報告できるはずです

### 基本機能のテスト

```
あなた: 「npmの代わりにpnpmを使うことを覚えて」
Claude: [save_global_preferenceツールを使用]

あなた: 「私の開発設定は何？」
Claude: [get_global_preferenceツールを使用して保存した設定を表示]
```

### ログの確認

```bash
# サーバーログを表示
tail -f ~/.claude/mcp-memory/logs/mcp-memory.log
```

## インストールのトラブルシューティング

### よくある問題

#### 1. サーバーが起動しない

**症状**: Claudeがメモリツールにアクセスできない

**解決策**:
- Node.jsのバージョンを確認: `node --version` （20以上である必要があります）
- ファイル権限を確認: `ls -la ~/.claude/mcp-memory/`
- Claude Desktopのログでエラーを確認
- 手動で実行してみる: `node ~/.claude/mcp-memory/dist/index.js`

#### 2. 権限拒否エラー

**macOS/Linux**:
```bash
# 権限を修正
chmod -R 755 ~/.claude/mcp-memory
chmod +x ~/.claude/mcp-memory/dist/index.js
```

#### 3. モジュールが見つからないエラー

```bash
# 依存関係を再インストール
cd ~/.claude/mcp-memory
npm install --production
```

#### 4. 設定が読み込まれない

- 設定ファイルが存在することを確認: `~/.claude/mcp-memory/config.json`
- JSON構文を検証
- ファイル権限を確認

### プラットフォーム固有の問題

#### macOS

「操作が許可されていません」エラーが発生する場合：
1. システム環境設定 → セキュリティとプライバシーに移動
2. ターミナル/iTermにフルディスクアクセスを付与

#### Windows

パスが正しく解決されない場合：
1. `~`や`%USERPROFILE%`の代わりにフルパスを使用
2. JSONでフォワードスラッシュまたはエスケープされたバックスラッシュを使用

#### Linux

非標準のシェルを使用している場合：
1. `~`が正しく展開されることを確認
2. 必要に応じて絶対パスを使用

## サーバーの更新

新しいバージョンに更新するには：

```bash
# ソースディレクトリに移動
cd /path/to/mcp-memory-server

# 最新の変更を取得
git pull

# 依存関係を再インストール
npm install

# リビルド
npm run build

# 更新されたファイルをコピー
cp -r dist ~/.claude/mcp-memory/
cp package.json ~/.claude/mcp-memory/
```

## アンインストール

### 自動アンインストール（macOS/Linux）

```bash
~/.claude/mcp-memory/uninstall.sh
```

### 手動アンインストール

1. Claude Desktopの設定からサーバー設定を削除
2. インストールディレクトリを削除：
   - macOS/Linux: `rm -rf ~/.claude/mcp-memory`
   - Windows: `rmdir /s "%USERPROFILE%\.claude\mcp-memory"`

## 次のステップ

- 使用手順については[クイックスタートガイド](QUICKSTART.ja.md)を読む
- 高度な設定については[設定ガイド](CONFIG.ja.md)を確認
- [セキュリティのベストプラクティス](SECURITY.ja.md)を確認
- [GitHub](https://github.com/your-username/mcp-memory-server/issues)で問題を報告