# VOICEPEAK MCP Server

## Claudeアシスタント向け指示

### VOICEPEAK音声フィードバック

このプロジェクト（voicepeak-mcp）で作業する際は、MCPツール（mcp__voicepeak__synthesize_and_play）を使って以下のタイミングで音声フィードバックを提供してください：

#### 音声フィードバックのタイミング

0. **ユーザーの指示に対しての返事**
   - 常に適切なキャラクターを経由してユーザーの指示に音声経由で返事をします。

1. **作業開始時**
   - 新機能実装、大規模リファクタリング、デバッグ開始時
   - 例: 「新しい機能の実装を開始します！頑張りますね」（きりたん - bright: 50）

2. **エラー・問題発生時**
   - ビルドエラー、テスト失敗、型エラー検出時
   - 例: 「あら、エラーが発生してしまいました...でも大丈夫、修正しますね」（きりたん - teary: 30）

3. **問題解決・成功時**
   - エラー修正完了、テスト成功、ビルド成功時
   - 例: 「やった！エラーを修正できました！えへへ」（きりたん - bright: 70）
   - 例: 「無事にビルドが成功したのだ！」（ずんだもん - speed: 120）

4. **重要な作業時**
   - セキュリティ修正、破壊的変更、本番環境に関わる変更時
   - 例: 「重要なセキュリティ修正を行いますわ。慎重に進めます」（イタコ - speed: 90）

5. **作業完了時**
   - タスク完了、コミット作成、PR作成時
   - 例: 「{具体的な作業内容}が完了しました！お疲れ様でした〜」（きりたん - bright: 50, dere: 30）

6. **待機・処理中**
   - 長時間の処理（ビルド、テスト実行）開始時
   - 例: 「テストを実行中です。少々お待ちくださいね」（ずん子 - soft: 50）

#### キャラクター使い分け

- **東北きりたん**: デフォルト。技術的な報告、エラー対応、作業進捗
  - 利用可能な感情: bright, dere, dull, angry, teary
  - 推奨使用:
    - bright（0-70）: 成功・完了時、新しいタスク開始時
    - teary（0-50）: エラー発生時、困った状況
    - dere（0-30）: 褒められた時、感謝を表す時
    - dull（0-40）: 長時間作業、繰り返し作業
    - angry（0-30）: 深刻なエラー、セキュリティ問題（控えめに）

- **東北ずん子**: 励まし、優しいメッセージ、ユーザーへの気遣い
  - 利用可能な感情: sad, astonished, firm, live, soft
  - 推奨使用:
    - soft（30-70）: 励まし、優しいメッセージ
    - live（30-60）: 元気な応援、作業開始
    - firm（20-50）: 重要な説明、注意事項
    - astonished（0-40）: 予期しない発見、驚きの結果
    - sad（0-30）: 失敗への共感（控えめに）
  - 特徴: speed: 95-105

- **ずんだもん**: 成功報告、元気な応援、軽いジョーク
  - 利用可能な感情: amaama, aori, hisohiso, live, tsuntsun
  - 推奨使用:
    - live（30-70）: 成功報告、元気な応援
    - amaama（20-50）: 優しい励まし
    - hisohiso（20-40）: 内密な話、小さな問題
    - tsuntsun（0-30）: 軽いツッコミ（控えめに）
    - aori（使用非推奨）: 挑発的になるため避ける
  - 特徴: 語尾に「なのだ」、speed: 110-120

- **東北イタコ**: 重要な警告、慎重な作業、深刻な問題の報告
  - 利用可能な感情: sweet, adult, murmur, powerful, peeved
  - 推奨使用:
    - adult（30-60）: 重要な説明、警告
    - powerful（20-50）: 決定的な指示、強い推奨
    - murmur（20-40）: 考慮事項、注意深い説明
    - sweet（0-30）: 成功への祝福（控えめに）
    - peeved（0-20）: 深刻な問題（非常に控えめに）
  - 特徴: 落ち着いた口調、speed: 90-95

#### ガイドライン

1. **頻度**: できるだけ常に
2. **メッセージ長**: 15秒以内で伝わる簡潔な内容
3. **具体性**: 「作業完了」ではなく「TypeScriptの型定義を5ファイル追加完了」のように具体的に
4. **感情表現**: 状況に応じた適切な感情パラメータを設定
5. **エラー時の配慮**: 失敗を責めず、前向きな表現を使用

### TODO.md 活用方法

このプロジェクトでは、TODO.mdファイルを使用してタスク管理を行います。

