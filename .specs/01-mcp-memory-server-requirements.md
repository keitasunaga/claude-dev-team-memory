# MCPメモリサーバー要件定義

## 1. 背景と目的

### 1.1 問題定義
- Claude Codeは長時間の開発セッション中にメモリ（コンテキスト）を失う
- /compactコマンドやauto-compact機能により、作業履歴や重要な決定事項が失われる
- 毎回同じ情報を再入力する必要があり、開発効率が低下

### 1.2 解決方針
- Model Context Protocol (MCP)を使用した永続的なメモリ管理システムの構築
- ユーザーレベルとプロジェクトレベルの2層メモリ構造
- 自動保存と手動保存の組み合わせによる柔軟な運用

## 2. 機能要件

### 2.1 グローバルメモリ（ユーザーレベル）

#### 2.1.1 開発環境設定
- パッケージマネージャーの優先順位（例：pnpm > npm）
- コンテナ使用設定（Docker Compose優先）
- テストカバレッジ基準（80%以上）

#### 2.1.2 コミュニケーション設定
- 応答言語（日本語優先）
- コミットメッセージ言語（日本語）
- 説明の詳細度（簡潔・詳細）

#### 2.1.3 開発パターン
- ブランチ戦略（Git Flow）
- PRターゲット（developブランチ）
- コーディングスタイル

### 2.2 プロジェクトメモリ（dev-team用）

#### 2.2.1 Issue管理
- Issue番号と概要
- 要件定義（requirements）
- 設計決定（design decisions）
- タスクリストと進捗状況

#### 2.2.2 作業状態管理
- 現在のブランチ
- 作業中のタスク
- 完了したタスク
- 次のアクション

#### 2.2.3 チェックポイント機能
- 定期的な自動保存（30分間隔）
- タスク完了時の自動保存
- 手動チェックポイント作成

### 2.3 メモリ操作API

#### 2.3.1 保存操作
- `save_global_preference(key, value)` - グローバル設定保存
- `save_project_memory(project_path, category, data)` - プロジェクト情報保存
- `create_checkpoint(project_path, name)` - チェックポイント作成

#### 2.3.2 取得操作
- `get_global_preferences()` - 全グローバル設定取得
- `get_project_state(project_path)` - プロジェクト状態取得
- `restore_from_checkpoint(project_path, name)` - チェックポイントから復元

#### 2.3.3 管理操作
- `list_projects()` - 記憶しているプロジェクト一覧
- `clear_project_memory(project_path)` - プロジェクトメモリクリア
- `export_memory(format)` - メモリのエクスポート

## 3. 非機能要件

### 3.1 パフォーマンス
- 起動時間: 3秒以内
- メモリ操作レスポンス: 100ms以内
- データベースサイズ: プロジェクトあたり最大10MB

### 3.2 信頼性
- データの永続性保証
- 異常終了時のデータ保護
- バックアップ機能（日次）

### 3.3 セキュリティ
- ローカルストレージのみ使用
- 機密情報の暗号化オプション
- アクセス権限の適切な設定

### 3.4 互換性
- Claude Desktop対応
- VS Code MCP拡張対応
- 将来的なクラウド同期対応準備

## 4. 技術仕様

### 4.1 アーキテクチャ
- MCPサーバー（TypeScript実装）
- SQLiteデータベース（ローカルストレージ）
- JSON/YAMLエクスポート形式

### 4.2 データ構造
```typescript
interface GlobalMemory {
  preferences: Map<string, any>;
  patterns: string[];
  shortcuts: Map<string, string>;
}

interface ProjectMemory {
  path: string;
  issue: IssueContext;
  tasks: TaskList;
  checkpoints: Checkpoint[];
  lastModified: Date;
}

interface Checkpoint {
  id: string;
  name: string;
  timestamp: Date;
  state: ProjectState;
}
```

### 4.3 ファイル構成
```
~/.claude/mcp-memory/
├── global.db          # グローバル設定
├── projects/          # プロジェクト別DB
│   └── {project-hash}.db
├── backups/           # バックアップ
└── logs/              # 動作ログ
```

## 5. 実装優先順位

### Phase 1（MVP）
1. 基本的なメモリ保存・取得機能
2. グローバル設定管理
3. プロジェクト状態管理
4. 手動チェックポイント

### Phase 2（拡張）
1. 自動保存機能
2. バックアップ・リストア
3. メモリ検索機能
4. 統計・分析機能

### Phase 3（最適化）
1. パフォーマンス改善
2. クラウド同期準備
3. 他のMCPサーバーとの連携
4. AIによる自動学習機能

## 6. 成功基準

### 6.1 定量的指標
- コンテキスト復元成功率: 95%以上
- メモリ操作の応答時間: 100ms以内
- ユーザー満足度: 4.5/5以上

### 6.2 定性的指標
- /compact後も作業を継続できる
- 繰り返し入力が不要になる
- 開発効率の向上を実感できる

## 7. リスクと対策

### 7.1 技術的リスク
- **リスク**: MCPプロトコルの仕様変更
- **対策**: 抽象化レイヤーの実装

### 7.2 運用リスク
- **リスク**: メモリデータの肥大化
- **対策**: 定期的なクリーンアップ機能

### 7.3 セキュリティリスク
- **リスク**: 機密情報の漏洩
- **対策**: ローカルストレージ限定、暗号化オプション