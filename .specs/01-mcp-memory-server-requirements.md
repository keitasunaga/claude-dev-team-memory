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

#### 4.2.1 TypeScript インターフェース
```typescript
interface GlobalMemory {
  user_preferences: {
    language: string;              // "日本語で回答"
    commit_style: string;          // "日本語でコミットメッセージ"
    package_manager: string;       // "pnpm優先"
    container: string;             // "Docker Compose使用"
    test_coverage: string;         // "80%以上"
  };
  development_style: {
    branch_strategy: string;       // "Git Flow (develop → feature)"
    pr_target: string;             // "必ずdevelopブランチへ"
    testing: string;               // "Jest + Playwright"
    linting: string;               // "ESLint + Prettier"
  };
  communication_style: {
    response: string;              // "簡潔に、要点を明確に"
    explanation: string;           // "なぜそうするか理由も説明"
    error_handling: string;        // "エラーは原因と解決策をセットで"
  };
}

interface ProjectMemory {
  path: string;
  current_issue: {
    number: number;
    title: string;
    requirements: string[];
    design_decisions: string[];
  };
  tasks: {
    completed: string[];
    in_progress: string;
    pending: string[];
  };
  checkpoint: {
    timestamp: string;
    branch: string;
    last_command: string;
    next_action: string;
  };
}

interface DevTeamMemory {
  // Issue関連の永続情報
  issue: {
    context: IssueContext;
    requirements: string[];
    design: DesignDecision[];
    tasks: TaskList;
  };
  
  // 作業状態のスナップショット
  session: {
    currentTask: string;
    branch: string;
    modifiedFiles: string[];
    lastCheckpoint: Date;
  };
  
  // 自動保存トリガー
  autoSave: {
    onTaskComplete: boolean;
    onTestPass: boolean;
    interval: number;  // 分単位
  };
}
```

#### 4.2.2 JSON構造例

**グローバルメモリ例**
```json
{
  "user_preferences": {
    "language": "日本語で回答",
    "commit_style": "日本語でコミットメッセージ",
    "package_manager": "pnpm優先",
    "container": "Docker Compose使用",
    "test_coverage": "80%以上"
  },
  "development_style": {
    "branch_strategy": "Git Flow (develop → feature)",
    "pr_target": "必ずdevelopブランチへ",
    "testing": "Jest + Playwright",
    "linting": "ESLint + Prettier"
  },
  "communication_style": {
    "response": "簡潔に、要点を明確に",
    "explanation": "なぜそうするか理由も説明",
    "error_handling": "エラーは原因と解決策をセットで"
  }
}
```

**プロジェクトメモリ例**
```json
{
  "current_issue": {
    "number": 42,
    "title": "ユーザー認証機能の実装",
    "requirements": [
      "JWT + Refresh Token",
      "Redisセッション管理",
      "2FA対応"
    ],
    "design_decisions": [
      "認証ミドルウェアはNestJS Guards使用",
      "トークン有効期限: Access 15分, Refresh 7日"
    ]
  },
  "tasks": {
    "completed": [
      "✓ 認証エンドポイント実装",
      "✓ JWT生成・検証ロジック",
      "✓ ユニットテスト作成"
    ],
    "in_progress": "Redisセッション実装",
    "pending": [
      "E2Eテスト作成",
      "ドキュメント更新",
      "PR作成"
    ]
  },
  "checkpoint": {
    "timestamp": "2025-01-28T16:00:00Z",
    "branch": "feature/issue-42-auth",
    "last_command": "pnpm test:unit",
    "next_action": "Redisクライアント設定"
  }
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

## 8. 参考実装

実装時は以下の既存のMCPメモリサーバー実装を参考にすること：

### 8.1 公式実装
- **@modelcontextprotocol/server-memory**
  - https://github.com/modelcontextprotocol/servers/tree/main/src/memory
  - ナレッジグラフベースの基本実装
  - エンティティ、リレーション、観察の3層構造

### 8.2 コミュニティ実装

#### 高機能実装
- **mcp-memory-service**
  - https://github.com/doobidoo/mcp-memory-service
  - ChromaDB/SQLite-vec対応
  - セマンティック検索機能

#### プロジェクト管理向け
- **memory-bank-mcp**
  - https://github.com/alioshr/memory-bank-mcp
  - Markdownファイルベース
  - 5ファイル構造での管理

#### AI統合
- **mcp-mem0**
  - https://github.com/coleam00/mcp-mem0
  - Mem0.ai統合
  - PostgreSQL + pgvector

#### その他の参考実装
- **claude-memory-mcp**
  - https://github.com/WhenMoon-afk/claude-memory-mcp
  - 最適なLLMメモリ技術の研究に基づく実装

- **mcp-chromadb-memory**
  - https://github.com/stevenjjobson/mcp-chromadb-memory
  - ChromaDBを使用したスマートメモリ管理

### 8.3 実装時の注意点

1. **既存実装の分析**
   - 各実装のアーキテクチャを理解
   - 長所と短所を把握
   - 本プロジェクトに適した部分を選択的に採用

2. **ライセンス確認**
   - 各プロジェクトのライセンスを確認
   - コードの流用時は適切なクレジット表記

3. **ベストプラクティスの採用**
   - 複数の実装から共通するパターンを抽出
   - 本プロジェクトの要件に合わせてカスタマイズ