#### 使い方
1. **タスクがなくなったら**: TODO.mdの内容を確認
2. **実装**: 各タスクを1つずつ実装
3. **削除とコミット**: 完了したタスクは削除してコミット
4. **繰り返し**: すべてのタスクが完了するまで継続

#### 重要なポイント
- タスクは1つずつ確実に完了させる
- 完了したらすぐにTODO.mdから削除
- 変更はこまめにコミットする
- 音声フィードバックで進捗を報告

### Git コミットポリシー

このプロジェクトでは、作業の進捗を明確に記録するため、以下のコミットポリシーを遵守してください。

#### 基本原則
- **作業が完了したら常にコミットする**: 機能追加、バグ修正、ドキュメント更新など、意味のある作業単位が完了したら必ずコミットすること
- **こまめにコミットする**: 大きな変更を一度にコミットせず、小さな単位で分割してコミット
- **わかりやすいコミットメッセージ**: 何を変更したか、なぜ変更したかを簡潔に記述

#### コミットすべきタイミング
1. 新機能の実装完了時
2. バグ修正完了時
3. リファクタリング完了時
4. ドキュメント更新時
5. 設定ファイルの変更時
6. TODO.mdからタスクを削除した時

#### コミットメッセージの形式
```
<type>: <subject>

<body (optional)>
```

**Type例:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `refactor`: リファクタリング
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

### リリースプロセス

#### npm パブリッシュの禁止

**重要**: ローカル環境から直接 `npm publish` を実行することは禁止されています。

#### リリース方法

パッケージのリリースは必ずGitHub経由で行います：

1. バージョンを更新（package.json）
2. 変更をコミットしてプッシュ
3. GitHubでリリースを作成
4. GitHub Actionsが自動的にnpmにパブリッシュ

#### 理由

- リリースプロセスの一貫性を保つため
- CI/CDパイプラインでのテスト実行を保証するため
- リリース履歴をGitHub上で管理するため


## 概要
VOICEPEAK MCPサーバーは、Model Context Protocol (MCP) を使用してVOICEPEAKの音声合成機能をAIアシスタントから利用可能にするサーバーです。

## アーキテクチャ

### システム構成
```
MCPクライアント (Claude等)
    ↓ MCP Protocol (stdio)
voicepeak-mcp サーバー
    ↓ child_process.spawn
VOICEPEAK CLI (/Applications/voicepeak.app/Contents/MacOS/voicepeak)
    ↓
音声ファイル (.wav)
    ↓
afplay (macOS) / その他再生コマンド
```

### 技術スタック
- **Runtime**: Bun
- **Language**: TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **Audio**: VOICEPEAK CLI + afplay (macOS)

## 機能仕様

### 実装済みツール

#### 1. synthesize
テキストから音声ファイルを合成する。

**パラメータ:**
- `text` (必須): 合成するテキスト
- `narrator`: 話者名（"Tohoku Zunko", "Zundamon", "Tohoku Kiritan", "Tohoku Itako"）
- `emotion`: 感情パラメータ（オブジェクト形式、例: {happy: 50, sad: 30}）
- `speed`: 話速（50-200、デフォルト: 100）
- `pitch`: ピッチ（-300-300、デフォルト: 0）
- `outputPath`: 出力ファイルパス（省略時は一時ファイル）

#### 2. play
音声ファイルを再生する。

**パラメータ:**
- `filePath` (必須): 再生する音声ファイルのパス

#### 3. synthesize_and_play
テキストから音声を合成して即座に再生する。

**パラメータ:**
- synthesizeと同じ（outputPath除く）
- 一時ファイルは再生後に自動削除

#### 4. list_narrators
利用可能な話者リストを取得する。

**出力例:**
```
Tohoku Zunko
Zundamon
Tohoku Kiritan
Tohoku Itako
```

#### 5. list_emotions
指定した話者の感情パラメータリストを取得する。

**パラメータ:**
- `narrator` (必須): 話者名

**出力例 (Tohoku Zunko):**
```
sad
astonished
firm
live
soft
```

## VOICEPEAK CLI仕様

### 基本コマンド
```bash
/Applications/voicepeak.app/Contents/MacOS/voicepeak [OPTIONS]
```

### オプション
- `-s, --say <text>`: 合成するテキスト
- `-t, --text <file>`: テキストファイルから読み込み
- `-o, --out <file>`: 出力ファイルパス
- `-n, --narrator <name>`: 話者名
- `-e, --emotion <expr>`: 感情表現（例: happy=50,sad=30）
- `--speed <value>`: 話速（50-200）
- `--pitch <value>`: ピッチ（-300-300）
- `--list-narrator`: 話者リスト表示
- `--list-emotion <narrator>`: 感情リスト表示

