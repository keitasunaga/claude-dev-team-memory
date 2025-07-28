#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import readline from 'readline';

interface SpecInfo {
  name: string;
  path: string;
  hasRequirement: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
}

interface ExtractedData {
  featureTitle: string;
  overview: string;
  functionalReqs: string;
  priority: string;
  taskChecklist: string;
}

class SpecToIssue {
  private currentDir: string;
  private specsDir: string;
  private rl: readline.Interface;

  constructor() {
    this.currentDir = process.cwd();
    this.specsDir = path.join(this.currentDir, '.specs');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(specName?: string): Promise<void> {
    try {
      // 1. 仕様書の選択
      const selectedSpec = await this.selectSpec(specName);
      if (!selectedSpec) {
        console.error(chalk.red('❌ エラー: 仕様書の選択がキャンセルされました'));
        process.exit(1);
      }

      // 2. 仕様書の検証
      const specInfo = this.validateSpec(selectedSpec);

      // 3. 仕様書の内容を解析
      const extractedData = this.parseSpecification(specInfo);

      // 4. リポジトリ情報を取得
      const repoInfo = this.getRepositoryInfo();

      // 5. Issue本文を生成
      const issueBody = this.generateIssueBody(specInfo, extractedData, repoInfo);

      // 6. 確認画面を表示
      const confirmed = await this.confirmIssueCreation(extractedData.featureTitle, issueBody, repoInfo);
      if (!confirmed) {
        console.log(chalk.yellow('❌ キャンセルしました'));
        process.exit(0);
      }

      // 7. GitHub Issueを作成
      await this.createGitHubIssue(extractedData.featureTitle, issueBody, repoInfo);

    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  private async selectSpec(specName?: string): Promise<string> {
    if (specName) {
      return specName;
    }

    // .specsディレクトリの確認
    if (!fs.existsSync(this.specsDir)) {
      throw new Error('.specs ディレクトリが見つかりません');
    }

    // 利用可能な仕様書をリスト
    const specs = fs.readdirSync(this.specsDir)
      .filter(dir => fs.statSync(path.join(this.specsDir, dir)).isDirectory());

    if (specs.length === 0) {
      throw new Error('.specs ディレクトリに仕様書が見つかりません');
    }

    console.log(chalk.blue('📋 利用可能な仕様書一覧:\n'));
    console.log(chalk.cyan('現在のリポジトリ内の仕様書:'));
    specs.forEach((spec, index) => {
      console.log(`${index + 1}. ${spec}`);
    });

    const answer = await this.question('\n番号を選択してください: ');
    const selectedIndex = parseInt(answer) - 1;

    if (selectedIndex < 0 || selectedIndex >= specs.length) {
      throw new Error('無効な番号が選択されました');
    }

    return specs[selectedIndex];
  }

  private validateSpec(specName: string): SpecInfo {
    const specPath = path.join(this.specsDir, specName);
    
    if (!fs.existsSync(specPath)) {
      throw new Error(`仕様書 '${specName}' が見つかりません`);
    }

    const requirementPath = path.join(specPath, 'requirement.md');
    const designPath = path.join(specPath, 'design.md');
    const tasksPath = path.join(specPath, 'tasks.md');

    // requirement.mdは必須
    if (!fs.existsSync(requirementPath)) {
      throw new Error('requirement.md が見つかりません');
    }

    const hasDesign = fs.existsSync(designPath);
    const hasTasks = fs.existsSync(tasksPath);

    if (!hasTasks) {
      console.log(chalk.yellow('⚠️  警告: tasks.md が見つかりません。基本的なチェックリストを生成します'));
    }

    return {
      name: specName,
      path: specPath,
      hasRequirement: true,
      hasDesign,
      hasTasks
    };
  }

  private parseSpecification(specInfo: SpecInfo): ExtractedData {
    console.log(chalk.blue('📖 仕様書を解析中...'));

    const requirementPath = path.join(specInfo.path, 'requirement.md');
    const requirementContent = fs.readFileSync(requirementPath, 'utf-8');

    // タイトルの抽出
    const titleMatch = requirementContent.match(/^# (.+?)(?:\s*-\s*要件定義書)?$/m);
    const featureTitle = titleMatch ? titleMatch[1].trim() : '新機能';

    // 概要の抽出
    const overviewMatch = requirementContent.match(/## 概要\s*\n([\s\S]*?)(?=\n##|\n###|$)/);
    const overview = overviewMatch ? overviewMatch[1].trim() : '';

    // 機能要件の抽出
    const functionalReqsMatch = requirementContent.match(/### 機能要件\s*\n([\s\S]*?)(?=\n###|\n##|$)/);
    const functionalReqs = functionalReqsMatch ? functionalReqsMatch[1].trim() : '';

    // 優先度の抽出
    const priorityMatch = requirementContent.match(/## 優先度\s*\n([\s\S]*?)(?=\n##|\n###|$)/);
    const priorityText = priorityMatch ? priorityMatch[1].trim().split('\n')[0] : 'Medium';
    const priority = this.normalizePriority(priorityText);

    // タスクチェックリストの生成
    let taskChecklist = '';
    if (specInfo.hasTasks) {
      const tasksPath = path.join(specInfo.path, 'tasks.md');
      const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
      taskChecklist = this.parseTasksFile(tasksContent);
    } else {
      taskChecklist = this.generateDefaultChecklist();
    }

    return {
      featureTitle,
      overview,
      functionalReqs,
      priority,
      taskChecklist
    };
  }

  private parseTasksFile(tasksContent: string): string {
    const phases = tasksContent.match(/### Phase \d+:.+/g) || [];
    let checklist = '';

    phases.forEach(phase => {
      checklist += `\n${phase}`;
      
      // このフェーズのタスクを抽出（最大5個）
      const phaseRegex = new RegExp(`${phase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=\\n###|$)`);
      const phaseMatch = tasksContent.match(phaseRegex);
      
      if (phaseMatch) {
        const tasks = phaseMatch[1].match(/^- \[ \].+$/gm) || [];
        checklist += '\n' + tasks.slice(0, 5).join('\n');
      }
    });

    return checklist.trim();
  }

  private generateDefaultChecklist(): string {
    return `### Phase 1: 基盤実装
- [ ] 基本構造の実装
- [ ] データモデルの定義
- [ ] 基本的なAPI実装

### Phase 2: 機能実装
- [ ] 主要機能の実装
- [ ] エラー処理の実装
- [ ] バリデーションの実装

### Phase 3: テストと改善
- [ ] ユニットテストの作成
- [ ] 統合テストの作成
- [ ] パフォーマンス最適化`;
  }

  private normalizePriority(priority: string): string {
    const lowerPriority = priority.toLowerCase();
    if (lowerPriority.includes('high') || lowerPriority.includes('高')) return 'High';
    if (lowerPriority.includes('low') || lowerPriority.includes('低')) return 'Low';
    return 'Medium';
  }

  private getRepositoryInfo(): { name: string; techStack: string; labels: string } {
    const repoName = path.basename(this.currentDir).replace('vericerts-zero-', '');

    switch (repoName) {
      case 'web-app':
      case 'admin-dashboard':
        return {
          name: repoName,
          techStack: `- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- pnpm`,
          labels: 'frontend,feature'
        };
      
      case 'did-vc-engine':
      case 'messaging-hub':
        return {
          name: repoName,
          techStack: `- NestJS
- PostgreSQL with Prisma
- TypeScript
- Docker`,
          labels: 'backend,feature'
        };
      
      case 'smart-contracts':
        return {
          name: repoName,
          techStack: `- Solidity
- Hardhat
- TypeScript
- Ethereum`,
          labels: 'blockchain,feature'
        };
      
      default:
        return {
          name: repoName,
          techStack: '- プロジェクト標準の技術スタック',
          labels: 'feature'
        };
    }
  }

  private generateIssueBody(
    specInfo: SpecInfo,
    extractedData: ExtractedData,
    repoInfo: { techStack: string }
  ): string {
    const { overview, functionalReqs, priority, taskChecklist } = extractedData;

    let issueBody = `## 概要

**⚠️ 重要: 実装を開始する前に、必ず以下の仕様書を熟読してください。**

${overview}

## 仕様書
\`.specs/${specInfo.name}/\` ディレクトリ参照
- [要件定義](.specs/${specInfo.name}/requirement.md)`;

    if (specInfo.hasDesign) {
      issueBody += `\n- [設計書](.specs/${specInfo.name}/design.md)`;
    }

    if (specInfo.hasTasks) {
      issueBody += `\n- [タスクリスト](.specs/${specInfo.name}/tasks.md)`;
    }

    issueBody += `

## 主な機能
${functionalReqs}

## 実装チェックリスト
${taskChecklist}

## 技術スタック
${repoInfo.techStack}

## 完了条件
- [ ] すべての必須機能が実装されている
- [ ] ユニットテストが作成されている（カバレッジ80%以上）
- [ ] E2Eテストが作成されている
- [ ] ドキュメントが更新されている
- [ ] コードレビューが完了している
- [ ] developブランチにマージされている

## 優先度
${priority}

## 注意事項
- 仕様書の内容を必ず確認してから実装を開始してください
- 不明な点は仕様書を更新してから実装を進めてください
- 実装中に仕様変更が必要な場合は、仕様書も合わせて更新してください`;

    return issueBody;
  }

  private async confirmIssueCreation(
    featureTitle: string,
    issueBody: string,
    repoInfo: { name: string; labels: string }
  ): Promise<boolean> {
    console.log('\n' + chalk.cyan('━'.repeat(50)));
    console.log(chalk.blue('📋 Issue作成内容の確認'));
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(`タイトル: [Feature] ${featureTitle}`);
    console.log(`リポジトリ: ${repoInfo.name}`);
    console.log(`ラベル: ${repoInfo.labels}`);
    console.log(`\n本文プレビュー:`);
    console.log(chalk.gray('-'.repeat(40)));
    
    // 最初の20行を表示
    const lines = issueBody.split('\n');
    console.log(lines.slice(0, 20).join('\n'));
    if (lines.length > 20) {
      console.log(chalk.gray('... (省略)'));
    }
    
    console.log(chalk.cyan('━'.repeat(50)));

    const answer = await this.question('\nこの内容でIssueを作成しますか？ (y/n): ');
    return answer.toLowerCase() === 'y';
  }

  private async createGitHubIssue(
    featureTitle: string,
    issueBody: string,
    repoInfo: { labels: string }
  ): Promise<void> {
    console.log(chalk.blue('🚀 GitHub Issueを作成中...'));

    // 一時ファイルに本文を保存
    const tempFile = path.join('/tmp', `issue_body_${Date.now()}.md`);
    fs.writeFileSync(tempFile, issueBody);

    try {
      // GitHub CLIでIssue作成
      const command = `gh issue create --title "[Feature] ${featureTitle}" --body-file "${tempFile}" --label "${repoInfo.labels}" --assignee "sunagakeita"`;
      const output = execSync(command, { encoding: 'utf-8' }).trim();
      
      console.log(chalk.green(`✅ Issueを作成しました: ${output}`));

      // プロジェクトへの紐付け
      const addToProject = await this.question('\nVeriCerts Zero Project に紐付けますか？ (y/n): ');
      
      if (addToProject.toLowerCase() === 'y') {
        try {
          execSync(`gh project item-add 7 --owner NonEntropyJapan --url "${output}" --field "Status=Todo"`, { encoding: 'utf-8' });
          console.log(chalk.green('✅ プロジェクトに追加しました'));
        } catch (error) {
          console.log(chalk.yellow('⚠️  プロジェクトへの追加に失敗しました。手動で追加してください。'));
        }
      }

      // 後片付け
      fs.unlinkSync(tempFile);

      // 次のステップの案内
      console.log('\n' + chalk.green('🎉 Issue作成が完了しました！'));
      console.log(`\n📝 作成されたIssue: ${output}`);
      console.log('\n🚀 次のステップ:');
      console.log('1. Issueの内容を確認し、必要に応じて詳細を追加');
      console.log('2. 実装準備ができたら /dev-team で開発を開始');
      console.log('3. 実装中は仕様書と Issue の両方を参照');
      console.log('\n💡 ヒント:');
      console.log('- 仕様変更が必要な場合は、仕様書も更新してください');
      console.log('- 実装完了後は Issue のチェックリストを更新してください');

    } catch (error) {
      // 一時ファイルのクリーンアップ
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw new Error(`Issue作成に失敗しました: ${error.message}`);
    }
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }
}

// メイン実行
async function main() {
  const specName = process.argv[2];
  const specToIssue = new SpecToIssue();
  await specToIssue.run(specName);
}

main().catch(error => {
  console.error(chalk.red('❌ 予期しないエラー:'), error);
  process.exit(1);
});