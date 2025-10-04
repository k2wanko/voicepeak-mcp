# voicepeak-mcp

[English](./README.en.md)

VOICEPEAK テキスト読み上げ機能のための MCP サーバー。

## 前提条件

- VOICEPEAK がインストールされていること

## インストール

### NPX を使用（推奨）
```bash
npx voicepeak-mcp@latest
```

### Bunx を使用
```bash
bunx voicepeak-mcp
```

## 設定

Claude Desktop の設定に追加：

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

## 利用可能なツール

### synthesize
テキストから音声ファイルを生成します（最大140文字）。

パラメータ:
- `text`（必須）: 合成するテキスト
- `narrator`: ナレーター名
- `emotion`: 感情パラメータ
- `speed`: 話速（50-200）
- `pitch`: ピッチ（-300〜300）
- `outputPath`: 出力ファイルパス

### synthesize_and_play
音声を生成して即座に再生します（最大140文字）。

### play
音声ファイルを再生します。

### list_narrators
利用可能なナレーターをリストします。

### list_emotions
ナレーターの利用可能な感情をリストします。

### dictionary_list
全ての発音辞書エントリをリストします。

### dictionary_add
カスタム発音のための辞書エントリを追加または更新します。

パラメータ:
- `surface`（必須）: 置き換えるテキスト
- `pronunciation`（必須）: 日本語かなでの発音
- `priority`: 優先度（0-10、デフォルト: 5）

### dictionary_remove
辞書エントリを削除します。

### dictionary_find
テキストで辞書エントリを検索します。

### dictionary_clear
全ての辞書エントリをクリアします。

## 対応プラットフォーム

- ✅ macOS
- 🚧 Windows（予定）
- 🚧 Linux（予定）

## 貢献

イシューやプルリクエストを歓迎します！