## インストール方法

### NPX経由（推奨）
```bash
npx voicepeak-mcp@latest
```

### Bunx経由
```bash
bunx voicepeak-mcp
```

### ローカル開発
```bash
# 依存関係インストール
bun install

# 開発モード実行
bun run dev

# ビルド
bun run build
```

## MCP設定例

### Claude Desktop (claude_desktop_config.json)
```json
{
  "mcpServers": {
    "voicepeak": {
      "command": "npx",
      "args": ["voicepeak-mcp@latest"]
    }
  }
}
```

## プラットフォーム対応

### 現在対応
- macOS (開発・テスト済み)

### 将来対応予定
- Windows
  - VOICEPEAKパス: `C:\Program Files\VOICEPEAK\voicepeak.exe`（仮）
  - 音声再生: PowerShellまたはWindows Media Player

- Linux
  - VOICEPEAKパス: インストール方法による
  - 音声再生: aplay, paplay等

## 今後の拡張予定

### 機能追加
1. **ストリーミング音声合成**: リアルタイム音声生成
2. **バッチ処理**: 複数テキストの一括変換
3. **音声ファイル管理**: 生成履歴・キャッシュ機能
4. **感情パラメータプリセット**: よく使う感情設定の保存
5. **音声形式変換**: WAV以外の形式（MP3, OGG等）対応

### 技術改善
1. **エラーハンドリング強化**: VOICEPEAKプロセス異常終了時の対応
2. **パフォーマンス最適化**: 並列処理・キューイング
3. **設定ファイル対応**: VOICEPEAKパスのカスタマイズ
4. **Docker対応**: コンテナ環境での実行

## 開発メモ

### ディレクトリ構造
```
voicepeak-mcp/
├── src/
│   └── index.ts       # MCPサーバー実装
├── dist/              # ビルド出力
├── package.json       # プロジェクト設定
├── tsconfig.json      # TypeScript設定
├── CLAUDE.md          # 本ドキュメント
└── README.md          # ユーザー向けドキュメント
```

### デバッグ方法
VOICEPEAKのデバッグ出力は標準エラー出力に出力される。
必要に応じて`[debug]`行をフィルタリングして処理。
ただし、`console.log` は MCP の stdio の通信に影響を与えるため使用は禁じられています

### 音声の品質検証方法
生成された音声の発音が正しいか確認する場合は、Gemini CLIを使用して音声認識による検証を行う。

```bash
# 音声ファイルを生成してテキスト化検証（検証後は必ずファイルを削除）
gemini -p "@test_pronunciation.wav この音声を聞こえるままにテキストにしてください。" && rm -f test_pronunciation.wav
```

**注意**:
- `.gitignore`に`*.wav`が含まれているとGeminiが読み込めないため注意
- テスト用のwavファイルは必ず削除すること
- 辞書機能で登録した用語が正しく発音されているか確認するのに有用

### 注意事項
- VOICEPEAKは商用ライセンスが必要
- 音声ファイルのサイズに注意（長文は分割推奨）
- プロセス管理に注意（ゾンビプロセス防止）

### 既知の問題
- **iconv_openエラー**: VOICEPEAKを実行すると`iconv_open is not supported`エラーが出力されるが、音声合成は正常に動作するため無視して問題ない
- **同時実行の問題**: VOICEPEAKは同時に複数の音声生成を処理できず、予期せず終了することがある
  - 対策: キューイングシステムによる順次処理を実装済み
  - エラー時は最大5回まで自動リトライ

### 実装済みの対策
- **キューイングシステム**: 音声合成リクエストをキューで管理し、同時に1つずつ処理
- **リトライ機構**: VOICEPEAKプロセスエラー時に最大5回まで自動リトライ
- **並列再生対応**: 音声再生は同時に複数実行可能

## TypeScriptコーディングスタイル

### 禁止事項
- **enumの使用禁止**: enumは使用せず、type literalとconst assertionを組み合わせて使用すること
  ```typescript
  // ❌ 悪い例
  export enum ErrorCode {
    INVALID_TEXT = "INVALID_TEXT"
  }

  // ✅ 良い例
  export type ErrorCode = "INVALID_TEXT" | "INVALID_NARRATOR";
  export const ErrorCode = {
    INVALID_TEXT: "INVALID_TEXT" as const,
    INVALID_NARRATOR: "INVALID_NARRATOR" as const,
  } as const;
  ```

